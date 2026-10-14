import type { PayrollAdjustments, PayrollProfile } from './payrollCalculation';
import { emptyPayrollAdjustments } from './payrollCalculation.ts';

export interface PayrollHolidays {
  defaultDays: number | null;
  overrides: Record<string, number>;
  revision: number;
}

export function applyPayrollHolidays(
  profiles: PayrollProfile[],
  adjustments: Record<string, PayrollAdjustments>,
  holidays: PayrollHolidays
): Record<string, PayrollAdjustments> {
  return Object.fromEntries(
    profiles.map((profile) => [
      profile.employeeId,
      {
        ...emptyPayrollAdjustments(),
        ...adjustments[profile.employeeId],
        diligence:
          adjustments[profile.employeeId]?.diligence ?? profile.diligence,
        holidayDays:
          holidays.overrides[profile.employeeId] ?? holidays.defaultDays ?? 0
      }
    ])
  );
}
