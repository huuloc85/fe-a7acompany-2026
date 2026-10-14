import { User } from '@/types/authType';
import {
  SUPERVISOR_IDS,
  SUPERVISOR_ROLE_IDS,
  SUPERVISOR_ROLE_NAMES
} from '@/constants/supervisors';
import { redirect } from '@tanstack/react-router';

type RoleMatcher = string | number;
const TOTAL_WORK_SCHEDULE_VIEWER_IDS = ['23030100'] as const;

export const normalizeRoleName = (role: string) => {
  const normalized = role.toLowerCase().trim().replace(/\s+/g, ' ');
  // API filters use hyphens, while login responses traditionally use spaces.
  return normalized.replace(/^(co|super)[-_]admin$/, '$1 admin');
};
const normalizeRoleId = (role: string | number) => role.toString().trim();

const hasRole = (user: User, roles: RoleMatcher[]) => {
  const userRoleName = normalizeRoleName(user.role.name);
  const userRoleId = normalizeRoleId(user.role.id);

  return roles.some((role) => {
    if (typeof role === 'number') return userRoleId === normalizeRoleId(role);
    return (
      normalizeRoleName(role) === userRoleName ||
      normalizeRoleId(role) === userRoleId
    );
  });
};

export const isAdmin = (role: string): boolean => {
  return ['admin', 'super admin', 'co admin'].includes(normalizeRoleName(role));
};

export const shouldEnforceDuplicateLoginForRole = (
  roleName?: string | null
): boolean => {
  if (!roleName) return true;
  return !['admin', 'super admin'].includes(normalizeRoleName(roleName));
};

export function requireRole(user: User | null, allowedRoles: RoleMatcher[]) {
  if (!user) {
    throw redirect({ to: '/login' });
  }

  if (!hasRole(user, allowedRoles)) {
    throw redirect({ to: '/forbidden', statusCode: 403 });
  }
}

export function disableRole(user: User | null, disallowedRoles: RoleMatcher[]) {
  if (!user) {
    throw redirect({ to: '/login' });
  }

  if (hasRole(user, disallowedRoles)) {
    throw redirect({ to: '/forbidden', statusCode: 403 });
  }
}

export const isAllowRole = (user: User | null, allowedRoles: RoleMatcher[]) => {
  if (!user) {
    return false;
  }

  return hasRole(user, allowedRoles);
};

export const canViewTotalWorkSchedules = (user: User | null) => {
  if (!user?.id) return false;
  return (TOTAL_WORK_SCHEDULE_VIEWER_IDS as readonly string[]).includes(
    user.id.toString()
  );
};

export function requireAdminOrSupervisor(
  user: User | null,
  supervisorIds: string[]
) {
  if (!user) {
    throw redirect({ to: '/login' });
  }

  // Cho phép admin roles
  const adminRoles = ['admin', 'super admin', 'co admin'];
  const isAdminRole = hasRole(user, adminRoles);

  // Cho phép các supervisor có user ID đặc biệt
  // Normalize cả user.id và supervisorIds để so sánh (bỏ qua leading zeros và convert về string)
  const normalizedUserId = user.id.toString().replace(/^0+/, '');
  const normalizedSupervisorIds = supervisorIds.map((id) =>
    id.toString().replace(/^0+/, '')
  );
  const isSupervisor =
    normalizedSupervisorIds.includes(normalizedUserId) ||
    supervisorIds.includes(user.id) ||
    hasRole(user, [...SUPERVISOR_ROLE_NAMES, ...SUPERVISOR_ROLE_IDS]);

  if (!isAdminRole && !isSupervisor) {
    throw redirect({ to: '/forbidden', statusCode: 403 });
  }
}

export function getUserApprovalType(
  user: User | null,
  supervisorIds: string[] = []
): 'admin' | 'supervisor' | null {
  if (!user) return null;

  // Check if user is admin
  const adminRoles = ['admin', 'super admin', 'co admin'];
  const isAdminRole = hasRole(user, adminRoles);

  if (isAdminRole) return 'admin';

  // Check if user is supervisor (có user ID đặc biệt)
  // Normalize để so sánh (bỏ qua leading zeros)
  const normalizedUserId = user.id.toString().replace(/^0+/, '');
  const normalizedSupervisorIds = supervisorIds.map((id) =>
    id.toString().replace(/^0+/, '')
  );
  const isSupervisor =
    normalizedSupervisorIds.includes(normalizedUserId) ||
    supervisorIds.includes(user.id) ||
    hasRole(user, [...SUPERVISOR_ROLE_NAMES, ...SUPERVISOR_ROLE_IDS]);

  if (isSupervisor) return 'supervisor';

  return null;
}

// ─── Permission-based Route Guard ─────────────────────────────────────────────

/**
 * Lấy tất cả URLs mà user có quyền truy cập (từ permissions + sidebar_items)
 */
