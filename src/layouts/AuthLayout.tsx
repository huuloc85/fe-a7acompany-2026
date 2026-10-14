import { Outlet } from '@tanstack/react-router';
import MidAutumnBanner from '@components/holiday/MidAutumnBanner';
import GridShape from '@components/common/GridShape';
import { motion } from 'framer-motion';
import { useMidAutumnMode } from '@hooks/useMidAutumnMode';

export default function AuthLayout() {
  const isMidAutumn = useMidAutumnMode();

  if (!isMidAutumn) {
    return (
      <div className="glass-app-shell relative z-1 flex h-screen w-full overflow-hidden px-4 py-6 sm:p-0">
        <div className="auth-ambient" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="auth-form-pane flex min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl p-6 sm:rounded-none sm:border-0 sm:p-8"
        >
          <div className="mx-auto my-auto flex w-full max-w-md min-w-0 shrink-0 flex-col">
            <Outlet />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="liquid-glass-panel auth-visual-panel relative z-1 hidden flex-1 items-center justify-center rounded-l-[32px] p-8 lg:flex"
        >
          <GridShape />
          <div className="flex max-w-xs flex-col items-center">
            <p className="text-center text-gray-200 dark:text-white/60">
              VINH VINH PHAT ONE MEMBER CO.,LTD
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="mid-autumn-auth">
      <div className="mid-autumn-auth-visual">
        <div className="mid-autumn-brand">
          <span className="mid-autumn-brand-mark" aria-hidden="true">
            VVP
          </span>
          <span>
            VINH VINH PHÁT<small>Kết nối hôm nay, vững bước ngày mai</small>
          </span>
        </div>
        <MidAutumnBanner variant="login" />
        <p className="mid-autumn-visual-footer">
          Một mùa trăng đẹp. Một hành trình cùng nhau.
        </p>
      </div>
      <div className="mid-autumn-auth-pane">
        <div className="mid-autumn-auth-form">
          <Outlet />
        </div>
        <p className="mid-autumn-auth-footer">
          © {new Date().getFullYear()} Vinh Vinh Phát. All rights reserved.
        </p>
      </div>
    </main>
  );
}
