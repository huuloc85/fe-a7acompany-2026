export const OVERTIME_APPROVAL_EFFECTIVE_DATE = '2026-10-16';

export interface OvertimeApproval {
  applicable?: boolean;
  approved: boolean;
  default_hours?: number;
  approved_hours: number;
  unapproved_hours: number;
  requests: {
    id: number;
    status: string;
    rejection_reason: string | null;
  }[];
}

export function getOvertimeApprovalMessages(
  actualHours: number,
  approval?: OvertimeApproval,
  date?: string
): { color: 'success' | 'warning'; text: string }[] {
  if (
    (date && date.slice(0, 10) < OVERTIME_APPROVAL_EFFECTIVE_DATE) ||
    approval?.applicable === false
  ) {
    return [];
  }
  if (!approval) {
    return actualHours > 0
      ? [{ color: 'warning', text: 'Chưa kiểm tra được đơn tăng ca' }]
      : [];
  }

  const messages: { color: 'success' | 'warning'; text: string }[] = [];
  if ((approval.default_hours ?? 0) > 0) {
    messages.push({
      color: 'success',
      text: 'Tăng ca mặc định'
    });
  }
  if (approval.approved) {
    messages.push({
      color: 'success',
      text:
        approval.approved_hours > 0
          ? `Tăng ca đã duyệt: ${approval.approved_hours}h`
          : (approval.default_hours ?? 0) > 0
            ? 'Đã duyệt tăng ca — chưa phát sinh giờ vượt mức mặc định'
            : 'Đã duyệt tăng ca — chờ chấm công thực tế'
    });
  }
  for (const request of approval.requests) {
    if (!approval.approved && request.status !== 'approved') {
      const status = request.status === 'rejected' ? 'bị từ chối' : 'chờ duyệt';
      messages.push({
        color: 'warning',
        text: `Đơn #${request.id}: ${status}${request.rejection_reason ? ` — ${request.rejection_reason}` : ''}`
      });
    }
  }
  if (approval.unapproved_hours > 0) {
    messages.push({
      color: 'warning',
      text:
        approval.requests.length === 0
          ? `${approval.unapproved_hours}h thực tế chưa có đơn tăng ca được duyệt`
          : `${approval.unapproved_hours}h thực tế chưa được duyệt`
    });
  }
  return messages;
}
