import { AuthContext } from '@/hooks/useAuth';
import { User } from '@/types/authType';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRouteWithContext,
  Link,
  Outlet
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { queryClient } from '@/lib/queryClient';
import AppButton from '@components/common/AppButton';

const showDevtools =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEVTOOLS === 'true';

type RouterContext = {
  user: User | null;
  authenticated: AuthContext;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        {showDevtools && (
          <>
            <TanStackRouterDevtools />
            <ReactQueryDevtools initialIsOpen={false} />
          </>
        )}
      </QueryClientProvider>
    </>
  ),
  errorComponent: ({ error }) => (
    <QueryClientProvider client={queryClient}>
      <div className="error-page-shell glass-app-shell flex min-h-screen items-center justify-center px-4 py-6">
        <div className="error-page-card liquid-glass-card w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
          <h1 className="text-lg font-semibold text-gray-800 uppercase">
            Không thể hiển thị trang
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Vui lòng quay lại trang chủ hoặc thử tải lại trang.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-500">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          )}
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/">
              <AppButton tone="primary">Về trang chủ</AppButton>
            </Link>
            <AppButton onClick={() => window.location.reload()}>
              Tải lại
            </AppButton>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  )
});
