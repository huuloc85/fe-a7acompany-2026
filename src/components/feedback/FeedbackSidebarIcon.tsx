import { Badge } from 'antd';
import type { ReactNode } from 'react';
import { usePendingFeedbackCount } from '@/hooks/usePendingFeedbackCount';

export default function FeedbackSidebarIcon({
  children
}: {
  children: ReactNode;
}) {
  const { data: count = 0 } = usePendingFeedbackCount(true);
  return (
    <Badge
      count={count}
      size="small"
      offset={[5, -2]}
      title={`${count} góp ý chờ xử lý`}
      color="#dc2626"
    >
      <span
        className="inline-flex text-inherit"
        aria-label={`Góp ý${count ? `, ${count} chờ xử lý` : ''}`}
      >
        {children}
      </span>
    </Badge>
  );
}
