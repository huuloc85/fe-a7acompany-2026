import { RequestForm, RequestFormStatus } from '@/types/requestFormType';
import { normalizeRoleName } from './authUtil';
import {
  SUPERVISOR_IDS,
  SUPERVISOR_ROLE_IDS,
  SUPERVISOR_ROLE_NAMES
} from '@/constants/supervisors';

/**
 * User type definition for request form utilities
 */
export interface RequestFormUser {
  id: string | number;
  role?: string | { id?: string | number; name: string };
}

export function requiresManagerApproval(
  record: Pick<RequestForm, 'employee_id'>
): boolean {
  return [...SUPERVISOR_IDS, '22122900', '23080100', '23011400'].includes(
    String(record.employee_id)
  );
}

/**
 * Get user approval type based on role and supervisor IDs
 * @param user - Current user
 * @returns 'manager' | 'supervisor' | null
 */
export function getUserApprovalType(
  user: RequestFormUser | null
): 'manager' | 'supervisor' | null {
  if (!user) return null;

  // Get role name
  const roleName =
    typeof user.role === 'string' ? user.role : user.role?.name || '';
  const roleId =
    typeof user.role === 'string' ? undefined : user.role?.id?.toString();

  // Check if user is admin/manager
  const adminRoles = ['admin', 'super admin', 'co admin', 'manager'];
  const isManager = adminRoles
    .map((role) => role.toLowerCase())
    .includes(normalizeRoleName(roleName));

  if (isManager) return 'manager';

  // Check if user is supervisor (has special user ID)
  const userId = user.id.toString();
  const isSupervisor = SUPERVISOR_IDS.some(
    (supId) =>
      supId.toString() === userId ||
      supId.toString().replace(/^0+/, '') === userId.replace(/^0+/, '')
  );
  const isSupervisorRole =
    SUPERVISOR_ROLE_NAMES.includes(
      normalizeRoleName(roleName) as (typeof SUPERVISOR_ROLE_NAMES)[number]
    ) ||
    (!!roleId && (SUPERVISOR_ROLE_IDS as readonly string[]).includes(roleId));

  if (isSupervisor || isSupervisorRole) return 'supervisor';

  return null;
}

/**
 * Get signature type that current user should sign
 * @param record - Request form record
 * @param user - Current user
 * @returns 'supervisor' | 'manager' | null
 */
export function getUserSignatureType(
  record: RequestForm,
  user: RequestFormUser | null
): 'supervisor' | 'manager' | null {
  if (!user || !record) return null;

  const userType = getUserApprovalType(user);

  // For delegation forms, no signature needed
  if (record.type === 'don_xin_tang_ca') {
    if (requiresManagerApproval(record)) {
      return userType === 'manager' &&
        String(user.id) !== String(record.employee_id) &&
        !record.has_manager_signature &&
        !record.digital_signature_manager
        ? 'manager'
        : null;
    }
    return userType === 'supervisor' &&
      String(user.id) === String(record.supervisor_id) &&
      String(user.id) !== String(record.employee_id) &&
      !record.has_supervisor_signature &&
      !record.digital_signature_supervisor
      ? 'supervisor'
      : null;
  }
  if (record.type === 'giay_uy_quyen') {
    return null;
  }

  // Check if the request was created by a supervisor
  const createdBySupervisor = isRequestCreatedBySupervisor(record);

  // Supervisor can sign if not signed yet AND they didn't create the request
  if (
    userType === 'supervisor' &&
    !record.has_supervisor_signature &&
    !record.digital_signature_supervisor &&
    !createdBySupervisor
  ) {
    return 'supervisor';
  }

  // Manager can sign if not signed yet (no need to wait for supervisor)
  if (
    userType === 'manager' &&
    !record.has_manager_signature &&
    !record.digital_signature_manager
  ) {
    return 'manager';
  }

  return null;
}

/**
 * Check if user can approve or reject the request form
 * @param record - Request form record
 * @param user - Current user
 * @returns Object with canApprove, canReject, and reason
 */
