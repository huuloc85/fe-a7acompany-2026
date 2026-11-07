import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/admin/notification-demo')(
  {
    beforeLoad: () => {
      throw redirect({ to: '/admin/edit-layout' });
    }
  }
);
