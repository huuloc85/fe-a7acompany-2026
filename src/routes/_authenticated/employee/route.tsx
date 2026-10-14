import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/employee')({
  component: () => <Outlet />,
  beforeLoad: async ({ location }) => {
    const path = location.pathname.replace(/\/+$/, '');
    if (path === '/employee') {
      throw redirect({ to: '/employee/schedules', replace: true });
    }
  }
});
