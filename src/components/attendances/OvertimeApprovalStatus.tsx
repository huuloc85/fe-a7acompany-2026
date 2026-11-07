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
  const messages = getOvertimeApprovalMessages(hours, approval, date);
  if (!messages.length) return null;

  return (
    <div
      className={`flex w-full min-w-0 flex-col gap-1 ${compact ? 'items-end text-right' : 'items-center text-center'}`}
    >
      {messages.map(({ color, text }) => (
        <Tooltip key={text} title={compact ? text : undefined}>
          <Tag
            color={color}
            className={
              compact
                ? '!mr-0 !max-w-full !text-xs !leading-5 !whitespace-normal'
                : '!mr-0 !whitespace-normal'
            }
            icon={color === 'warning' ? <WarningOutlined /> : undefined}
          >
            {text}
          </Tag>
        </Tooltip>
      ))}
    </div>
  );
}
