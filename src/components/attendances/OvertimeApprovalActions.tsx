import { useState } from 'react';
import { Button, Form, Input, Modal, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/utils/authUtil';
import {
  OVERTIME_APPROVAL_EFFECTIVE_DATE,
  type OvertimeApproval
} from '@/utils/overtimeApproval';
import { decideOvertimeApproval } from '@/services/AttendanceService';

export function OvertimeApprovalActions({
  record
}: {
  record: {
    employee_id: string;
    name: string;
    date: string;
    shift: number;
    overtime_approval?: OvertimeApproval;
  };
}) {
  const { user } = useAuth();
  const [action, setAction] = useState<'approve' | 'cancel' | null>(null);
  const [form] = Form.useForm<{ reason: string }>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({
      reason,
      action
    }: {
      reason: string;
      action: 'approve' | 'cancel';
    }) =>
      decideOvertimeApproval({
        employee_id: record.employee_id,
        date: record.date,
        shift: record.shift,
        action,
        reason
      }),
    onSuccess: () => {
      message.success(
        action === 'approve'
          ? 'Đã duyệt tăng ca'
          : 'Đã cancel tăng ca, giữ nguyên giờ thực tế'
      );
      setAction(null);
      form.resetFields();
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = String(query.queryKey[0]);
          return (
            key.includes('request-form') ||
            [
              'attendances',
              'emp-attendance',
              'attendance-daily-results'
            ].includes(key)
          );
        }
      });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message ||
          'Không thể xử lý tăng ca. Vui lòng thử lại.'
      );
    }
  });
  const approval = record.overtime_approval;
  if (
    !user ||
    !isAdmin(user.role.name) ||
    !approval ||
    record.date.slice(0, 10) < OVERTIME_APPROVAL_EFFECTIVE_DATE ||
    approval.applicable === false ||
    approval.approved ||
    !(approval.unapproved_hours > 0) ||
    ![1, 2].includes(record.shift)
  )
    return null;

  const cancelled =
    approval.requests.length > 0 &&
    approval.requests.every((request) => request.status === 'rejected');
  return (
    <>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Button
          size="small"
          className="!h-7 !min-w-20 !px-2 !py-0 !text-xs"
          type="primary"
          onClick={() => setAction('approve')}
        >
          Xác nhận
        </Button>
        <Button
          size="small"
          className="!h-7 !min-w-20 !px-2 !py-0 !text-xs"
          danger
          disabled={cancelled}
          onClick={() => setAction('cancel')}
        >
          Cancel
        </Button>
      </div>
      <Modal
        title={
          action === 'approve' ? 'Xác nhận cho phép tăng ca' : 'Cancel tăng ca'
        }
        open={action !== null}
        confirmLoading={mutation.isPending}
        okText={action === 'approve' ? 'Xác nhận' : 'Cancel tăng ca'}
        cancelText="Đóng"
        onCancel={() => {
          if (!mutation.isPending) {
            setAction(null);
            form.resetFields();
          }
        }}
        onOk={() => form.submit()}
      >
        <p className="mb-3">
          {record.name} ({record.employee_id}) — {record.date} —{' '}
          {record.shift === 2 ? 'Ca đêm' : 'Ca ngày'}
        </p>
        <p className="mb-3">
          {action === 'approve'
            ? 'Cho phép tăng ca cho ngày và ca làm này, kể cả khi nhân viên chưa gửi đơn. Số giờ được tính theo chấm công thực tế, không cần nhập số giờ.'
            : 'Không duyệt tăng ca. Giữ nguyên giờ thực tế và hiển thị cảnh báo trên bảng công.'}
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={({ reason }) => {
            if (action) mutation.mutate({ reason: reason.trim(), action });
          }}
        >
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập lý do'
              }
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
