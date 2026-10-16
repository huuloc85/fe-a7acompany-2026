import { authLogout } from '@services/AuthService';
import { Link, useNavigate } from '@tanstack/react-router';
import { message } from 'antd';
import { useState } from 'react';
import AppButton from '@components/common/AppButton';

export default function Forbidden() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double-click

    setIsLoggingOut(true);

    try {
      // Show immediate feedback
      message.loading({
        content: 'Đang đăng xuất...',
        key: 'logout',
        duration: 0.5
      });

      // Perform logout (now non-blocking)
      await authLogout();

      // Show success message briefly
      message.success({
        content: 'Đăng xuất thành công!',
        key: 'logout',
        duration: 1
      });

      // Navigate immediately after clearing auth
      navigate({ to: '/login', replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if error, still navigate to login
      message.error({
        content: 'Đã đăng xuất',
        key: 'logout',
        duration: 1
      });
      navigate({ to: '/login', replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };
  return (
    <>
      <div className="error-page-shell relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
        <div className="error-page-card liquid-glass-card mx-auto w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
          <h1 className="text-title-md xl:text-title-2xl mb-8 font-bold text-gray-800 uppercase dark:text-white/90">
            FORBIDDEN
          </h1>

          <img src="/images/error/403.svg" alt="403" className="dark:hidden" />
          <img
            src="/images/error/403-dark.svg"
            alt="403"
            className="hidden dark:block"
          />

          <p className="mt-10 mb-6 text-base text-gray-700 sm:text-lg dark:text-gray-400">
            You do not have permission to access this page!
          </p>
          <Link to="/">
            <AppButton tone="primary" className="px-5">
              Back to Home Page
            </AppButton>
          </Link>
          <div className="mt-2">
            <AppButton
              tone="danger"
              onClick={handleLogout}
              loading={isLoggingOut}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </AppButton>
          </div>
        </div>
      </div>
    </>
  );
}
