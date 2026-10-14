import SystemLogsPage from '@pages/admin/system-logs';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/admin/system-logs/')({
  component: SystemLogsPage
});
