import { Tag } from 'antd';
import type { FeedbackStatus } from '@/services/FeedbackService';

const statuses: Record<FeedbackStatus, { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: 'warning' },
  reviewed: { label: 'Đã xem', color: 'processing' },
  resolved: { label: 'Đã xử lý', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' }
};

export default function FeedbackStatusTag({
  status
}: {
  status: FeedbackStatus;
}) {
  const { label, color } = statuses[status];
  return (
    <Tag color={color} className="!m-0 !whitespace-nowrap">
      {label}
    </Tag>
  );
}
