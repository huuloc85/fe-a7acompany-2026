/**
 * Danh sách User IDs của các Supervisor có quyền duyệt đơn
 * Những user này có quyền như admin trong việc duyệt request forms
 */
export const SUPERVISOR_IDS = [
  '25060400',
  '22120700',
  '22120900',
  '22120300',
  '22122800',
  '22121800'
] as const;

export const SUPERVISOR_ROLE_IDS = ['23', '24', '25'] as const;
export const SUPERVISOR_ROLE_NAMES = [
  'tổ trưởng qc',
  'tổ trưởng kho',
  'tổ trưởng khuôn'
] as const;

export type SupervisorId = (typeof SUPERVISOR_IDS)[number];
export type SupervisorRoleId = (typeof SUPERVISOR_ROLE_IDS)[number];
