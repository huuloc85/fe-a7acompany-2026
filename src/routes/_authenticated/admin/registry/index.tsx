import RegistryPage from '@pages/admin/registry/RegistryPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/admin/registry/')({
  component: RegistryPage
});
