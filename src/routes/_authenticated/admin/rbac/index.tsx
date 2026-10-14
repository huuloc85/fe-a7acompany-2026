import RBACPage from '@pages/admin/rbac/RBACPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/admin/rbac/')({
  component: RBACPage
});
