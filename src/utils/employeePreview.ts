import type { User } from '@/types/authType';

const STORAGE_KEY = 'employee-preview';

export interface EmployeePreviewSession {
  token: string;
  parentToken: string;
  expiresAt: string;
  user: User;
}

export function getEmployeePreview(): EmployeePreviewSession | null {
  const value = sessionStorage.getItem(STORAGE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as EmployeePreviewSession;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveEmployeePreview(session: EmployeePreviewSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearEmployeePreview() {
  sessionStorage.removeItem(STORAGE_KEY);
}

// Never fall back to admin credentials while an expired preview is still open.
export function getActiveAuthToken() {
  return getEmployeePreview()?.token ?? localStorage.getItem('token');
}

export const EMPLOYEE_PREVIEW_PAGES = [
  { path: '/employee/attendances', label: 'Chấm công' },
  { path: '/employee/schedules', label: 'Lịch làm việc' },
  { path: '/employee/salaries', label: 'Bảng lương' },
  { path: '/employee/request-forms', label: 'Đơn yêu cầu' }
];

export function isEmployeePreviewPath(path: string) {
  return EMPLOYEE_PREVIEW_PAGES.some(
    (page) => path === page.path || path.startsWith(`${page.path}/`)
  );
}
