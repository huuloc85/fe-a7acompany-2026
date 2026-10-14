import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { isAllowRole } from '@utils/authUtil';

export const Route = createFileRoute('/_authenticated/admin')({
  component: () => <Outlet />,
  beforeLoad: async ({ context, location }) => {
    const { user } = context.authenticated;
    const path = location.pathname.replace(/\/+$/, '');
    if (path === '/admin') {
      throw redirect({
        to: isAllowRole(user, ['super admin']) ? '/admin/rbac' : '/',
        replace: true
      });
    }
  }
});
