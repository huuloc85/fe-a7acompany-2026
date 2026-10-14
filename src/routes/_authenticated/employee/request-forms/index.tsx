import RequestFormTabs from '@pages/employee/request-forms/RequestFormTabs';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/employee/request-forms/')(
  {
    component: RequestFormTabs
  }
);
