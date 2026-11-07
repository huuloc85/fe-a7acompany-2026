import { useEffect, useState } from 'react';
import { Alert } from 'antd';
import Button from '@components/common/AppButton';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import {
  getEmployeePreview,
  EMPLOYEE_PREVIEW_PAGES
} from '@/utils/employeePreview';
import { stopEmployeePreview } from '@/services/AuthService';

export default function EmployeePreviewLayout() {
  const [preview] = useState(getEmployeePreview);
  const { pathname } = useLocation();
  const [leaving, setLeaving] = useState(false);
  const leave = async () => {
    setLeaving(true);
    try {
      await stopEmployeePreview();
    } catch {
      /* Local exit also works offline. */
    }
  };
  useEffect(() => {
    if (!preview) return;
    let ending = false;
    const check = () => {
      if (ending) return;
      if (
        Date.now() >= Date.parse(preview.expiresAt) ||
        localStorage.getItem('token') !== preview.parentToken
      ) {
        ending = true;
        void stopEmployeePreview().catch(() => undefined);
      }
    };
    check();
    const timer = window.setInterval(check, 1000);
    window.addEventListener('focus', check);
    window.addEventListener('storage', check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      window.removeEventListener('storage', check);
    };
  }, [preview]);
  if (!preview) return null;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-50 bg-white p-3 shadow-sm dark:bg-gray-900">
        <Alert
          type="warning"
          showIcon
          message={`Đang xem: ${preview.user.name} (${preview.user.id}) · Chỉ xem`}
          description={`Hết hạn lúc ${new Date(preview.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}. Không được thay đổi dữ liệu.`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <nav
            aria-label="Màn hình nhân viên"
            className="flex flex-1 flex-wrap gap-3"
          >
            {EMPLOYEE_PREVIEW_PAGES.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                aria-current={pathname.startsWith(path) ? 'page' : undefined}
                className={
                  pathname.startsWith(path) ? 'font-semibold underline' : ''
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <Button tone="inherit" loading={leaving} onClick={() => void leave()}>
            Quay lại quản trị
          </Button>
        </div>
      </div>
      <main className="min-w-0 p-4">
        <Outlet />
      </main>
    </div>
  );
}
