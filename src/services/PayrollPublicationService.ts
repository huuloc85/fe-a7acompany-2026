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
) => {
  if (draft.reconciliation?.pending.length)
    return Promise.reject(
      new Error('Còn dòng Excel chưa xác nhận mã nhân viên. Chưa lưu bản nháp.')
    );
  return axiosPrivate.put<never, { data: PayrollPublication }>(
    `/api/payroll-drafts/${company.toLowerCase()}/${period}`,
    { draft, revision }
  );
};

export const publishPayroll = (id: number, revision: number) =>
  axiosPrivate.post(`/api/payroll-publications/${id}`, { revision });
