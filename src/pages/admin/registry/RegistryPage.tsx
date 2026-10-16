import AppSearchInput from '@/components/common/AppSearchInput';
import { useQuery } from '@tanstack/react-query';
import { Select, Table, Tag, Tooltip, message } from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import { useMemo, useState, useCallback } from 'react';
import { FaCopy, FaSearch, FaServer } from 'react-icons/fa';
import { FiCheck, FiX, FiAlertTriangle, FiFilter } from 'react-icons/fi';

import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import { fetchRegistry, type RegistryRoute } from '@services/RegistryService';

// ─── Config ─────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: '#dcfce7', text: '#16a34a' },
  POST: { bg: '#dbeafe', text: '#2563eb' },
  PUT: { bg: '#ffedd5', text: '#ea580c' },
  PATCH: { bg: '#fef9c3', text: '#ca8a04' },
  DELETE: { bg: '#fee2e2', text: '#dc2626' }
};

const USER_TYPE_CFG: Record<string, { color: string; label: string }> = {
  public: { color: 'default', label: 'Public' },
  authenticated: { color: 'processing', label: 'Auth' },
  admin: { color: 'purple', label: 'Admin' },
  employee: { color: 'success', label: 'Employee' },
  super_admin: { color: 'warning', label: 'Super Admin' }
};

