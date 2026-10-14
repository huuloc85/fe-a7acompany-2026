import type { PayrollProfile } from './payrollCalculation';

// Keep the source key for persistence only; use the confirmed web ID in all outputs.
export const payrollEmployeeCode = (profile: PayrollProfile) =>
  (profile.attendanceEmployeeId || profile.employeeId).trim();
