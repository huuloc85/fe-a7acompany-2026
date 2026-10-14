import axiosPrivate from '@/api/axiosInstance';
import type { PayrollDraft } from '@/utils/payrollCalculation';

export interface PayrollPublication {
  id: number;
  status: 'draft' | 'published';
  revision: number;
  total: number;
}

export const fetchPayrollPublication = (company: string, period: string) =>
  axiosPrivate.get<never, { data: PayrollPublication | null }>(
    `/api/payroll-drafts/${company.toLowerCase()}/${period}`
  );

export const savePayrollDraft = (
  company: string,
  period: string,
  draft: PayrollDraft,
  revision: number
) =>
  axiosPrivate.put<never, { data: PayrollPublication }>(
    `/api/payroll-drafts/${company.toLowerCase()}/${period}`,
    { draft, revision }
  );

export const publishPayroll = (id: number, revision: number) =>
  axiosPrivate.post(`/api/payroll-publications/${id}`, { revision });
