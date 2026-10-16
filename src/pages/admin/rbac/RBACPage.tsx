import AppSearchInput from '@/components/common/AppSearchInput';
import { useAuth } from '@hooks/useAuth';
import { getApiErrorMessage } from '@/utils/apiError';
import { useIsMobile } from '@hooks/useIsMobile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Checkbox,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCircle,
  FaKey,
  FaShieldAlt,
  FaTrash,
  FaUserShield,
  FaUsers
} from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import { FiEdit3, FiPlus, FiSave } from 'react-icons/fi';
import type { IconType } from 'react-icons';

import {
  AdminUser,
  createAdminUser,
  CreateAdminUserPayload,
  createPermission,
  createSidebarItem,
  deleteAdminUser,
  deletePermission,
  deleteSidebarItem,
  fetchAdminUsers,
  fetchPermissions,
  fetchRBACData,
  fetchUserPermissions,
  PermissionPayload,
  saveRBACData,
  saveUserPermissions,
  SaveUserPermissionsPayload,
  SidebarItemPayload,
  updatePermission,
  updateSidebarItem
} from '@services/RBACService';
import { authCheck } from '@services/AuthService';
import { isAllowRole } from '@utils/authUtil';
import { Permission } from '@/types/permissionType';
import { SidebarItem } from '@/types/menuItem';
import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { customTableProps } from '@components/custom/TableProps.custom';

const { Text } = Typography;

// ─── Shared Helpers: FA class → react-icons ──────────────────────────────────

const mapFaClassToIconType = (faClass?: string): IconType | null => {
  if (!faClass) return null;
  const parts = faClass.split(/\s+/).filter(Boolean);
  const raw = parts.find(
    (p) =>
      p.startsWith('fa-') &&
      !/^fa[brlsd]?$/i.test(p) &&
      ![
        'fa-solid',
        'fa-regular',
        'fa-light',
        'fa-thin',
        'fa-duotone',
        'fa-brands'
      ].includes(p.toLowerCase())
  );
  if (!raw) return null;
  const base = raw.replace(/^fa-/, '');
  const toPascal = (s: string) =>
    s
      .split('-')
      .map((t) => (t ? t[0].toUpperCase() + t.slice(1) : ''))
      .join('');
  const candidates: string[] = ['Fa' + toPascal(base)];
  const rules: Array<(s: string) => string | null> = [
    (s) => s.replace('trash-can', 'trash'),
    (s) => s.replace('user-group', 'users'),
    (s) => s.replace('arrows-rotate', 'sync'),
    (s) => s.replace('right-left', 'exchange-alt'),
    (s) => s.replace('circle-check', 'check-circle'),
    (s) => s.replace('circle-xmark', 'times-circle'),
    (s) => s.replace('circle-info', 'info-circle'),
    (s) => (s.includes('sheet-plastic') ? 'file-invoice' : s),
    (s) => s.replace('file-lines', 'file-alt'),
    (s) => s.replace('calendar-days', 'calendar-alt'),
    (s) => s.replace('arrow-rotate-right', 'redo'),
    (s) => s.replace('arrow-rotate-left', 'undo')
  ];
  rules.forEach((transform) => {
    const t = transform(base);
    if (t && t !== base) candidates.push('Fa' + toPascal(t));
  });
  if (/-alt$/.test(base))
    candidates.push('Fa' + toPascal(base.replace(/-alt$/, '')));
  if (/-o$/.test(base))
    candidates.push('Fa' + toPascal(base.replace(/-o$/, '')));
  ['-solid', '-regular', '-light', '-thin', '-duotone'].forEach((suf) => {
    if (base.endsWith(suf))
      candidates.push('Fa' + toPascal(base.replace(suf, '')));
  });
  for (const name of candidates) {
    const IconComp = (FaIcons as Record<string, IconType>)[name];
    if (IconComp) return IconComp;
  }
  return null;
};

