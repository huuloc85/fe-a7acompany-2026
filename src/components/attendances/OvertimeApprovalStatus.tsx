import { Tag, Tooltip } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import {
  getOvertimeApprovalMessages,
  type OvertimeApproval
} from '@/utils/overtimeApproval';

export function OvertimeApprovalStatus({
  hours,
  date,
  approval,
  compact = false
}: {
  hours: number;
  date: string;
  approval?: OvertimeApproval;
  compact?: boolean;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1 text-center">
      {getOvertimeApprovalMessages(hours, approval, date).map(
        ({ color, text }) => (
          <Tooltip key={text} title={compact ? text : undefined}>
            <Tag
              color={color}
              className={
                compact
                  ? '!mr-0 !max-w-full truncate'
                  : '!mr-0 !whitespace-normal'
              }
              icon={color === 'warning' ? <WarningOutlined /> : undefined}
            >
              {text}
            </Tag>
          </Tooltip>
        )
      )}
    </div>
  );
}
