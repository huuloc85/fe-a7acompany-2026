import axiosPrivate from '@/api/axiosInstance';
import type { PayrollProfile } from '@/utils/payrollCalculation';

export interface SavedPayrollProfile {
  employee_id?: string | null;
  employeeLinked?: boolean;
  employeeInactive?: boolean;
  profile: PayrollProfile;
  revision: number;
  source: string;
  sourceRow: number;
  effectiveFrom: string;
  updatedAt: string;
}

export function fetchPayrollProfiles() {
  return axiosPrivate.get<
    never,
    {
      data: SavedPayrollProfile[];
      canEdit: boolean;
      availableEmployees?: { id: string; name: string; company?: string }[];
    }
  >('/api/vvp-payroll-profiles');
}

export function savePayrollProfile(profile: PayrollProfile, revision: number) {
  return axiosPrivate.put<never, { data: SavedPayrollProfile }>(
    `/api/vvp-payroll-profiles/${encodeURIComponent(profile.employeeId)}`,
    { profile, revision }
  );
}

export function createPayrollProfile(
  profile: PayrollProfile,
  effectiveFrom: string
) {
  return axiosPrivate.post<never, { data: SavedPayrollProfile }>(
    '/api/vvp-payroll-profiles',
    { profile, effectiveFrom }
  );
}

export function deletePayrollProfile(employeeCode: string, revision: number) {
  return axiosPrivate.delete<never, { data: { employeeCode: string } }>(
    `/api/vvp-payroll-profiles/${encodeURIComponent(employeeCode)}`,
    { data: { revision } }
  );
}