function getAllowedUrls(user: User): string[] {
  const urls: string[] = [];
  for (const perm of user.permissions ?? []) {
    if (perm.url) urls.push(perm.url);
    for (const item of perm.sidebar_items ?? []) {
      if (item.url) urls.push(item.url);
    }
  }
  return urls;
}

/**
 * Kiểm tra một path có nằm trong danh sách URLs được phép không.
 * Dùng startsWith matching: permission url "/admin/employees" sẽ cho phép
 * "/admin/employees", "/admin/employees/add", "/admin/employees/edit/123"...
 */
function isUrlAllowed(path: string, allowedUrls: string[]): boolean {
  const normalized = normalizePermissionPath(path);
  if (!normalized) return false;
  return allowedUrls.some((url) => {
    const normalizedUrl = normalizePermissionPath(url);
    if (!normalizedUrl) return false;
    return (
      normalized === normalizedUrl ||
      (normalizedUrl !== '/' && normalized.startsWith(normalizedUrl + '/'))
    );
  });
}

/**
 * Route guard: kiểm tra user có quyền truy cập route hiện tại không.
 * - Super Admin: luôn được phép
 * - Admin/Co-Admin: kiểm tra permission URL
 * - Gọi trong beforeLoad của route files
 *
 * @param user - User hiện tại
 * @param currentPath - Path đang truy cập (VD: "/admin/employees")
 */
export function requirePermission(user: User | null, currentPath: string) {
  if (!user) {
    throw redirect({ to: '/login' });
  }

  if (!canAccessRoute(user, currentPath)) {
    throw redirect({ to: '/forbidden', statusCode: 403 });
  }
}

/**
 * Utility check (không throw): user có quyền truy cập URL không?
 * Dùng trong component để ẩn/hiện UI elements.
 */
export function hasPermissionUrl(user: User | null, path: string): boolean {
  if (!user) return false;
  if (!normalizePermissionPath(path)) return false;
  if (hasRole(user, ['super admin'])) return true;
  if (isUrlAllowed(path, SUPER_ADMIN_PATHS)) return false;
  return isUrlAllowed(path, getAllowedUrls(user));
}

const SUPER_ADMIN_PATHS = [
  '/admin/rbac',
  '/admin/registry',
  '/admin/edit-layout',
  '/admin/system-logs'
];

export function normalizePermissionPath(url: string): string {
  if (!url.startsWith('/') || url.startsWith('//')) return '';
  const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '').toLowerCase() || '/';
  return path === '/admin/work-schedule-categories' ? '/work-schedules' : path;
}

const SCHEDULE_ROLES: RoleMatcher[] = [
  'tổ trưởng ngoại quan',
  'tổ phó sản xuất',
  'tổ trưởng sản xuất',
  'tổ trưởng qc',
  'tổ trưởng kho',
  'tổ trưởng khuôn',
  23,
  24,
  25
];

/** Shared by route guards and navigation. Explicit permissions grant business
 * routes; only Super Admin bypasses permissions. Preserve existing employee
 * and supervisor access without giving Admin/Co Admin a role-based bypass.
 */
export function canAccessRoute(user: User | null, url: string): boolean {
  if (!user) return false;
  const path = normalizePermissionPath(url);
  if (!path) return false;
  if (hasPermissionUrl(user, path)) return true;
  if (isUrlAllowed(path, SUPER_ADMIN_PATHS)) return false;
  if (path === '/' || path === '/admin' || path === '/profile') return true;
  if (
    isUrlAllowed(path, ['/work-schedules']) &&
    canViewTotalWorkSchedules(user)
  )
    return true;
  if (isAdmin(user.role.name)) return false;
  if (isUrlAllowed(path, ['/employee'])) return true;
  if (path === '/admin/request-forms') {
    return getUserApprovalType(user, [...SUPERVISOR_IDS]) === 'supervisor';
  }
  if (isUrlAllowed(path, ['/stock'])) {
    return hasRole(user, ['kho', 'tổ trưởng kho', 24]);
  }
  if (isUrlAllowed(path, ['/stamps'])) {
    return hasRole(user, ['qa-qc', 'qc', 'tổ trưởng qc', 23]);
  }
  if (isUrlAllowed(path, ['/work-schedules'])) {
    return hasRole(user, SCHEDULE_ROLES);
  }
  if (isUrlAllowed(path, ['/activity-schedule'])) {
    return hasRole(user, SCHEDULE_ROLES);
  }
  return false;
}

/**
 * Utility check: user có permission key cụ thể không?
 */
export function hasPermissionKey(user: User | null, key: string): boolean {
  if (!user) return false;
  if (hasRole(user, ['super admin'])) return true;
  return (user.permissions ?? []).some((p) => p.key === key);
}

/**
 * Check user có bất kỳ permission nào thuộc module không?
 * Đồng bộ với BE middleware: cùng module = cùng nhóm quyền.
 */
export function hasModulePermission(
  user: User | null,
  module: string
): boolean {
  if (!user) return false;
  if (hasRole(user, ['super admin'])) return true;
  return (user.permissions ?? []).some((p) => p.module === module);
}
