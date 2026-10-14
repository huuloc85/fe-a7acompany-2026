import { EditLayout } from '@pages/admin/configLayout/EditLayout';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/admin/edit-layout/')({
  component: EditLayout
});
