import type { User } from '@/types/authType';
import { canAccessRoute, hasPermissionUrl, isAdmin } from '@/utils/authUtil';

export const isStampPage = (pathname: string): boolean =>
  /^\/(?:employee\/)?stamps(?:\/|$)/.test(pathname);

export const canUseOnboarding = (user: User | null): boolean =>
  !!user?.role?.name && !isAdmin(user.role.name);

// Route access includes legacy employee fallbacks; a business guide must also
// have an explicit RBAC grant. Profile is available to every employee.
export const canUseGuide = (user: User | null, route: string): boolean =>
  canUseOnboarding(user) &&
  canAccessRoute(user, route) &&
  (route === '/profile' || hasPermissionUrl(user, route));
