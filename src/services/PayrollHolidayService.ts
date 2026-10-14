import axiosPrivate from '@/api/axiosInstance';
import type { PayrollHolidays } from '@/utils/payrollHolidays';

export const fetchPayrollHolidays = (period: string) =>
  axiosPrivate.get<never, { data: PayrollHolidays }>(
    `/api/vvp-payroll-holidays/${period}`
  );

export const savePayrollHolidays = (period: string, data: PayrollHolidays) =>
  axiosPrivate.put<never, { data: PayrollHolidays }>(
    `/api/vvp-payroll-holidays/${period}`,
    data
  );