const renderIconPreview = (iconClass?: string | IconType) => {
  if (!iconClass) return <FaCircle className="text-gray-300" />;
  if (typeof iconClass !== 'string') {
    const IconComp = iconClass as IconType;
    return <IconComp className="text-lg text-blue-600" />;
  }
  const Mapped = mapFaClassToIconType(iconClass);
  if (Mapped) return <Mapped className="text-lg text-blue-600" />;
  return (
    <i
      className={`${iconClass} text-lg text-orange-500`}
      title="FA class (không map được react-icons)"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 1: Phân quyền theo Role — Layout 2 cột
// ─────────────────────────────────────────────────────────────────────────────

function RolePermissionManager() {
  const queryClient = useQueryClient();
  const { data: rbacData, isLoading } = useQuery({
    queryKey: ['rbac-data'],
    queryFn: () => fetchRBACData()
  });

  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set()
  );
  const [checkedPermIds, setCheckedPermIds] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const roles = useMemo(
    () => (Array.isArray(rbacData?.roles) ? rbacData.roles : []),
    [rbacData]
  );
  const allPermissions = useMemo(
    () => (Array.isArray(rbacData?.permissions) ? rbacData.permissions : []),
    [rbacData]
  );
  const rolePermissions = useMemo(
    () => rbacData?.role_permissions ?? {},
    [rbacData]
  );

  const [partialPermIds, setPartialPermIds] = useState<Set<number>>(new Set());

  // When selected roles change, compute union + partial state
  useEffect(() => {
    if (selectedRoleIds.size === 0 || !rolePermissions) {
      setCheckedPermIds(new Set());
      setPartialPermIds(new Set());
      setIsDirty(false);
      return;
    }
    const ids = Array.from(selectedRoleIds);
    if (ids.length === 1) {
      // Single role: load its permissions directly
      const permIds = rolePermissions[ids[0]] ?? [];
      setCheckedPermIds(new Set(Array.isArray(permIds) ? permIds : []));
      setPartialPermIds(new Set());
    } else {
      // Multiple roles: union (all perms ANY role has) + track partial
      const sets = ids.map((id) => new Set(rolePermissions[id] ?? []));
      const union = new Set<number>();
      const partial = new Set<number>();
      // Collect all perm IDs across all selected roles
      for (const s of sets) {
        for (const permId of s) union.add(permId);
      }
      // Check which are partial (not ALL roles have them)
      for (const permId of union) {
        const allHave = sets.every((s) => s.has(permId));
        if (!allHave) partial.add(permId);
      }
      setCheckedPermIds(union);
      setPartialPermIds(partial);
    }
    setIsDirty(false);
  }, [selectedRoleIds, rolePermissions]);

  // Auto-select first role on load
  useEffect(() => {
    if (roles.length > 0 && selectedRoleIds.size === 0)
      setSelectedRoleIds(new Set([String(roles[0].id)]));
  }, [roles, selectedRoleIds.size]);

  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      saveRBACData({
        role_ids: Array.from(selectedRoleIds).map(Number),
        permissions: Array.from(checkedPermIds)
      }),
    onSuccess: () => {
      const count = selectedRoleIds.size;
      message.success(`Đã lưu phân quyền cho ${count} vai trò!`);
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['rbac-data'] });
      authCheck().catch(() => {});
    },
    onError: () => message.error('Lưu thất bại!')
  });

  const togglePermission = (permId: number) => {
    setCheckedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    // Clear partial state when user explicitly toggles
    setPartialPermIds((prev) => {
      if (!prev.has(permId)) return prev;
      const next = new Set(prev);
      next.delete(permId);
      return next;
    });
    setIsDirty(true);
  };

  const toggleGroup = (perms: Permission[], checked: boolean) => {
    setCheckedPermIds((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
    setIsDirty(true);
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    );
  if (!rbacData) return null;

  const selectedRoleNames = roles
    .filter((r) => selectedRoleIds.has(String(r.id)))
    .map((r) => r.role_name);

  const sorted = [...allPermissions].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
  );

  // 2-level grouping: display_area → module
  const AREA_ORDER = ['sidebar', 'home', 'both'] as const;
  const AREA_LABELS: Record<string, string> = {
    sidebar: '📋 Sidebar',
    home: '🏠 Trang Chủ',
    both: '🔗 Cả Hai (Sidebar + Trang Chủ)'
  };

  type AreaGrouped = Record<string, Record<string, Permission[]>>;
  const areaGrouped: AreaGrouped = {};
  for (const perm of sorted) {
    const area = perm.display_area || 'other';
    const mod = perm.module || 'other';
    if (!areaGrouped[area]) areaGrouped[area] = {};
    if (!areaGrouped[area][mod]) areaGrouped[area][mod] = [];
    areaGrouped[area][mod].push(perm);
  }

  // Flatten all perms for an entire area (for "toggle all" in area)
  const getAreaPerms = (area: string) => {
    const mods = areaGrouped[area] ?? {};
    return Object.values(mods).flat();
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={6}>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <span className="text-sm font-bold text-gray-700 dark:text-white">
              Vai trò
            </span>
            <span className="text-xs text-gray-400">
              {selectedRoleIds.size > 0 && `${selectedRoleIds.size} đã chọn`}
            </span>
          </div>
          <div>
            {roles.map((role) => {
              const roleIdStr = String(role.id);
              const isSelected = selectedRoleIds.has(roleIdStr);
              const count = (rolePermissions[roleIdStr] ?? []).length;
              return (
                <div
                  key={role.id}
                  onClick={() => toggleRoleSelection(roleIdStr)}
                  className={`flex cursor-pointer items-center justify-between border-b border-gray-50 px-4 py-3 text-sm transition-all duration-200 last:border-b-0 dark:border-gray-700/50 ${isSelected ? 'bg-blue-50/80 font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/30'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleRoleSelection(roleIdStr)}
                    />
                    <div>
                      <div className="dark:text-gray-200">{role.role_name}</div>
                      <div className="text-xs text-gray-400">{count} quyền</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Col>
      <Col xs={24} md={18}>
        {selectedRoleIds.size === 0 ? (
          <Empty description="Chọn ít nhất một vai trò" />
        ) : (
          <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
              <div className="text-sm">
                <span className="font-bold text-gray-800 dark:text-white">
                  {selectedRoleNames.join(', ')}
                </span>
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  — {checkedPermIds.size}/{allPermissions.length} quyền
                </span>
                {selectedRoleIds.size > 1 && (
                  <Tag color="blue" className="!ml-2 !rounded-lg !text-[10px]">
                    {selectedRoleIds.size} vai trò
                  </Tag>
                )}
              </div>
              <Space>
                {isDirty && (
                  <Tag color="warning" className="!rounded-lg">
                    Chưa lưu
                  </Tag>
                )}
                <AppButton
                  tone="primary"
                  icon={<FiSave />}
                  onClick={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                  disabled={!isDirty}
                >
                  {isDirty ? 'Lưu thay đổi' : 'Đã lưu'}
                </AppButton>
              </Space>
            </div>

            {/* Area → Module grouping */}
            {AREA_ORDER.filter((area) => areaGrouped[area]).map((area) => {
              const areaPerms = getAreaPerms(area);
              const areaCheckedCount = areaPerms.filter((p) =>
                checkedPermIds.has(p.id)
              ).length;
              const areaAllChecked = areaCheckedCount === areaPerms.length;
              const modules = areaGrouped[area];

              return (
                <div
                  key={area}
                  className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/30"
                >
                  {/* Area header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-black dark:text-white">
                        {AREA_LABELS[area] || area}
                      </span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        ({areaCheckedCount}/{areaPerms.length})
                      </span>
                    </div>
                    <Checkbox
                      checked={areaAllChecked}
                      indeterminate={areaCheckedCount > 0 && !areaAllChecked}
                      onChange={(e) => toggleGroup(areaPerms, e.target.checked)}
                    >
                      <span className="text-xs font-semibold text-gray-500">
                        Tất cả
                      </span>
                    </Checkbox>
                  </div>

                  {/* Module sub-groups */}
                  {Object.entries(modules).map(([mod, perms]) => {
                    const modChecked = perms.filter((p) =>
                      checkedPermIds.has(p.id)
                    ).length;
                    const modAllChecked = modChecked === perms.length;
                    return (
                      <div key={mod} className="mb-4 last:mb-0">
                        <div className="mb-2 flex items-center justify-between border-b border-gray-200/60 pb-1.5 dark:border-gray-700">
                          <span className="text-sm font-bold text-black/70 dark:text-gray-300">
                            {mod} ({modChecked}/{perms.length})
                          </span>
                          <Checkbox
                            checked={modAllChecked}
                            indeterminate={modChecked > 0 && !modAllChecked}
                            onChange={(e) =>
                              toggleGroup(perms, e.target.checked)
                            }
                          >
                            <span className="text-xs text-gray-500">
                              Tất cả
                            </span>
                          </Checkbox>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {perms.map((perm, idx) => {
                            const isChecked = checkedPermIds.has(perm.id);
                            const isPartial = partialPermIds.has(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${isPartial ? 'border-orange-200 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-900/10' : isChecked ? 'border-blue-200 bg-blue-50/80 shadow-sm shadow-blue-100 dark:border-blue-700 dark:bg-blue-900/20' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:bg-gray-700/30'}`}
                              >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[10px] font-bold text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                                  {idx + 1}
                                </span>
                                <Checkbox
                                  checked={isChecked}
                                  indeterminate={isPartial}
                                  onChange={() => togglePermission(perm.id)}
                                  className="mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-800 dark:text-white/90">
                                    {perm.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 truncate text-xs text-gray-400">
                                    <code className="text-[10px]">
                                      {perm.key}
                                    </code>
                                  </div>
                                  {/* Show role breakdown for partial perms */}
                                  {isPartial && selectedRoleIds.size > 1 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {roles
                                        .filter((r) =>
                                          selectedRoleIds.has(String(r.id))
                                        )
                                        .map((r) => {
                                          const has = (
                                            rolePermissions[String(r.id)] ?? []
                                          ).includes(perm.id);
                                          return (
                                            <span
                                              key={r.id}
                                              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${has ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}
                                            >
                                              {has ? '✓' : '✗'} {r.role_name}
                                            </span>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                                <Tag
                                  className="shrink-0 !rounded-md !text-[10px]"
                                  color={
                                    perm.type === 'admin'
                                      ? 'purple'
                                      : perm.type === 'employee'
                                        ? 'green'
                                        : 'gold'
                                  }
                                >
                                  {perm.type === 'admin'
                                    ? 'Admin'
                                    : perm.type === 'employee'
                                      ? 'Nhân viên'
                                      : 'Chung'}
                                </Tag>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Handle any areas not in AREA_ORDER (e.g. 'other') */}
            {Object.keys(areaGrouped)
              .filter(
                (a) => !AREA_ORDER.includes(a as (typeof AREA_ORDER)[number])
              )
              .map((area) => {
                const areaPerms = getAreaPerms(area);
                const areaCheckedCount = areaPerms.filter((p) =>
                  checkedPermIds.has(p.id)
                ).length;
                const areaAllChecked = areaCheckedCount === areaPerms.length;
                const modules = areaGrouped[area];
                return (
                  <div
                    key={area}
                    className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/30"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-base font-bold text-black dark:text-white">
                        📦 {area}
                      </span>
                      <Checkbox
                        checked={areaAllChecked}
                        indeterminate={areaCheckedCount > 0 && !areaAllChecked}
                        onChange={(e) =>
                          toggleGroup(areaPerms, e.target.checked)
                        }
                      >
                        <span className="text-xs font-semibold text-gray-500">
                          Tất cả
                        </span>
                      </Checkbox>
                    </div>
                    {Object.entries(modules).map(([mod, perms]) => {
                      const modChecked = perms.filter((p) =>
                        checkedPermIds.has(p.id)
                      ).length;
                      const modAllChecked = modChecked === perms.length;
                      return (
                        <div key={mod} className="mb-4 last:mb-0">
                          <div className="mb-2 flex items-center justify-between border-b border-gray-200/60 pb-1.5 dark:border-gray-700">
                            <span className="text-sm font-bold text-black/70 dark:text-gray-300">
                              {mod} ({modChecked}/{perms.length})
                            </span>
                            <Checkbox
                              checked={modAllChecked}
                              indeterminate={modChecked > 0 && !modAllChecked}
                              onChange={(e) =>
                                toggleGroup(perms, e.target.checked)
                              }
                            >
                              <span className="text-xs text-gray-500">
                                Tất cả
                              </span>
                            </Checkbox>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {perms.map((perm, idx) => {
                              const isChecked = checkedPermIds.has(perm.id);
                              const isPartial = partialPermIds.has(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${isPartial ? 'border-orange-200 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-900/10' : isChecked ? 'border-blue-200 bg-blue-50/80 shadow-sm shadow-blue-100 dark:border-blue-700 dark:bg-blue-900/20' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:bg-gray-700/30'}`}
                                >
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[10px] font-bold text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                                    {idx + 1}
                                  </span>
                                  <Checkbox
                                    checked={isChecked}
                                    indeterminate={isPartial}
                                    onChange={() => togglePermission(perm.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-gray-800 dark:text-white/90">
                                      {perm.name}
                                    </div>
                                    <div className="flex items-center gap-1.5 truncate text-xs text-gray-400">
                                      <code className="text-[10px]">
                                        {perm.key}
                                      </code>
                                    </div>
                                    {isPartial && selectedRoleIds.size > 1 && (
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        {roles
                                          .filter((r) =>
                                            selectedRoleIds.has(String(r.id))
                                          )
                                          .map((r) => {
                                            const has = (
                                              rolePermissions[String(r.id)] ??
                                              []
                                            ).includes(perm.id);
                                            return (
                                              <span
                                                key={r.id}
                                                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${has ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}
                                              >
                                                {has ? '✓' : '✗'} {r.role_name}
                                              </span>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
                                  <Tag
                                    className="shrink-0 !rounded-md !text-[10px]"
                                    color={
                                      perm.type === 'admin'
                                        ? 'purple'
                                        : perm.type === 'employee'
                                          ? 'green'
                                          : 'gold'
                                    }
                                  >
                                    {perm.type === 'admin'
                                      ? 'Admin'
                                      : perm.type === 'employee'
                                        ? 'Nhân viên'
                                        : 'Chung'}
                                  </Tag>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </div>
        )}
      </Col>
    </Row>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 2: Quản lý quyền & Sidebar Items (merged)
// ─────────────────────────────────────────────────────────────────────────────

const suggestIconsForName = (name: string): string[] => {
  if (!name) return [];
  const lower = name.toLowerCase();
  const suggestions: string[] = [];

  if (
    lower.includes('thêm') ||
    lower.includes('tạo') ||
    lower.includes('add') ||
    lower.includes('create') ||
    lower.includes('mới')
  ) {
    suggestions.push(
      'fa-solid fa-plus',
      'fa-solid fa-circle-plus',
      'fa-solid fa-square-plus'
    );
  }
  if (
    lower.includes('xóa') ||
    lower.includes('delete') ||
    lower.includes('remove') ||
    lower.includes('hủy')
  ) {
    suggestions.push(
      'fa-solid fa-trash',
      'fa-solid fa-trash-can',
      'fa-solid fa-eraser'
    );
  }
  if (
    lower.includes('sửa') ||
    lower.includes('chỉnh') ||
    lower.includes('cập nhật') ||
    lower.includes('edit') ||
    lower.includes('update')
  ) {
    suggestions.push(
      'fa-solid fa-pen',
      'fa-solid fa-pen-to-square',
      'fa-solid fa-wrench'
    );
  }
  if (
    lower.includes('xem') ||
    lower.includes('view') ||
    lower.includes('đọc') ||
    lower.includes('read') ||
    lower.includes('chi tiết')
  ) {
    suggestions.push('fa-solid fa-eye', 'fa-solid fa-list', 'fa-solid fa-book');
  }
  if (
    lower.includes('quản lý') ||
    lower.includes('manage') ||
    lower.includes('danh sách')
  ) {
    suggestions.push(
      'fa-solid fa-list-ul',
      'fa-solid fa-list-check',
      'fa-solid fa-clipboard-list'
    );
  }
  if (
    lower.includes('người') ||
    lower.includes('nhân sự') ||
    lower.includes('nhân viên') ||
    lower.includes('user') ||
    lower.includes('nhân công')
  ) {
    suggestions.push(
      'fa-solid fa-user',
      'fa-solid fa-users',
      'fa-solid fa-user-gear'
    );
  }
  if (
    lower.includes('cài đặt') ||
    lower.includes('cấu hình') ||
    lower.includes('thiết lập') ||
    lower.includes('setting')
  ) {
    suggestions.push(
      'fa-solid fa-gear',
      'fa-solid fa-gears',
      'fa-solid fa-sliders'
    );
  }
  if (
    lower.includes('sản phẩm') ||
    lower.includes('hàng hóa') ||
    lower.includes('product') ||
    lower.includes('item') ||
    lower.includes('mã hàng')
  ) {
    suggestions.push(
      'fa-solid fa-box',
      'fa-solid fa-boxes-stacked',
      'fa-solid fa-cubes'
    );
  }
  if (lower.includes('nhập') || lower.includes('import')) {
    suggestions.push('fa-solid fa-file-import', 'fa-solid fa-right-to-bracket');
  }
  if (lower.includes('xuất') || lower.includes('export')) {
    suggestions.push(
      'fa-solid fa-file-export',
      'fa-solid fa-right-from-bracket'
    );
  }
  if (lower.includes('in') || lower.includes('print')) {
    suggestions.push('fa-solid fa-print');
  }
  if (
    lower.includes('thống kê') ||
    lower.includes('báo cáo') ||
    lower.includes('report') ||
    lower.includes('chart') ||
    lower.includes('biểu đồ')
  ) {
    suggestions.push(
      'fa-solid fa-chart-line',
      'fa-solid fa-chart-pie',
      'fa-solid fa-chart-simple'
    );
  }
  if (
    lower.includes('lịch') ||
    lower.includes('kế hoạch') ||
    lower.includes('schedule') ||
    lower.includes('calendar') ||
    lower.includes('thời gian')
  ) {
    suggestions.push(
      'fa-solid fa-calendar',
      'fa-solid fa-calendar-days',
      'fa-solid fa-clock'
    );
  }
  if (
    lower.includes('quyền') ||
    lower.includes('phân quyền') ||
    lower.includes('permission') ||
    lower.includes('role')
  ) {
    suggestions.push(
      'fa-solid fa-shield-halved',
      'fa-solid fa-key',
      'fa-solid fa-user-shield'
    );
  }
  if (
    lower.includes('kho') ||
    lower.includes('stock') ||
    lower.includes('inventory') ||
    lower.includes('lưu trữ')
  ) {
    suggestions.push('fa-solid fa-warehouse', 'fa-solid fa-pallet');
  }
  if (
    lower.includes('lương') ||
    lower.includes('salary') ||
    lower.includes('tiền') ||
    lower.includes('money')
  ) {
    suggestions.push(
      'fa-solid fa-money-bill',
      'fa-solid fa-coins',
      'fa-solid fa-wallet'
    );
  }
  if (
    lower.includes('máy') ||
    lower.includes('machine') ||
    lower.includes('thiết bị') ||
    lower.includes('device')
  ) {
    suggestions.push(
      'fa-solid fa-desktop',
      'fa-solid fa-laptop',
      'fa-solid fa-microchip'
    );
  }
  if (
    lower.includes('dashboard') ||
    lower.includes('tổng quan') ||
    lower.includes('trang chủ')
  ) {
    suggestions.push(
      'fa-solid fa-gauge',
      'fa-solid fa-house',
      'fa-solid fa-chart-pie'
    );
  }
  if (
    lower.includes('duyệt') ||
    lower.includes('approve') ||
    lower.includes('chấp nhận') ||
    lower.includes('xác nhận')
  ) {
    suggestions.push(
      'fa-solid fa-circle-check',
      'fa-solid fa-check',
      'fa-solid fa-clipboard-check'
    );
  }
  if (
    lower.includes('từ chối') ||
    lower.includes('reject') ||
    lower.includes('ban')
  ) {
    suggestions.push(
      'fa-solid fa-circle-xmark',
      'fa-solid fa-xmark',
      'fa-solid fa-ban'
    );
  }
  if (
    lower.includes('ca làm việc') ||
    lower.includes('chấm công') ||
    lower.includes('attendance')
  ) {
    suggestions.push(
      'fa-solid fa-user-clock',
      'fa-solid fa-address-card',
      'fa-solid fa-fingerprint'
    );
  }

  // default suggestions if none match
  if (suggestions.length === 0) {
    suggestions.push(
      'fa-solid fa-circle',
      'fa-solid fa-star',
      'fa-solid fa-layer-group',
      'fa-solid fa-cube'
    );
  }

  return Array.from(new Set(suggestions)).slice(0, 10);
};

function PermissionsManager() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [form] = Form.useForm();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);

  // Inline sort_order editing
  const [editingSortId, setEditingSortId] = useState<number | null>(null);
  const [editingSortValue, setEditingSortValue] = useState<string>('');
  const sortInputRef = useRef<HTMLInputElement>(null);

  const { mutate: inlineSortMutate } = useMutation({
    mutationFn: ({ id, sort_order }: { id: number; sort_order: number }) => {
      const perm = permissions.find((p) => p.id === id);
      if (!perm) return Promise.reject('Not found');
      return updatePermission(id, {
        key: perm.key,
        name: perm.name,
        icon: perm.icon || '',
        url: perm.url || '',
        type: perm.type,
        display_area: perm.display_area as 'sidebar' | 'home' | 'both',
        sort_order
      });
    },
    onSuccess: () => {
      invalidateAll();
      setEditingSortId(null);
    },
    onError: () => {
      message.error('Cập nhật thất bại!');
      setEditingSortId(null);
    }
  });

  const commitSort = useCallback(
    (id: number) => {
      const num = parseInt(editingSortValue, 10);
      if (!isNaN(num) && num >= 0) {
        inlineSortMutate({ id, sort_order: num });
      } else {
        setEditingSortId(null);
      }
    },
    [editingSortValue, inlineSortMutate]
  );

  // Sidebar item sub-drawer
  const [siDrawerOpen, setSiDrawerOpen] = useState(false);
  const [editingSI, setEditingSI] = useState<SidebarItem | null>(null);
  const [siForm] = Form.useForm();

  const { data: permData, isLoading } = useQuery({
    queryKey: ['permissions-list'],
    queryFn: fetchPermissions
  });
  const permissions = useMemo(() => {
    let list = Array.isArray(permData?.all_permissions)
      ? permData.all_permissions
      : [];
    if (typeFilter) list = list.filter((p) => p.type === typeFilter);
    if (areaFilter) list = list.filter((p) => p.display_area === areaFilter);
    if (moduleFilter) list = list.filter((p) => p.module === moduleFilter);
    return list;
  }, [permData, typeFilter, areaFilter, moduleFilter]);
  const allPermissions = useMemo(
    () =>
      Array.isArray(permData?.all_permissions) ? permData.all_permissions : [],
    [permData]
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['permissions-list'] });
    queryClient.invalidateQueries({ queryKey: ['rbac-data'] });
    authCheck().catch(() => {});
  };

  // --- Permission mutations ---
  const createMut = useMutation({
    mutationFn: (p: PermissionPayload) => createPermission(p),
    onSuccess: () => {
      message.success('Tạo quyền thành công!');
      invalidateAll();
      closeDrawer();
    },
    onError: () => message.error('Thất bại!')
  });
  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: number;
      payload: Partial<PermissionPayload>;
    }) => updatePermission(id, payload),
    onSuccess: () => {
      message.success('Cập nhật thành công!');
      invalidateAll();
      closeDrawer();
    },
    onError: () => message.error('Thất bại!')
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePermission(id),
    onSuccess: () => {
      message.success('Xóa thành công!');
      invalidateAll();
    },
    onError: () => message.error('Thất bại!')
  });

  // --- Sidebar Item mutations ---
  const siCreateMut = useMutation({
    mutationFn: (p: SidebarItemPayload) => createSidebarItem(p),
    onSuccess: () => {
      message.success('Tạo item thành công!');
      invalidateAll();
      closeSIDrawer();
    },
    onError: () => message.error('Thất bại!')
  });
  const siUpdateMut = useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: number;
      payload: Partial<SidebarItemPayload>;
    }) => updateSidebarItem(id, payload),
    onSuccess: () => {
      message.success('Cập nhật thành công!');
      invalidateAll();
      closeSIDrawer();
    },
    onError: () => message.error('Thất bại!')
  });
  const siDeleteMut = useMutation({
    mutationFn: (id: number) => deleteSidebarItem(id),
    onSuccess: () => {
      message.success('Xóa thành công!');
      invalidateAll();
    },
    onError: () => message.error('Thất bại!')
  });

  // --- Permission drawer ---
  const openCreate = () => {
    setEditingPerm(null);
    form.resetFields();
    setDrawerOpen(true);
  };
  const openEdit = (perm: Permission) => {
    setEditingPerm(perm);
    form.setFieldsValue({
      key: perm.key,
      name: perm.name,
      icon: perm.icon || '',
      url: perm.url || '',
      sort_order: perm.sort_order ?? 0,
      type: perm.type,
      module: perm.module,
      display_area: perm.display_area
    });
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingPerm(null);
    form.resetFields();
  };
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingPerm) {
        updateMut.mutate({ id: editingPerm.id, payload: values });
      } else {
        createMut.mutate(values);
      }
    });
  };

  // --- Sidebar Item sub-drawer ---
  const openSICreate = (permId: number) => {
    setEditingSI(null);
    siForm.resetFields();
    siForm.setFieldsValue({ permission_id: permId });
    setSiDrawerOpen(true);
  };
  const openSIEdit = (item: SidebarItem) => {
    setEditingSI(item);
    siForm.setFieldsValue({
      permission_id: item.permission_id,
      key: item.key,
      title: item.title,
      icon: typeof item.icon === 'string' ? item.icon : '',
      url: item.url || ''
    });
    setSiDrawerOpen(true);
  };
  const closeSIDrawer = () => {
    setSiDrawerOpen(false);
    setEditingSI(null);
    siForm.resetFields();
  };
  const handleSISubmit = () => {
    siForm.validateFields().then((values) => {
      if (editingSI) {
        siUpdateMut.mutate({ id: editingSI.id, payload: values });
      } else {
        siCreateMut.mutate(values);
      }
    });
  };

  // Keep editingPerm in sync with latest data after mutations
  const liveEditingPerm = useMemo(() => {
    if (!editingPerm) return null;
    return permissions.find((p) => p.id === editingPerm.id) ?? editingPerm;
  }, [editingPerm, permissions]);

  // --- Table columns ---
  const columns: TableColumnsType<Permission> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 55,
      align: 'center',
      sorter: (a, b) => a.id - b.id
    },
    {
      title: 'STT',
      dataIndex: 'sort_order',
      width: 60,
      align: 'center',
      sorter: (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      defaultSortOrder: 'ascend',
      render: (v: number, record: Permission) => {
        if (editingSortId === record.id) {
          return (
            <input
              ref={sortInputRef}
              type="number"
              min={0}
              className="w-12 rounded border border-blue-400 bg-blue-50 px-1 py-0.5 text-center font-mono text-xs outline-none focus:ring-1 focus:ring-blue-400"
              value={editingSortValue}
              onChange={(e) => setEditingSortValue(e.target.value)}
              onBlur={() => commitSort(record.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSort(record.id);
                if (e.key === 'Escape') setEditingSortId(null);
              }}
            />
          );
        }
        return (
          <Tooltip title="Double click để sửa">
            <span
              className="cursor-pointer rounded px-1.5 py-0.5 font-mono text-xs text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
              onDoubleClick={() => {
                setEditingSortId(record.id);
                setEditingSortValue(String(v ?? 0));
                setTimeout(() => sortInputRef.current?.select(), 50);
              }}
            >
              {v ?? 0}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: 'Icon',
      width: 45,
      align: 'center',
      render: (_: unknown, record: Permission) => {
        const sidebarIcon = record.sidebar_items?.[0]?.icon;
        return renderIconPreview(record.icon || (sidebarIcon as string));
      }
    },
    {
      title: 'Key',
      dataIndex: 'key',
      width: 180,
      render: (v: string) => <code className="text-xs">{v}</code>
    },
    {
      title: 'Module',
      dataIndex: 'module',
      width: 120,
      align: 'center',
      filters: (() => {
        const modules = [
          ...new Set(allPermissions.map((p) => p.module).filter(Boolean))
        ];
        return modules.sort().map((m) => ({ text: m!, value: m! }));
      })(),
      onFilter: (value, record) => record.module === value,
      render: (v: string) =>
        v ? (
          <Tag color="cyan" className="!rounded-md !text-[10px]">
            {v}
          </Tag>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )
    },
    { title: 'Tên', dataIndex: 'name', ellipsis: true },
    {
      title: 'Icon class',
      dataIndex: 'icon',
      width: 160,
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <code className="text-xs text-gray-500">{v}</code>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )
    },
    {
      title: 'URL',
      dataIndex: 'url',
      width: 180,
      ellipsis: true,
      render: (v: string, record: Permission) => {
        if (v) return <code className="text-xs text-green-600">{v}</code>;
        if (record.sidebar_items?.length > 0)
          return <span className="text-xs text-gray-300">— (cha)</span>;
        return (
          <Tag color="warning" className="!text-[10px]">
            chưa có
          </Tag>
        );
      }
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      width: 85,
      align: 'center',
      render: (v: string) => (
        <Tag
          color={v === 'admin' ? 'purple' : v === 'employee' ? 'green' : 'gold'}
        >
          {v}
        </Tag>
      )
    },
    {
      title: 'Khu vực',
      dataIndex: 'display_area',
      width: 85,
      align: 'center',
      render: (v: string) => (
        <Tag
          color={v === 'sidebar' ? 'blue' : v === 'home' ? 'cyan' : 'geekblue'}
        >
          {v}
        </Tag>
      )
    },
    {
      title: 'Sub',
      width: 50,
      align: 'center',
      render: (_: unknown, record: Permission) => {
        const count = record.sidebar_items?.length ?? 0;
        return count > 0 ? (
          <Badge count={count} color="#1677ff" />
        ) : (
          <span className="text-xs text-gray-300">—</span>
        );
      }
    },
    {
      title: '',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_: unknown, record: Permission) => (
        <Space size={2}>
          <Tooltip title="Sửa">
            <AppButton
              type="text"
              size="small"
              icon={<FiEdit3 />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa quyền?"
            description="Sidebar items cũng bị xóa."
            onConfirm={() => deleteMut.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <AppButton type="text" size="small" icon={<FaTrash />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
        <AppButton tone="primary" icon={<FiPlus />} onClick={openCreate}>
          Thêm quyền
        </AppButton>
        <Select
          placeholder="Loại"
          allowClear
          value={typeFilter}
          onChange={(v) => setTypeFilter(v ?? null)}
          options={[
            { label: 'Admin', value: 'admin' },
            { label: 'Nhân viên', value: 'employee' },
            { label: 'Chung', value: 'both' }
          ]}
          className="!w-28"
        />
        <Select
          placeholder="Khu vực"
          allowClear
          value={areaFilter}
          onChange={(v) => setAreaFilter(v ?? null)}
          options={[
            { label: 'Sidebar', value: 'sidebar' },
            { label: 'Home', value: 'home' },
            { label: 'Cả hai', value: 'both' }
          ]}
          className="!w-28"
        />
        <Select
          placeholder="Module"
          allowClear
          value={moduleFilter}
          onChange={(v) => setModuleFilter(v ?? null)}
          options={(() => {
            const modules = [
              ...new Set(allPermissions.map((p) => p.module).filter(Boolean))
            ];
            return modules.sort().map((m) => ({ label: m, value: m! }));
          })()}
          className="!w-36"
        />
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
          <FaKey className="text-xs text-blue-500" />
          <span className="text-xs text-gray-500">
            Tổng:{' '}
            <strong className="text-blue-600">{allPermissions.length}</strong>{' '}
            quyền
          </span>
        </div>
      </div>

      {isMobile ? (
        <Spin spinning={isLoading}>
          {permissions.length === 0 && !isLoading ? (
            <Empty description="Không có dữ liệu" />
          ) : (
            <div className="flex flex-col gap-3">
              {permissions.map((perm, index) => (
                <div
                  key={perm.id}
                  className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {perm.name}
                        </span>
                        {renderIconPreview(
                          perm.icon || (perm.sidebar_items?.[0]?.icon as string)
                        )}
                      </div>
                      <code className="text-[11px] text-gray-400">
                        {perm.key}
                      </code>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <Tag
                      color={
                        perm.type === 'admin'
                          ? 'purple'
                          : perm.type === 'employee'
                            ? 'green'
                            : 'gold'
                      }
                      className="!m-0 !text-[10px]"
                    >
                      {perm.type}
                    </Tag>
                    <Tag
                      color={
                        perm.display_area === 'sidebar'
                          ? 'blue'
                          : perm.display_area === 'home'
                            ? 'cyan'
                            : 'geekblue'
                      }
                      className="!m-0 !text-[10px]"
                    >
                      {perm.display_area}
                    </Tag>
                    {perm.module && (
                      <Tag color="cyan" className="!m-0 !text-[10px]">
                        {perm.module}
                      </Tag>
                    )}
                    {(perm.sidebar_items?.length ?? 0) > 0 && (
                      <Badge
                        count={perm.sidebar_items?.length}
                        color="#1677ff"
                      />
                    )}
                  </div>

                  {perm.url && (
                    <div className="mt-1.5">
                      <code className="text-[11px] text-green-600">
                        {perm.url}
                      </code>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                    <AppButton
                      type="text"
                      size="small"
                      icon={<FiEdit3 />}
                      onClick={() => openEdit(perm)}
                    >
                      Sửa
                    </AppButton>
                    <Popconfirm
                      title="Xóa quyền?"
                      description="Sidebar items cũng bị xóa."
                      onConfirm={() => deleteMut.mutate(perm.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <AppButton
                        type="text"
                        size="small"
                        icon={<FaTrash />}
                        danger
                      >
                        Xóa
                      </AppButton>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Spin>
      ) : (
        <Table<Permission>
          {...(customTableProps as unknown as TableProps<Permission>)}
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          loading={isLoading}
        />
      )}

      {/* ══════ Permission Drawer (includes sidebar items) ══════ */}
      <Drawer
        title={editingPerm ? `Sửa: ${editingPerm.name}` : 'Thêm quyền mới'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={isMobile ? '100%' : 520}
        footer={
          <div className="flex justify-end gap-2">
            <AppButton tone="neutral" onClick={closeDrawer}>
              Đóng
            </AppButton>
            <AppButton
              tone="primary"
              onClick={handleSubmit}
              loading={createMut.isPending || updateMut.isPending}
            >
              {editingPerm ? 'Cập nhật quyền' : 'Tạo quyền'}
            </AppButton>
          </div>
        }
      >
        <Form form={form} layout="vertical" size="middle">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="key"
                label="Key"
                rules={[{ required: true, message: 'Bắt buộc' }]}
              >
                <Input placeholder="view_dashboard" disabled={!!editingPerm} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên"
                rules={[{ required: true, message: 'Bắt buộc' }]}
              >
                <Input placeholder="Xem dashboard" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="icon"
            label="Icon class"
            tooltip="FA class. VD: fas fa-box fa-lg"
          >
            <Input placeholder="fas fa-box fa-lg" />
          </Form.Item>
          <Form.Item
            shouldUpdate={(prev, cur) =>
              prev.icon !== cur.icon || prev.name !== cur.name
            }
            noStyle
          >
            {() => {
              const iconVal = form.getFieldValue('icon');
              const nameVal = form.getFieldValue('name');
              const suggestions = suggestIconsForName(nameVal || '');

              return (
                <div className="mb-4">
                  {iconVal && (
                    <div className="mb-3 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-2">
                      <span className="text-2xl">
                        {renderIconPreview(iconVal)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {mapFaClassToIconType(iconVal)
                          ? '✅ Mapped OK'
                          : '⚠️ Dùng FA class trực tiếp'}
                      </span>
                    </div>
                  )}
                  {suggestions.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Gợi ý icon (click để chọn):
                        </span>
                        <a
                          href={
                            nameVal
                              ? `https://fontawesome.com/v5/search?q=${encodeURIComponent(nameVal)}&m=free`
                              : 'https://fontawesome.com/v5/search?m=free'
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                        >
                          <FaIcons.FaExternalLinkAlt /> Tìm trên FontAwesome
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                          <div
                            key={s}
                            onClick={() => form.setFieldsValue({ icon: s })}
                            className="flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                            title={s}
                          >
                            <span className="text-base">
                              {renderIconPreview(s)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestions.length === 0 && (
                    <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
                      <span className="text-xs text-gray-400">
                        Không tìm thấy icon phù hợp.
                      </span>
                      <a
                        href={
                          nameVal
                            ? `https://fontawesome.com/v5/search?q=${encodeURIComponent(nameVal)}&m=free`
                            : 'https://fontawesome.com/v5/search?m=free'
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                      >
                        <FaIcons.FaExternalLinkAlt /> Tìm thủ công
                      </a>
                    </div>
                  )}
                </div>
              );
            }}
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="url"
                label="URL (FE route)"
                tooltip="VD: /admin/products"
              >
                <Input placeholder="/admin/products" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="sort_order"
                label="Thứ tự"
                tooltip="Số nhỏ hiện trước"
                initialValue={0}
              >
                <Input type="number" min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="module"
            label="Module"
            tooltip="Nhóm quyền. VD: dashboard, schedule, products"
          >
            <Input placeholder="dashboard" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Loại"
                rules={[{ required: true, message: 'Bắt buộc' }]}
              >
                <Select
                  options={[
                    { label: 'Admin', value: 'admin' },
                    { label: 'Nhân viên', value: 'employee' },
                    { label: 'Chung', value: 'both' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="display_area"
                label="Khu vực"
                rules={[{ required: true, message: 'Bắt buộc' }]}
              >
                <Select
                  options={[
                    { label: 'Sidebar', value: 'sidebar' },
                    { label: 'Home', value: 'home' },
                    { label: 'Cả hai', value: 'both' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* ── Sidebar Items Section (only when editing sidebar/both) ── */}
        {liveEditingPerm &&
          ['sidebar', 'both'].includes(liveEditingPerm.display_area) && (
            <>
              <div className="mt-1 mb-3 flex items-center justify-between border-t border-gray-200 pt-4">
                <Text strong className="text-sm">
                  Sidebar Items ({liveEditingPerm.sidebar_items?.length ?? 0})
                </Text>
                <AppButton
                  size="small"
                  type="dashed"
                  icon={<FiPlus />}
                  onClick={() => openSICreate(liveEditingPerm.id)}
                >
                  Thêm
                </AppButton>
              </div>

              {(liveEditingPerm.sidebar_items?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {liveEditingPerm.sidebar_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                    >
                      <span className="shrink-0 text-lg">
                        {renderIconPreview(item.icon)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-800 capitalize">
                          {item.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                          <code>{item.key}</code>
                          {item.url ? (
                            <span className="text-green-600">→ {item.url}</span>
                          ) : (
                            <Tag
                              color="warning"
                              className="!m-0 !text-[10px] !leading-tight"
                            >
                              chưa có URL
                            </Tag>
                          )}
                          {typeof item.icon === 'string' && item.icon && (
                            <span className="text-gray-300">{item.icon}</span>
                          )}
                        </div>
                      </div>
                      <Space size={0}>
                        <Tooltip title="Sửa item">
                          <AppButton
                            type="text"
                            size="small"
                            icon={<FiEdit3 className="text-blue-500" />}
                            onClick={() => openSIEdit(item)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Xóa item này?"
                          onConfirm={() => siDeleteMut.mutate(item.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <AppButton
                            type="text"
                            size="small"
                            icon={<FaTrash className="text-red-400" />}
                          />
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center">
                  <Empty
                    description="Chưa có sidebar item"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    className="!my-0"
                  >
                    <AppButton
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() => openSICreate(liveEditingPerm.id)}
                    >
                      Thêm item đầu tiên
                    </AppButton>
                  </Empty>
                </div>
              )}
            </>
          )}
      </Drawer>

      {/* ══════ Sidebar Item Sub-Drawer ══════ */}
      <Drawer
        title={editingSI ? 'Sửa sidebar item' : 'Thêm sidebar item'}
        open={siDrawerOpen}
        onClose={closeSIDrawer}
        width={400}
        footer={
          <div className="flex justify-end gap-2">
            <AppButton tone="neutral" onClick={closeSIDrawer}>
              Hủy
            </AppButton>
            <AppButton
              tone="primary"
              onClick={handleSISubmit}
              loading={siCreateMut.isPending || siUpdateMut.isPending}
            >
              {editingSI ? 'Cập nhật' : 'Tạo'}
            </AppButton>
          </div>
        }
      >
        <Form form={siForm} layout="vertical">
          <Form.Item name="permission_id" hidden>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="key"
                label="Key"
                rules={[{ required: true, message: 'Bắt buộc' }]}
              >
                <Input placeholder="view_employees" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Tiêu đề"
                rules={[{ required: true, message: 'Bắt buộc' }]}
              >
                <Input placeholder="Nhân viên" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="icon" label="Icon class">
            <Input placeholder="fas fa-users fa-lg" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL (FE route)"
            tooltip="VD: /admin/employees"
          >
            <Input placeholder="/admin/employees" />
          </Form.Item>
          <Form.Item
            shouldUpdate={(prev, cur) => prev.icon !== cur.icon}
            noStyle
          >
            {() => {
              const iconVal = siForm.getFieldValue('icon');
              if (!iconVal) return null;
              return (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-2">
                  <span className="text-2xl">{renderIconPreview(iconVal)}</span>
                  <span className="text-xs text-gray-400">
                    {mapFaClassToIconType(iconVal)
                      ? '✅ Mapped OK'
                      : '⚠️ FA class trực tiếp'}
                  </span>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  User Permission Drawer — Phân quyền trực tiếp cho từng admin (Grant + Deny)
// ─────────────────────────────────────────────────────────────────────────────

function UserPermissionDrawer({
  adminUser,
  open,
  onClose
}: {
  adminUser: AdminUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  // checkedIds = tập hợp TẤT CẢ permission IDs mà user ĐANG ĐƯỢC bật (bao gồm role + granted - denied)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const { data: permData, isLoading } = useQuery({
    queryKey: ['user-permissions', adminUser?.id],
    queryFn: () => fetchUserPermissions(adminUser!.id),
    enabled: open && !!adminUser?.id
  });

  const rolePermIds = useMemo(
    () => new Set(permData?.role_permissions ?? []),
    [permData]
  );
  const allPermissions = useMemo(
    () => permData?.all_permissions ?? [],
    [permData]
  );

  // Reset checked state from server data
  useEffect(() => {
    if (permData) {
      const deniedSet = new Set(permData.denied_permissions ?? []);
      const grantedSet = new Set(permData.granted_permissions ?? []);
      // Effective = (role - denied) ∪ granted
      const effective = new Set<number>();
      for (const id of permData.role_permissions) {
        if (!deniedSet.has(id)) effective.add(id);
      }
      for (const id of grantedSet) {
        effective.add(id);
      }
      setCheckedIds(effective);
      setIsDirty(false);
    }
  }, [permData]);

  const saveMutation = useMutation({
    mutationFn: (payload: SaveUserPermissionsPayload) =>
      saveUserPermissions(adminUser!.id, payload),
    onSuccess: () => {
      message.success('Đã lưu phân quyền!');
      setIsDirty(false);
      queryClient.invalidateQueries({
        queryKey: ['user-permissions', adminUser?.id]
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => message.error('Lưu thất bại!')
  });

  const togglePermission = (permId: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setIsDirty(true);
  };

  const toggleGroup = (perms: Permission[], checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    // Compute granted_ids & denied_ids from current checked state vs role
    const granted_ids: number[] = [];
    const denied_ids: number[] = [];

    for (const id of checkedIds) {
      // Checked but NOT in role → extra grant
      if (!rolePermIds.has(id)) granted_ids.push(id);
    }
    for (const id of rolePermIds) {
      // In role but NOT checked → denied
      if (!checkedIds.has(id)) denied_ids.push(id);
    }

    saveMutation.mutate({ granted_ids, denied_ids });
  };

  // Reset to role defaults
  const handleResetToRole = () => {
    setCheckedIds(new Set(rolePermIds));
    setIsDirty(true);
  };

  // Group permissions by module
  const sorted = [...allPermissions].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
  );
  const grouped: Record<string, Permission[]> = {};
  for (const perm of sorted) {
    const group = perm.module || perm.display_area || 'other';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(perm);
  }

  // Stats
  const totalEffective = checkedIds.size;
  const totalGranted = [...checkedIds].filter(
    (id) => !rolePermIds.has(id)
  ).length;
  const totalDenied = [...rolePermIds].filter(
    (id) => !checkedIds.has(id)
  ).length;
  const hasOverrides = totalGranted > 0 || totalDenied > 0;

  return (
    <Drawer
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-purple-200">
            <FaUserShield className="text-sm" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800 dark:text-white">
              Phân quyền cho Admin
            </div>
            <div className="text-xs font-normal text-gray-400">
              {adminUser?.name} — {adminUser?.phone}
            </div>
          </div>
        </div>
      }
      open={open}
      onClose={onClose}
      width={isMobile ? '100%' : 640}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">
                Hiệu lực: <strong>{totalEffective}</strong>
              </span>
            </div>
            {totalGranted > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500">
                  +{totalGranted} thêm
                </span>
              </div>
            )}
            {totalDenied > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-gray-500">
                  -{totalDenied} chặn
                </span>
              </div>
            )}
          </div>
          <Space>
            {isDirty && (
              <Tag color="warning" className="!rounded-lg">
                Chưa lưu
              </Tag>
            )}
            {hasOverrides && (
              <Tooltip title="Xóa tất cả quyền riêng, quay về đúng quyền của Role">
                <AppButton
                  tone="warning"
                  size="small"
                  onClick={handleResetToRole}
                >
                  Reset về Role
                </AppButton>
              </Tooltip>
            )}
            <AppButton tone="neutral" onClick={onClose}>
              Đóng
            </AppButton>
            <AppButton
              tone="primary"
              icon={<FiSave />}
              onClick={handleSave}
              loading={saveMutation.isPending}
              disabled={!isDirty}
            >
              {isDirty ? 'Lưu thay đổi' : 'Đã lưu'}
            </AppButton>
          </Space>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : (
        <div className="space-y-5">
          {/* User Info Header */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 p-4 dark:border-gray-700 dark:from-violet-900/10 dark:to-purple-900/10">
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-800 dark:text-white">
                {adminUser?.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                <code>{adminUser?.phone}</code>
                <span>•</span>
                <Tag
                  color={
                    adminUser?.role_name?.toLowerCase().includes('co')
                      ? 'geekblue'
                      : 'purple'
                  }
                  className="!m-0 !text-[10px]"
                >
                  {adminUser?.role_name}
                </Tag>
                {hasOverrides && (
                  <Tag color="orange" className="!m-0 !rounded-md !text-[9px]">
                    Có quyền riêng
                  </Tag>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-violet-600">
                {totalEffective}
              </div>
              <div className="text-[10px] text-gray-400">quyền hiệu lực</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/30">
            <span className="text-xs font-medium text-gray-500">
              Chú thích:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-purple-300 bg-purple-50" />
              <span className="text-xs text-gray-500">Từ Role</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-emerald-300 bg-emerald-50" />
              <span className="text-xs text-gray-500">Thêm riêng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-red-300 bg-red-50" />
              <span className="text-xs text-gray-500">Bị chặn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-gray-200 bg-white" />
              <span className="text-xs text-gray-500">Không có</span>
            </div>
          </div>

          {/* Permission Groups */}
          {Object.entries(grouped).map(([area, perms]) => {
            const areaEffective = perms.filter((p) =>
              checkedIds.has(p.id)
            ).length;
            const areaDenied = perms.filter(
              (p) => rolePermIds.has(p.id) && !checkedIds.has(p.id)
            ).length;
            const areaGranted = perms.filter(
              (p) => !rolePermIds.has(p.id) && checkedIds.has(p.id)
            ).length;
            const allChecked =
              perms.length > 0 && perms.every((p) => checkedIds.has(p.id));
            const someChecked = perms.some((p) => checkedIds.has(p.id));

            return (
              <div key={area} className="mb-4">
                <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                  <div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                      {area}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      ({areaEffective}/{perms.length}
                      {areaGranted > 0 && (
                        <span className="text-emerald-500">
                          {' '}
                          +{areaGranted}
                        </span>
                      )}
                      {areaDenied > 0 && (
                        <span className="text-red-500"> -{areaDenied}</span>
                      )}
                      )
                    </span>
                  </div>
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={(e) => toggleGroup(perms, e.target.checked)}
                  >
                    <span className="text-xs text-gray-500">Tất cả</span>
                  </Checkbox>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {perms.map((perm, idx) => {
                    const isRole = rolePermIds.has(perm.id);
                    const isChecked = checkedIds.has(perm.id);
                    const isDenied = isRole && !isChecked; // Quyền role nhưng bị chặn
                    const isGranted = !isRole && isChecked; // Quyền thêm riêng
                    const isRoleActive = isRole && isChecked; // Quyền role và đang bật

                    let borderColor = 'border-gray-100 dark:border-gray-700';
                    let bgColor =
                      'bg-white hover:border-gray-200 hover:bg-gray-50 dark:bg-gray-800/30 dark:hover:bg-gray-700/30';

                    if (isDenied) {
                      borderColor = 'border-red-200 dark:border-red-800';
                      bgColor =
                        'bg-red-50/50 hover:bg-red-50 dark:bg-red-900/10';
                    } else if (isRoleActive) {
                      borderColor = 'border-purple-200 dark:border-purple-700';
                      bgColor =
                        'bg-purple-50/60 hover:bg-purple-50 dark:bg-purple-900/15';
                    } else if (isGranted) {
                      borderColor =
                        'border-emerald-200 dark:border-emerald-700';
                      bgColor =
                        'bg-emerald-50/60 shadow-sm shadow-emerald-100 hover:bg-emerald-50 dark:bg-emerald-900/15';
                    }

                    return (
                      <label
                        key={perm.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${borderColor} ${bgColor}`}
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[10px] font-bold text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                          {idx + 1}
                        </span>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`font-medium ${isDenied ? 'text-red-400 line-through dark:text-red-500' : isChecked ? 'text-gray-800 dark:text-white/90' : 'text-gray-500 dark:text-gray-400'}`}
                          >
                            {perm.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <code className="text-[10px]">{perm.key}</code>
                            {isRoleActive && (
                              <Tag
                                className="!m-0 !rounded-md !px-1 !text-[9px] !leading-4"
                                color="purple"
                              >
                                Role
                              </Tag>
                            )}
                            {isGranted && (
                              <Tag
                                className="!m-0 !rounded-md !px-1 !text-[9px] !leading-4"
                                color="green"
                              >
                                +Thêm
                              </Tag>
                            )}
                            {isDenied && (
                              <Tag
                                className="!m-0 !rounded-md !px-1 !text-[9px] !leading-4"
                                color="red"
                              >
                                Chặn
                              </Tag>
                            )}
                          </div>
                        </div>
                        <Tag
                          className="shrink-0 !rounded-md !text-[10px]"
                          color={
                            perm.type === 'admin'
                              ? 'purple'
                              : perm.type === 'employee'
                                ? 'green'
                                : 'gold'
                          }
                        >
                          {perm.type === 'admin'
                            ? 'Admin'
                            : perm.type === 'employee'
                              ? 'NV'
                              : 'Chung'}
                        </Tag>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 3: Quản lý Admin
// ─────────────────────────────────────────────────────────────────────────────

function AdminManager() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'admin' | 'co-admin' | undefined
  >(undefined);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [permDrawerUser, setPermDrawerUser] = useState<AdminUser | null>(null);

  // Fetch admin list
  const { data: adminData, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => fetchAdminUsers(search || undefined, roleFilter)
  });
  const adminUsers = adminData?.admin_users ?? [];

  // Create mutation
  const createMut = useMutation({
    mutationFn: (values: CreateAdminUserPayload) => createAdminUser(values),
    onSuccess: (res) => {
      message.success(res?.message || 'Tạo thành công!');
      form.resetFields();
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      message.error(getApiErrorMessage(error));
    }
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: (res) => {
      message.success(res?.message || 'Đã xoá!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      const axiosErr = error as {
        response?: { data?: { message?: string }; status?: number };
      };
      message.error(axiosErr?.response?.data?.message || 'Xoá thất bại!');
    }
  });

  const columns: TableColumnsType<AdminUser> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 100,
      render: (v: string) => <code className="text-xs">{v}</code>
    },
    { title: 'Họ tên', dataIndex: 'name', ellipsis: true },
    {
      title: 'Tài khoản',
      dataIndex: 'phone',
      width: 180,
      render: (v: string) => <code className="font-mono text-xs">{v}</code>
    },
    {
      title: 'Vai trò',
      dataIndex: 'role_name',
      width: 110,
      align: 'center',
      render: (v: string) => (
        <Tag color={v?.toLowerCase().includes('co') ? 'geekblue' : 'purple'}>
          {v || 'Admin'}
        </Tag>
      )
    },
    {
      title: 'Quyền riêng',
      dataIndex: 'direct_permissions_count',
      width: 100,
      align: 'center',
      render: (v: number | undefined) => {
        if (v && v > 0) return <Badge count={v} color="#10b981" />;
        return <span className="text-xs text-gray-300">—</span>;
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      width: 140,
      render: (v: string) =>
        v
          ? new Date(v).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          : '—'
    },
    {
      title: '',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_: unknown, record: AdminUser) => {
        const isSelf = record.id === user?.id?.toString();
        return (
          <Space size={2}>
            <Tooltip title="Phân quyền trực tiếp">
              <AppButton
                type="text"
                size="small"
                icon={<FaUserShield className="text-violet-500" />}
                onClick={() => setPermDrawerUser(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Xoá tài khoản này?"
              description={`${record.name} (${record.phone})`}
              onConfirm={() => deleteMut.mutate(record.id)}
              okText="Xoá"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              disabled={isSelf}
            >
              <Tooltip title={isSelf ? 'Không thể xoá chính mình' : 'Xoá'}>
                <AppButton
                  type="text"
                  size="small"
                  icon={<FaTrash />}
                  danger
                  disabled={isSelf}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
        <AppButton
          tone="purple"
          icon={<FiPlus />}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Ẩn form' : 'Tạo Admin'}
        </AppButton>
        <div className="ml-auto flex items-center gap-3">
          <Select
            placeholder="Tất cả"
            allowClear
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
            options={[
              { label: 'Admin', value: 'admin' },
              { label: 'Co Admin', value: 'co-admin' }
            ]}
            className="!w-32"
          />
          <AppSearchInput
            placeholder="Tìm tên, tài khoản..."
            onPressEnter={(e) =>
              setSearch((e.target as HTMLInputElement).value)
            }
            onChange={(e) => {
              if (!e.target.value) setSearch('');
            }}
            className="!w-full sm:!w-56"
          />
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <FaUsers className="text-xs text-slate-500" />
            <span className="text-xs text-gray-500">
              Tổng:{' '}
              <strong className="text-slate-600">
                {adminData?.total ?? 0}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Create Form (collapsible) */}
      {showCreateForm && (
        <div className="max-w-lg rounded-xl border border-gray-100 bg-white/80 p-5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <Form
            form={form}
            layout="inline"
            onFinish={(values) => createMut.mutate(values)}
            className="!flex-wrap !gap-3"
          >
            <Form.Item
              name="name"
              rules={[
                { required: true, whitespace: true, message: 'Bắt buộc' },
                { max: 255, message: 'Họ tên tối đa 255 ký tự' }
              ]}
              className="!mb-0 !flex-1"
            >
              <Input placeholder="Nhập họ tên..." className="!rounded-lg" />
            </Form.Item>
            <Form.Item name="role" className="!mb-0" initialValue="admin">
              <Select
                options={[
                  { label: 'Admin', value: 'admin' },
                  { label: 'Co Admin', value: 'co-admin' }
                ]}
                className="!w-28"
              />
            </Form.Item>
            <AppButton
              type="primary"
              htmlType="submit"
              icon={<FiSave />}
              loading={createMut.isPending}
            >
              Tạo
            </AppButton>
          </Form>
        </div>
      )}

      {/* Admin List Table */}
      {isMobile ? (
        <Spin spinning={isLoading}>
          {adminUsers.length === 0 && !isLoading ? (
            <Empty description="Không có admin nào" />
          ) : (
            <div className="flex flex-col gap-3">
              {adminUsers.map((record, index) => {
                const isSelf = record.id === user?.id?.toString();
                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {record.name}
                          </span>
                          <Tag
                            color={
                              record.role_name?.toLowerCase().includes('co')
                                ? 'geekblue'
                                : 'purple'
                            }
                            className="!m-0 !text-[10px]"
                          >
                            {record.role_name || 'Admin'}
                          </Tag>
                        </div>
                        <code className="font-mono text-[11px] text-gray-400">
                          {record.phone}
                        </code>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                      <span>
                        {record.created_at
                          ? new Date(record.created_at).toLocaleDateString(
                              'vi-VN',
                              {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              }
                            )
                          : '—'}
                      </span>
                      {(record.direct_permissions_count ?? 0) > 0 && (
                        <Badge
                          count={record.direct_permissions_count}
                          color="#10b981"
                        />
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                      <AppButton
                        type="text"
                        size="small"
                        icon={<FaUserShield className="text-violet-500" />}
                        onClick={() => setPermDrawerUser(record)}
                      >
                        Quyền
                      </AppButton>
                      <Popconfirm
                        title="Xoá tài khoản này?"
                        description={`${record.name} (${record.phone})`}
                        onConfirm={() => deleteMut.mutate(record.id)}
                        okText="Xoá"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        disabled={isSelf}
                      >
                        <AppButton
                          type="text"
                          size="small"
                          icon={<FaTrash />}
                          danger
                          disabled={isSelf}
                        >
                          Xoá
                        </AppButton>
                      </Popconfirm>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Spin>
      ) : (
        <Table<AdminUser>
          {...(customTableProps as unknown as TableProps<AdminUser>)}
          columns={columns}
          dataSource={adminUsers}
          rowKey="id"
          loading={isLoading}
        />
      )}

      {/* User Permission Drawer */}
      <UserPermissionDrawer
        adminUser={permDrawerUser}
        open={!!permDrawerUser}
        onClose={() => setPermDrawerUser(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RBACPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  if (!isAllowRole(user, ['super admin'])) {
    return (
      <ComponentCard title="Không có quyền">
        <Empty description="Bạn không có quyền truy cập trang này." />
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Quản lý phân quyền (RBAC)">
      <div className="space-y-5">
        {/* ── Action Bar ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-blue-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-white">
              {isMobile ? 'RBAC' : 'Hệ thống phân quyền RBAC'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <span className="text-xs text-gray-500">
              👤 {user?.name || 'Super Admin'}
            </span>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <Tabs
          defaultActiveKey="roles"
          type={isMobile ? 'line' : 'card'}
          size={isMobile ? 'small' : 'large'}
          animated
          tabBarStyle={isMobile ? { marginBottom: 12 } : undefined}
          items={[
            {
              key: 'roles',
              label: (
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FaShieldAlt className="text-blue-500" />{' '}
                  {isMobile ? 'Quyền' : 'Phân quyền'}
                </span>
              ),
              children: <RolePermissionManager />
            },
            {
              key: 'permissions',
              label: (
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FaKey className="text-amber-500" />{' '}
                  {isMobile ? 'QL Quyền' : 'Quản lý quyền & Sidebar'}
                </span>
              ),
              children: <PermissionsManager />
            },
            {
              key: 'admin-users',
              label: (
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FaUsers className="text-slate-500" />{' '}
                  {isMobile ? 'Admin' : 'Quản lý Admin'}
                </span>
              ),
              children: <AdminManager />
            }
          ]}
        />
      </div>
    </ComponentCard>
  );
}
