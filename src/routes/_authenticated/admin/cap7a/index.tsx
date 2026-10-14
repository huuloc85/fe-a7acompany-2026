import Cap7APage from '@pages/admin/cap7a';
import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@utils/authUtil';

export const Route = createFileRoute('/_authenticated/admin/cap7a/')({
  beforeLoad: ({ context }) => {
    requireRole(context.authenticated.user, ['super admin']);
  },
  component: Cap7APage
});
