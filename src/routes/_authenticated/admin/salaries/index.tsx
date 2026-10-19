import { createFileRoute } from '@tanstack/react-router';

import SalaryList from '@pages/admin/salaries/SalaryList';

export const Route = createFileRoute('/_authenticated/admin/salaries/')({
  validateSearch: (
    search: Record<string, unknown>
  ): { status?: 'draft' | 'published' } => ({
    status:
      search.status === 'draft' || search.status === 'published'
        ? search.status
        : undefined
  }),
  component: SalaryList
});