export function canUserApproveReject(
  record: RequestForm,
  user: RequestFormUser | null
): {
  canApprove: boolean;
  canReject: boolean;
  reason?: string;
} {
  if (!user || !record) {
    return {
      canApprove: false,
      canReject: false,
      reason: 'Không tìm thấy thông tin người dùng'
    };
  }

  const userType = getUserApprovalType(user);

  if (!userType) {
    return {
      canApprove: false,
      canReject: false,
      reason: 'Bạn không có quyền xử lý đơn này'
    };
  }

  // Can't approve/reject if not pending
  if (record.status !== 'pending') {
    return {
      canApprove: false,
      canReject: false,
      reason: 'Đơn này đã được xử lý'
    };
  }

  // For delegation forms
  if (record.type === 'don_xin_tang_ca') {
    if (requiresManagerApproval(record)) {
      const manager =
        userType === 'manager' &&
        String(user.id) !== String(record.employee_id);
      return {
        canApprove:
          manager &&
          !!(
            record.has_applicant_signature || record.digital_signature_applicant
          ),
        canReject: manager
      };
    }
    const assigned =
      userType === 'supervisor' &&
      String(user.id) === String(record.supervisor_id) &&
      String(user.id) !== String(record.employee_id);
    return {
      canApprove:
        assigned &&
        (!!record.has_applicant_signature ||
          !!record.digital_signature_applicant),
      canReject: assigned || userType === 'manager',
      reason:
        'Đơn tăng ca cần người làm đơn và tổ trưởng được chỉ định ký; admin xử lý trực tiếp tại bảng công.'
    };
  }
  if (record.type === 'giay_uy_quyen') {
    // Only managers can approve/reject delegation forms
    if (userType === 'manager') {
      return { canApprove: true, canReject: true };
    }
    return {
      canApprove: false,
      canReject: false,
      reason: 'Chỉ quản lý mới có quyền duyệt đơn ủy quyền'
    };
  }

  // For regular forms
  const createdBySupervisor = isRequestCreatedBySupervisor(record);

  // Supervisor can sign/reject
  if (userType === 'supervisor') {
    // If supervisor created the request, they cannot sign it
    if (createdBySupervisor) {
      return {
        canApprove: false,
        canReject: false,
        reason: 'Bạn không thể ký đơn do chính mình tạo ra'
      };
    }

    if (
      record.has_supervisor_signature ||
      record.digital_signature_supervisor
    ) {
      return {
        canApprove: false,
        canReject: true,
        reason: 'Bạn đã ký đơn này rồi'
      };
    }
    return { canApprove: true, canReject: true };
  }

  // Manager can sign/reject (no need to wait for supervisor)
  if (userType === 'manager') {
    if (record.has_manager_signature || record.digital_signature_manager) {
      return {
        canApprove: areSignaturesComplete(record),
        canReject: true,
        reason: 'Bạn đã ký đơn này rồi'
      };
    }
    return { canApprove: true, canReject: true };
  }

  return {
    canApprove: false,
    canReject: false,
    reason: 'Không xác định được quyền hạn'
  };
}

/**
 * Get signature label based on signature type
 * @param signType - Type of signature
 * @returns Label string
 */
export function getSignatureLabel(
  signType: 'supervisor' | 'manager' | null
): string {
  switch (signType) {
    case 'supervisor':
      return 'Chữ ký Tổ trưởng';
    case 'manager':
      return 'Chữ ký Quản lý';
    default:
      return 'Chữ ký';
  }
}

/**
 * Check if request form needs signatures
 * @param record - Request form record
 * @returns boolean
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function needsSignatures(_record: RequestForm): boolean {
  // All form types need signatures
  // Regular forms: supervisor + manager
  // Delegation forms: delegator + authorized
  return true;
}

/**
 * Check if request form signatures are complete
 * @param record - Request form record
 * @returns boolean
 */
export function areSignaturesComplete(record: RequestForm): boolean {
  if (record.type === 'don_xin_tang_ca') {
    if (requiresManagerApproval(record)) {
      return (
        !!(
          record.has_applicant_signature || record.digital_signature_applicant
        ) &&
        !!(record.has_manager_signature || record.digital_signature_manager)
      );
    }
    return (
      (!!record.has_applicant_signature ||
        !!record.digital_signature_applicant) &&
      (!!record.has_supervisor_signature ||
        !!record.digital_signature_supervisor)
    );
  }
  // Delegation forms need both delegator and authorized signatures
  if (record.type === 'giay_uy_quyen') {
    const hasDelegatorSignature =
      !!record.has_delegator_signature || !!record.digital_signature_delegator;
    const hasAuthorizedSignature =
      !!record.has_authorized_signature ||
      !!record.digital_signature_authorized;
    return hasDelegatorSignature && hasAuthorizedSignature;
  }

  // Check if request was created by supervisor (employee_id === supervisor_id)
  const createdBySupervisor = isRequestCreatedBySupervisor(record);

  if (
    createdBySupervisor ||
    [...SUPERVISOR_IDS, '22122900', '23080100', '23011400'].includes(
      String(record.employee_id)
    )
  ) {
    // If supervisor created the request, only manager signature is needed
    return !!record.has_manager_signature || !!record.digital_signature_manager;
  }

  // Regular forms need both signatures
  return (
    (!!record.has_supervisor_signature ||
      !!record.digital_signature_supervisor) &&
    (!!record.has_manager_signature || !!record.digital_signature_manager)
  );
}

/**
 * Check if request form was created by a supervisor
 * @param record - Request form record
 * @returns boolean
 */
export function isRequestCreatedBySupervisor(record: RequestForm): boolean {
  if (!record.employee_id || !record.supervisor_id) {
    return false;
  }

  // Compare employee_id and supervisor_id (both as strings)
  return record.employee_id.toString() === record.supervisor_id.toString();
}

/**
 * Get effective status based on signatures (for display purposes)
 * This helps show the "real" status when backend hasn't updated yet
 * @param record - Request form record
 * @returns Effective status for display
 */
export function getEffectiveStatus(record: RequestForm): RequestFormStatus {
  if (
    record.type === 'giay_uy_quyen' &&
    record.status === 'pending' &&
    areSignaturesComplete(record)
  ) {
    return 'authorized_approved';
  }
  // Signatures alone must never fabricate a final server approval.
  return record.status;
}