const MODULE_EMOJI: Record<string, string> = {
  auth: '🔐',
  profile: '👤',
  dashboard: '📊',
  employees: '👥',
  'request-forms': '📝',
  attendances: '📅',
  roles: '🎭',
  logs: '📋',
  salaries: '💰',
  'schedule-categories': '📁',
  schedules: '🗓️',
  products: '📦',
  quantities: '🔢',
  stamps: '🎫',
  'daily-schedules': '⏰',
  history: '🕐',
  'check-stamp': '✅',
  'check-po': '📑',
  upload: '📤',
  notifications: '🔔',
  'stock-transactions': '📊',
  feedbacks: '💬',
  rbac: '🛡️',
  permissions: '🔑',
  registry: '📡',
  'employee/schedules': '📆',
  'employee/salaries': '💵',
  'employee/attendances': '⏱️',
  'employee/daily-activities': '📌',
  'employee/todos': '✏️',
  'employee/request-forms': '📄',
  'employee/stamps': '🏷️',
  'employee/feedbacks': '💭',
  'acs-events': '📡',
  'cleaning-duties': '🧹'
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface ModuleGroup {
  module: string;
  routes: RegistryRoute[];
  totalRoutes: number;
  doneCount: number;
  missingCount: number;
  userTypes: string[];
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RegistryPage() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();
  const [userTypeFilter, setUserTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['api-registry'],
    queryFn: () => fetchRegistry()
  });

  const routes = useMemo(() => data?.routes ?? [], [data?.routes]);
  const modules = useMemo(() => data?.modules ?? [], [data?.modules]);

  // Copy handler
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success({ content: 'Đã copy!', duration: 1 });
    });
  }, []);

  // Client-side filter
  const filtered = useMemo(() => {
    let result = routes;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.uri.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.module.toLowerCase().includes(q) ||
          r.permission?.toLowerCase().includes(q)
      );
    }
    if (moduleFilter) result = result.filter((r) => r.module === moduleFilter);
    if (userTypeFilter)
      result = result.filter((r) => r.user_type === userTypeFilter);
    if (statusFilter)
      result = result.filter((r) => r.be_status === statusFilter);
    return result;
  }, [routes, search, moduleFilter, userTypeFilter, statusFilter]);

  // Group by module
  const groupedData = useMemo<ModuleGroup[]>(() => {
    const map: Record<string, RegistryRoute[]> = {};
    for (const r of filtered) {
      if (!map[r.module]) map[r.module] = [];
      map[r.module].push(r);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mod, modRoutes]) => ({
        module: mod,
        routes: modRoutes,
        totalRoutes: modRoutes.length,
        doneCount: modRoutes.filter((r) => r.be_status === 'done').length,
        missingCount: modRoutes.filter((r) => r.be_status !== 'done').length,
        userTypes: [...new Set(modRoutes.map((r) => r.user_type))]
      }));
  }, [filtered]);

  // Stats
  const totalDone = useMemo(
    () => routes.filter((r) => r.be_status === 'done').length,
    [routes]
  );
  const totalMissing = routes.length - totalDone;

  // ─── Module (parent) table columns ────────────────────────────────

  const moduleColumns: TableColumnsType<ModuleGroup> = [
    {
      title: 'STT',
      key: 'index',
      width: 55,
      align: 'center',
      render: (_: unknown, __: ModuleGroup, index: number) => (
        <span className="font-mono text-xs text-gray-400">{index + 1}</span>
      )
    },
    {
      title: 'Module',
      dataIndex: 'module',
      sorter: (a, b) => a.module.localeCompare(b.module),
      render: (mod: string) => (
        <div className="flex items-center gap-2">
          <span className="text-base">{MODULE_EMOJI[mod] ?? '📂'}</span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {mod}
          </span>
        </div>
      )
    },
    {
      title: 'Routes',
      dataIndex: 'totalRoutes',
      width: 85,
      align: 'center',
      sorter: (a, b) => a.totalRoutes - b.totalRoutes,
      render: (count: number) => (
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          {count}
        </span>
      )
    },
    {
      title: 'User Types',
      dataIndex: 'userTypes',
      width: 200,
      responsive: ['md'],
      render: (types: string[]) => (
        <div className="flex flex-wrap gap-1">
          {types.sort().map((t) => {
            const cfg = USER_TYPE_CFG[t] ?? { color: 'default', label: t };
            return (
              <Tag
                key={t}
                color={cfg.color}
                className="!m-0 !rounded-md !border-0 !text-[10px] !font-semibold"
              >
                {cfg.label}
              </Tag>
            );
          })}
        </div>
      )
    },
    {
      title: 'BE Status',
      key: 'status',
      width: 140,
      align: 'center',
      sorter: (a, b) =>
        a.doneCount / a.totalRoutes - b.doneCount / b.totalRoutes,
      render: (_: unknown, record: ModuleGroup) => {
        const pct = record.totalRoutes
          ? Math.round((record.doneCount / record.totalRoutes) * 100)
          : 0;
        const allDone = record.doneCount === record.totalRoutes;
        return (
          <div className="flex items-center gap-2">
            <div className="h-[6px] w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              className={`text-xs font-bold ${allDone ? 'text-emerald-500' : 'text-amber-500'}`}
            >
              {record.doneCount}/{record.totalRoutes}
            </span>
          </div>
        );
      }
    }
  ];

  // ─── Expanded row render ──────────────────────────────────────────

  const expandedRowRender = (record: ModuleGroup) => (
    <div className="bg-slate-50/50 dark:bg-slate-800/20">
      {/* Column headers */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-1.5 text-[9px] font-bold tracking-widest text-gray-300 uppercase sm:gap-3 sm:px-5 dark:border-gray-700/50 dark:text-gray-600">
        <span className="w-[56px] shrink-0 text-center">Method</span>
        <span className="min-w-0 flex-1">URI</span>
        <span className="hidden w-[80px] shrink-0 text-center sm:block">
          Type
        </span>
        <span className="hidden w-[150px] shrink-0 lg:block">Permission</span>
        <span className="w-[40px] shrink-0 text-center">BE</span>
      </div>
      {/* Route rows */}
      {record.routes.map((route, idx) => {
        const userCfg = USER_TYPE_CFG[route.user_type] ?? {
          color: 'default',
          label: route.user_type
        };
        const isDone = route.be_status === 'done';
        return (
          <div
            key={`${route.uri}-${route.methods.join(',')}-${idx}`}
            className="group/row flex items-center gap-2 border-b border-gray-100/60 px-4 py-[6px] transition-colors last:border-b-0 hover:bg-white sm:gap-3 sm:px-5 dark:border-gray-700/30 dark:hover:bg-gray-800/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Method */}
            <div className="flex w-[56px] shrink-0 flex-col items-center gap-[2px]">
              {route.methods.map((m) => {
                const c = METHOD_COLORS[m] ?? {
                  bg: '#f3f4f6',
                  text: '#6b7280'
                };
                return (
                  <span
                    key={m}
                    className="inline-block w-[50px] rounded-md py-[2px] text-center font-mono text-[10px] font-extrabold"
                    style={{ backgroundColor: c.bg, color: c.text }}
                  >
                    {m}
                  </span>
                );
              })}
            </div>
            {/* URI + copy */}
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <span className="truncate font-mono text-[12px] text-gray-600 dark:text-gray-300">
                {route.uri.split(/(\{[^}]+\})/g).map((p, i) =>
                  p.startsWith('{') ? (
                    <span
                      key={i}
                      className="rounded bg-amber-50 px-0.5 font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                    >
                      {p}
                    </span>
                  ) : (
                    <span key={i}>{p}</span>
                  )
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(route.uri);
                }}
                className="shrink-0 cursor-pointer border-0 bg-transparent p-0.5 text-gray-200 opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-blue-500 dark:text-gray-600"
                title="Copy"
              >
                <FaCopy className="text-[9px]" />
              </button>
            </div>
            {/* User type */}
            <div className="hidden w-[80px] shrink-0 text-center sm:block">
              <Tag
                color={userCfg.color}
                className="!m-0 !rounded-md !border-0 !text-[10px] !font-semibold"
              >
                {userCfg.label}
              </Tag>
            </div>
            {/* Permission */}
            <div className="hidden w-[150px] shrink-0 truncate lg:block">
              {route.permission ? (
                <Tooltip title={route.permission}>
                  <code className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-500 dark:bg-violet-500/10 dark:text-violet-400">
                    {route.permission}
                  </code>
                </Tooltip>
              ) : (
                <span className="text-[10px] text-gray-200 dark:text-gray-600">
                  —
                </span>
              )}
            </div>
            {/* BE Status */}
            <div className="flex w-[40px] shrink-0 items-center justify-center">
              {isDone ? (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20">
                  <FiCheck className="text-[11px]" />
                </span>
              ) : route.be_status === 'missing' ? (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-400 dark:bg-red-900/20">
                  <FiX className="text-[11px]" />
                </span>
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-400 dark:bg-amber-900/20">
                  <FiAlertTriangle className="text-[10px]" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── Parent table props ───────────────────────────────────────────

  const tableProps: TableProps<ModuleGroup> = {
    ...(customTableProps as unknown as TableProps<ModuleGroup>),
    rowKey: 'module',
    columns: moduleColumns,
    dataSource: groupedData,
    loading: isLoading,
    scroll: undefined,
    tableLayout: 'fixed',
    expandable: {
      expandedRowRender,
      expandedRowKeys: expandedKeys,
      onExpand: (expanded, record) => {
        setExpandedKeys((prev) =>
          expanded
            ? [...prev, record.module]
            : prev.filter((k) => k !== record.module)
        );
      },
      expandRowByClick: true,
      expandIcon: () => null,
      columnWidth: 0,
      columnTitle: <></>
    },
    onRow: () => ({
      style: { cursor: 'pointer' }
    }),
    pagination: {
      ...customTableProps.pagination,
      pageSize: 50,
      showSizeChanger: true,
      pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <ComponentCard title="API Registry">
      <div className="space-y-5">
        {/* ── Action Bar ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <div className="flex items-center gap-3">
            <RefreshButton isLoading={isFetching} refresh={refetch} />

            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <FaServer className="text-xs text-indigo-400" />
              <span className="text-xs text-gray-500">
                Tổng:{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {routes.length}
                </strong>{' '}
                routes ·{' '}
                <strong className="text-blue-600 dark:text-blue-400">
                  {modules.length}
                </strong>{' '}
                modules
              </span>
            </div>

            <div className="hidden items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 sm:flex dark:border-gray-600 dark:bg-gray-800">
              <span className="text-xs text-gray-500">
                ✅ <strong className="text-emerald-600">{totalDone}</strong>
                {totalMissing > 0 && (
                  <>
                    {' · '}❌{' '}
                    <strong className="text-red-400">{totalMissing}</strong>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaSearch className="mr-1 inline-block text-gray-400" />
                Tìm kiếm
              </label>
              <AppSearchInput
                placeholder="URI, permission, action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FiFilter className="mr-1 inline-block text-blue-400" />
                Module
              </label>
              <Select
                placeholder="Tất cả modules"
                allowClear
                showSearch
                value={moduleFilter}
                onChange={setModuleFilter}
                options={modules.map((m) => ({
                  label: `${MODULE_EMOJI[m] ?? '📂'} ${m}`,
                  value: m
                }))}
                className="!rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FiFilter className="mr-1 inline-block text-purple-400" />
                User Type
              </label>
              <Select
                placeholder="Tất cả"
                allowClear
                value={userTypeFilter}
                onChange={setUserTypeFilter}
                options={Object.entries(USER_TYPE_CFG).map(([v, c]) => ({
                  label: c.label,
                  value: v
                }))}
                className="!rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FiFilter className="mr-1 inline-block text-emerald-400" />
                BE Status
              </label>
              <Select
                placeholder="Tất cả"
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: '✅ Done', value: 'done' },
                  { label: '❌ Missing', value: 'missing' },
                  { label: '⚠️ Unknown', value: 'unknown' }
                ]}
                className="!rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* ── Grouped Table ─────────────────────────────────────────── */}
        <Table<ModuleGroup> {...tableProps} />
      </div>
    </ComponentCard>
  );
}
