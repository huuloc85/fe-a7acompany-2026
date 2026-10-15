import type { MenuItem } from '@/types/menuItem';
import { DefaultIcon } from '@/types/menuItem';
import { Permission } from '@/types/permissionType';
import { IconEdit, IconLogOut, IconShield } from '@components/icons';
import { useAuth } from '@hooks/useAuth';
import { authLogout } from '@services/AuthService';
import { toggleSidebar, uiStore } from '@stores/uiStore';
import { Link, useNavigate } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { finishLogoutRedirect, startLogoutRedirect } from '@utils/authRedirect';
import {
  canViewTotalWorkSchedules,
  isAdmin as isAdminRole,
  isAllowRole
} from '@utils/authUtil';
import { Drawer, Layout, message } from 'antd';
import React, { useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { SidebarMenu } from './SidebarMenu';
import { HiOutlineHome } from 'react-icons/hi';
import { FaCommentDots, FaFlask, FaServer, FaTerminal } from 'react-icons/fa';
import FeedbackDrawer from '@components/feedback/FeedbackDrawer';

const { Sider } = Layout;

const normalizeLegacySidebarUrl = (url?: string | null): string => {
  if (!url) return '/';
  if (url === '/admin/work-schedule-categories') {
    return '/work-schedules?tab=categories';
  }
  return url;
};

function Sidebar() {
  const navigate = useNavigate();
  const { appearance, isSidebarClose, isMobile } = useStore(uiStore);
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const isLiquidAppearance = appearance === 'liquid';

  const permissions = useMemo(() => user?.permissions ?? [], [user]);

  const isSuperAdmin = isAllowRole(user, ['super admin']);
  const isAdmin = isAdminRole(user?.role.name || '');

  // 🔧 mapper: từ string FA class → react-icons component
  const mapFaClassToIconType = (faClass?: string): IconType | null => {
    if (!faClass) return null;

    const parts = faClass.split(/\s+/).filter(Boolean);
    const raw = parts.find(
      (p) => p.startsWith('fa-') && !/^fa[brlsd]?$/i.test(p)
    );
    if (!raw) return null;

    const base = raw.replace(/^fa-/, '');

    const toPascal = (s: string) =>
      s
        .split('-')
        .map((t) => (t ? t[0].toUpperCase() + t.slice(1) : ''))
        .join('');

    const candidates: string[] = [];
    candidates.push('Fa' + toPascal(base));

    const rules: Array<(s: string) => string | null> = [
      (s) => s.replace('trash-can', 'trash'),
      (s) => s.replace('user-group', 'users'),
      (s) => s.replace('arrows-rotate', 'sync'),
      (s) => s.replace('right-left', 'exchange-alt'),
      (s) => s.replace('circle-check', 'check-circle'),
      (s) => s.replace('circle-xmark', 'times-circle'),
      (s) => s.replace('circle-info', 'info-circle'),
      (s) => (s.includes('sheet-plastic') ? 'file-invoice' : s),
      (s) => (s.includes('sheet-plastic') ? 'file-alt' : s),
      (s) => s.replace('file-lines', 'file-alt'),
      (s) => s.replace('calendar-days', 'calendar-alt'),
      (s) => s.replace('arrow-rotate-right', 'redo'),
      (s) => s.replace('arrow-rotate-left', 'undo')
    ];

    rules.forEach((transform) => {
      const t = transform(base);
      if (t && t !== base) {
        candidates.push('Fa' + toPascal(t));
      }
    });

    if (/-alt$/.test(base)) {
      candidates.push('Fa' + toPascal(base.replace(/-alt$/, '')));
    }
    if (/-o$/.test(base)) {
      candidates.push('Fa' + toPascal(base.replace(/-o$/, '')));
    }
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

  const dashboardItems: MenuItem[] = [
    {
      key: '/',
      label: (
        <Link to={'/'}>
          <span className="capitalize">Trang chủ</span>
        </Link>
      ),
      icon: <HiOutlineHome className="text-lg" />
    }
  ];

  const supervisorItems: MenuItem[] = useMemo(() => {
    return [];
  }, []);

  const items: MenuItem[] = useMemo(() => {
    const renderSidebarIcon = (icon?: string | IconType) => {
      if (typeof icon !== 'string' && icon) {
        const IconComp = icon as IconType;
        return <IconComp className="text-lg" />;
      }

      if (typeof icon === 'string') {
        const Mapped = mapFaClassToIconType(icon);
        if (Mapped) return <Mapped className="text-lg" />;
        return <i className={`${icon} text-lg`} />;
      }

      return <DefaultIcon className="text-lg" />;
    };

    const renderPermissionIcon = (perm: Permission) => {
      if (perm.icon) return renderSidebarIcon(perm.icon);

      const first = perm.sidebar_items?.[0];
      if (first?.icon) return renderSidebarIcon(first.icon);

      return <DefaultIcon className="text-lg" />;
    };

    const rbacItems = permissions
      .filter((p) => ['sidebar', 'both'].includes(p.display_area))
      .map((perm) => {
        if (perm.sidebar_items?.length > 0) {
          return {
            key: perm.key,
            label: <span className="capitalize">{perm.name}</span>,
            icon: renderPermissionIcon(perm),
            children: perm.sidebar_items.map((item) => ({
              key: item.key,
              label: (
                <Link to={normalizeLegacySidebarUrl(item.url) as string}>
                  <span className="capitalize">
                    {item.url === '/admin/request-forms'
                      ? 'Đơn Xin Phép'
                      : item.title}
                  </span>
                </Link>
              ),
              icon: renderSidebarIcon(item.icon)
            }))
          };
        }

        return {
          key: perm.key,
          label: (
            <Link to={normalizeLegacySidebarUrl(perm.url) as string}>
              <span className="capitalize">
                {perm.url === '/admin/request-forms'
                  ? 'Đơn Xin Phép'
                  : perm.name}
              </span>
            </Link>
          ),
          icon: renderPermissionIcon(perm)
        };
      });

    const alreadyHasWorkSchedules = rbacItems.some((item) => {
      if (!item || typeof item !== 'object') return false;
      return item.key === 'work-schedules';
    });

    if (!alreadyHasWorkSchedules && canViewTotalWorkSchedules(user)) {
      rbacItems.push({
        key: 'work-schedules',
        label: (
          <Link to="/work-schedules">
            <span className="capitalize">Lịch Làm Việc Tổng</span>
          </Link>
        ),
        icon: <FaIcons.FaUsers className="text-lg" />
      });
    }

    return rbacItems;
  }, [permissions, user]);

  const sidebarStyle: React.CSSProperties = {
    overflow: 'hidden',
    height: '100dvh',
    position: 'fixed',
    insetInlineStart: 0,
    top: 0,
    bottom: 0,
    zIndex: 900,
    scrollbarWidth: 'none',
    background: 'transparent',
    borderRight: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow-soft)',
    backdropFilter: 'blur(22px) saturate(165%)',
    WebkitBackdropFilter: 'blur(22px) saturate(165%)'
  };

  const sidebarContent = (
    <>
      <SidebarMenu items={[...dashboardItems, ...supervisorItems, ...items]} />

      {/* ── Admin Tools ──────────────────────────────────── */}
      {isSuperAdmin && (
        <div className="mx-2.5 mt-1 mb-2">
          <div className="mx-3 mb-2 h-px bg-gradient-to-r from-transparent via-gray-200/80 to-transparent dark:via-gray-700/60" />
          {!isSidebarClose && (
            <p className="mb-1 px-3 text-[10px] font-semibold tracking-widest text-gray-300 uppercase dark:text-gray-600">
              Quản trị
            </p>
          )}
          <div className="space-y-0.5">
            <Link to="/admin/rbac" className="block no-underline">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-black/80 transition-all duration-200 hover:bg-gray-50 hover:text-black active:scale-[0.98] dark:text-gray-200 dark:hover:bg-white/5 dark:hover:text-white">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-500 dark:text-gray-400">
                  <IconShield />
                </span>
                {!isSidebarClose && <span>Phân quyền</span>}
              </div>
            </Link>
            <Link to="/admin/edit-layout" className="block no-underline">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-black/80 transition-all duration-200 hover:bg-gray-50 hover:text-black active:scale-[0.98] dark:text-gray-200 dark:hover:bg-white/5 dark:hover:text-white">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-500 dark:text-gray-400">
                  <IconEdit />
                </span>
                {!isSidebarClose && <span>Chỉnh giao diện</span>}
              </div>
            </Link>
            <Link to="/admin/registry" className="block no-underline">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-black/80 transition-all duration-200 hover:bg-gray-50 hover:text-black active:scale-[0.98] dark:text-gray-200 dark:hover:bg-white/5 dark:hover:text-white">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-500 dark:text-gray-400">
                  <FaServer />
                </span>
                {!isSidebarClose && <span>API Registry</span>}
              </div>
            </Link>
            <Link to="/admin/system-logs" className="block no-underline">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-black/80 transition-all duration-200 hover:bg-gray-50 hover:text-black active:scale-[0.98] dark:text-gray-200 dark:hover:bg-white/5 dark:hover:text-white">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-500 dark:text-gray-400">
                  <FaTerminal />
                </span>
                {!isSidebarClose && <span>Nhật ký hệ thống</span>}
              </div>
            </Link>
            <Link to="/admin/notification-demo" className="block no-underline">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-black/80 transition-all duration-200 hover:bg-gray-50 hover:text-black active:scale-[0.98] dark:text-gray-200 dark:hover:bg-white/5 dark:hover:text-white">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-500 dark:text-gray-400">
                  <FaFlask />
                </span>
                {!isSidebarClose && <span>Test modal</span>}
              </div>
            </Link>
          </div>
        </div>
      )}
    </>
  );

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      startLogoutRedirect();
      message.loading({
        content: 'Đang đăng xuất...',
        key: 'logout',
        duration: 0.5
      });

      await navigate({ to: '/login', replace: true });
      await authLogout();

      message.success({
        content: 'Đăng xuất thành công!',
        key: 'logout',
        duration: 1
      });
    } catch (error) {
      console.error('Logout error:', error);
      message.error({
        content: 'Đã đăng xuất',
        key: 'logout',
        duration: 1
      });
    } finally {
      finishLogoutRedirect();
      setIsLoggingOut(false);
    }
  };

  // ── Logout Button (desktop) ──
  const logoutButton = (
    <div className={`${isMobile ? '' : 'px-2.5 pb-4'}`}>
      <div className="mx-3 mb-2 h-px bg-gradient-to-r from-transparent via-gray-200/80 to-transparent dark:via-gray-700/60" />
      {!isAdmin && (
        <button
          onClick={() => setFeedbackOpen(true)}
          className="mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-black/80 transition-all duration-200 hover:bg-blue-50/60 hover:text-blue-600 active:scale-[0.98] dark:text-gray-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-blue-500">
            <FaCommentDots />
          </span>
          {!isSidebarClose && <span>Góp ý</span>}
        </button>
      )}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-red-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:opacity-50 dark:text-red-400/70 dark:hover:bg-red-900/10 dark:hover:text-red-400"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px]">
          <IconLogOut />
        </span>
        {!isSidebarClose && (
          <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
        )}
      </button>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          rootClassName={`app-sidebar-drawer ${
            isLiquidAppearance
              ? 'app-sidebar-drawer--liquid'
              : 'app-sidebar-drawer--classic'
          }`}
          closable={false}
          width={300}
          placement="left"
          onClose={toggleSidebar}
          open={!isSidebarClose}
          styles={{
            body: { padding: 0 },
            wrapper: { boxShadow: '4px 0 24px rgba(0,0,0,0.06)' }
          }}
        >
          <div className="app-sidebar-mobile liquid-glass-panel flex h-full flex-col rounded-none">
            {/* ── Menu (reuse SidebarMenu — logo is inside) ── */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              <SidebarMenu
                items={[...dashboardItems, ...supervisorItems, ...items]}
                headerSlot={
                  <div className="px-5 pt-1 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        {user?.image_url ? (
                          <img
                            src={user.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-black/60 dark:text-gray-300">
                            {user?.name?.replace(/[()]/g, '').charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-black dark:text-white">
                          {user?.name?.replace(/[()]/g, '').trim() ||
                            'Người dùng'}
                        </p>
                        <p className="truncate text-xs text-black/40 dark:text-gray-500">
                          {user?.role?.name || 'Nhân viên'}
                        </p>
                      </div>
                    </div>
                  </div>
                }
              />

              {/* ── Admin Tools ── */}
              {isSuperAdmin && (
                <div className="mx-2.5 mt-1 mb-2">
                  <div className="mx-3 mb-2 h-px bg-gradient-to-r from-transparent via-gray-200/80 to-transparent dark:via-gray-700/60" />
                  <p className="mb-1 px-3 text-[10px] font-semibold tracking-widest text-gray-300 uppercase dark:text-gray-600">
                    Quản trị
                  </p>
                  <div className="space-y-0.5">
                    <Link
                      to="/admin/rbac"
                      onClick={toggleSidebar}
                      className="block no-underline"
                    >
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-400">
                          <IconShield />
                        </span>
                        <span>Phân quyền</span>
                      </div>
                    </Link>
                    <Link
                      to="/admin/edit-layout"
                      onClick={toggleSidebar}
                      className="block no-underline"
                    >
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-400">
                          <IconEdit />
                        </span>
                        <span>Chỉnh giao diện</span>
                      </div>
                    </Link>
                    <Link
                      to="/admin/registry"
                      onClick={toggleSidebar}
                      className="block no-underline"
                    >
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-400">
                          <FaServer />
                        </span>
                        <span>API Registry</span>
                      </div>
                    </Link>
                    <Link
                      to="/admin/system-logs"
                      onClick={toggleSidebar}
                      className="block no-underline"
                    >
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-400">
                          <FaTerminal />
                        </span>
                        <span>Nhật ký hệ thống</span>
                      </div>
                    </Link>
                    <Link
                      to="/admin/notification-demo"
                      onClick={toggleSidebar}
                      className="block no-underline"
                    >
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-gray-400">
                          <FaFlask />
                        </span>
                        <span>Test modal</span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bottom actions ── */}
            <div className="px-4 pb-4">
              <div className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-gray-200/80 to-transparent dark:via-gray-700/60" />
              {!isAdmin && (
                <button
                  onClick={() => {
                    toggleSidebar();
                    setFeedbackOpen(true);
                  }}
                  className="mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-black/80 transition-all duration-200 hover:bg-blue-50/60 hover:text-blue-600 active:scale-[0.98] dark:text-gray-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-blue-500">
                    <FaCommentDots />
                  </span>
                  <span>Góp ý</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-red-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:opacity-50 dark:text-red-400/70 dark:hover:bg-red-900/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px]">
                  <IconLogOut />
                </span>
                <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
              </button>
            </div>
          </div>
        </Drawer>
      ) : (
        <Sider
          className="app-sidebar-sider liquid-glass-panel"
          style={sidebarStyle}
          width={256}
          trigger={null}
          breakpoint="md"
          collapsible
          collapsed={isSidebarClose}
          onCollapse={toggleSidebar}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                scrollbarWidth: 'none'
              }}
            >
              {sidebarContent}
            </div>
            {logoutButton}
          </div>
        </Sider>
      )}
      <FeedbackDrawer
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
}

export default Sidebar;
