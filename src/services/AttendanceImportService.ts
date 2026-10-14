import axiosPrivate from '@/api/axiosInstance';

export interface AttendanceImportRequest {
  id: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  completed_days: number;
  inserted: number;
  existing: number;
  unmatched: number;
  skipped: number;
  unmatched_codes: string | string[] | null;
  error: string | null;
  updated_at: string;
}

const endpoint = '/api/attendances/device-imports';

export const fetchAttendanceImports = () =>
  axiosPrivate.get<AttendanceImportRequest[], AttendanceImportRequest[]>(
    endpoint
  );

export const requestAttendanceImport = (startDate: string, endDate: string) =>
  axiosPrivate.post<unknown, { id: number; status: string }>(endpoint, {
    start_date: startDate,
    end_date: endDate,
    confirmed: true
  });
