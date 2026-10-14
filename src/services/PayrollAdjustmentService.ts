import axiosPrivate from '@/api/axiosInstance';
import type { PayrollAdjustments } from '@/utils/payrollCalculation';

export interface SavedPayrollAdjustment {
  employeeId: string;
  adjustment: Partial<PayrollAdjustments>;
  revision: number;
}

export const fetchPayrollAdjustments = (period: string) =>
  axiosPrivate.get<never, { data: SavedPayrollAdjustment[] }>(
    `/api/vvp-payroll-adjustments/${period}`
  );

export const savePayrollAdjustment = (
  period: string,
  employeeId: string,
  adjustment: PayrollAdjustments,
  revision: number
) =>
  axiosPrivate.put<never, { data: SavedPayrollAdjustment }>(
    `/api/vvp-payroll-adjustments/${period}/${encodeURIComponent(employeeId)}`,
    { adjustment, revision }
  );
