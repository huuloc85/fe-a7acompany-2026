import { isAdmin } from '@utils/authUtil';
import { Link, useNavigate } from '@tanstack/react-router';
import { App as AntApp, Avatar } from 'antd';
import { useRef, useState, useEffect } from 'react';

import { authLogout } from '@services/AuthService';
import { authStore } from '@stores/authStore';
import { finishLogoutRedirect, startLogoutRedirect } from '@utils/authRedirect';

import { IconLogOut } from '@components/icons';
import { useStore } from '@tanstack/react-store';
import { FaUser, FaUserCircle, FaFileAlt } from 'react-icons/fa';

export default function UserDropdown() {
  const navigate = useNavigate();
  const { user } = useStore(authStore);
  const { message } = AntApp.useApp();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      message.error({ content: 'Đã đăng xuất', key: 'logout', duration: 1 });
    } finally {
      finishLogoutRedirect();
      setIsLoggingOut(false);
    }
  };

  const isAdminRole = isAdmin(user?.role?.name || '');
  const firstName = (user?.name?.split(' ').pop() || 'User').replace(
    /[()]/g,
    ''
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        data-tour="profile-menu"
        className="profile-trigger-btn cursor-pointer rounded-full ring-2 ring-transparent transition-all duration-300 hover:shadow-md hover:ring-blue-200 active:scale-95 dark:hover:ring-blue-700"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar src={user?.image_url} size={40} icon={<FaUser />} />
      </button>

      {open && (
        <div className="app-profile-dropdown glass-dropdown app-dropdown-enter absolute top-full right-0 mt-3 w-56 overflow-hidden rounded-2xl">
          {/* ── User Info ── */}
          <div className="app-profile-summary flex items-center gap-3 px-4 py-4">
            <div className="app-profile-avatar flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              {user?.image_url ? (
                <img
                  src={user.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <FaUser className="text-sm text-black/40 dark:text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="app-profile-name truncate text-sm font-semibold text-black dark:text-white">
                {firstName}
              </p>
              <p className="app-profile-role truncate text-xs text-black/40 dark:text-gray-500">
                {user?.role?.name || 'Nhân viên'}
              </p>
            </div>
          </div>

          <div className="app-dropdown-divider mx-4 h-px bg-gray-100 dark:bg-gray-800" />

          {/* ── Menu ── */}
          <div className="p-2">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="app-profile-menu-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] !text-black/80 no-underline transition-all duration-200 hover:bg-gray-50 hover:!text-black active:scale-[0.98] dark:!text-gray-200 dark:hover:bg-white/5 dark:hover:!text-white"
            >
              <FaUserCircle className="text-base text-black/50 dark:text-gray-400" />
              <span>Hồ sơ</span>
            </Link>

            {!isAdminRole && (
              <Link
                to="/employee/request-forms"
                onClick={() => setOpen(false)}
                className="app-profile-menu-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] !text-black/80 no-underline transition-all duration-200 hover:bg-gray-50 hover:!text-black active:scale-[0.98] dark:!text-gray-200 dark:hover:bg-white/5 dark:hover:!text-white"
              >
                <FaFileAlt className="text-base text-black/50 dark:text-gray-400" />
                <span>Đơn yêu cầu</span>
              </Link>
            )}
          </div>

          <div className="app-dropdown-divider mx-4 h-px bg-gray-100 dark:bg-gray-800" />

          {/* ── Logout ── */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="app-profile-logout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-red-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/15"
            >
              <IconLogOut className="text-base" />
              <span>{isLoggingOut ? 'Đang xuất...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
