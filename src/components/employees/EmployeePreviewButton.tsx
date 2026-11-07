import { useState } from 'react';
import { Form, Input, Modal, Alert, Tooltip } from 'antd';
import Button from '@components/common/AppButton';
import { EyeOutlined } from '@ant-design/icons';
import { useStore } from '@tanstack/react-store';
import axiosPrivate from '@/api/axiosInstance';
import { authStore } from '@/stores/authStore';
import { isAdmin, normalizeRoleName } from '@/utils/authUtil';
import { saveEmployeePreview } from '@/utils/employeePreview';
import { STORAGE_URL } from '@/configs/environment.config';
import type { User } from '@/types/authType';

export function EmployeePreviewButton({
  employee
}: {
  employee: { id: string; name: string; role?: { role_name?: string } | null };
}) {
  const { user, token } = useStore(authStore);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm<{ password: string }>();
  if (
    user?.is_preview ||
    normalizeRoleName(user?.role.name ?? '') !== 'super admin' ||
    isAdmin(employee.role?.role_name ?? '') ||
    employee.id === user?.id
  )
    return null;

  const close = () => {
    if (loading) return;
    setOpen(false);
    setError('');
    form.resetFields();
  };
  const start = async ({ password }: { password: string }) => {
    if (loading || !token) return;
    setLoading(true);
    setError('');
    try {
      const response = await axiosPrivate.post<
        never,
        {
          token: string;
          preview_expires_at: string;
          id: string;
          name: string;
          gender: User['gender'];
          role_id: number;
          role_name: string;
          permissions: User['permissions'];
          image?: string;
        }
      >('/api/employee-preview', { employee_id: employee.id, password });
      form.resetFields();
      if (localStorage.getItem('token') !== token) {
        throw new Error('Phiên quản trị đã thay đổi. Vui lòng tải lại trang.');
      }
      saveEmployeePreview({
        token: response.token,
        parentToken: token,
        expiresAt: response.preview_expires_at,
        user: {
          id: response.id,
          name: response.name,
          gender: response.gender,
          role: { id: String(response.role_id), name: response.role_name },
          permissions: response.permissions,
          is_preview: true,
          image_url: response.image
            ? `${STORAGE_URL}/${response.image}`
            : undefined
        }
      });
      window.location.assign('/employee/attendances');
    } catch (cause) {
      const response = (cause as { response?: { status?: number } }).response;
      setError(
        response?.status === 422
          ? 'Mật khẩu quản trị không đúng. Vui lòng nhập lại.'
          : response?.status === 429
            ? 'Bạn đã thử quá nhiều lần. Vui lòng chờ một phút.'
            : 'Không mở được phiên xem. Vui lòng kiểm tra quyền hoặc tải lại trang.'
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Tooltip title="Xem với tư cách nhân viên">
        <Button
          tone="inherit"
          aria-label={`Xem với tư cách ${employee.name}`}
          icon={<EyeOutlined />}
          onClick={() => setOpen(true)}
        />
      </Tooltip>
      <Modal
        open={open}
        title="Xem với tư cách nhân viên"
        onCancel={close}
        onOk={() => form.submit()}
        confirmLoading={loading}
        cancelButtonProps={{ disabled: loading }}
        okText="Bắt đầu xem"
        cancelText="Hủy"
        destroyOnClose
      >
        <p className="mb-3">
          {employee.name} · {employee.id}
        </p>
        <Alert
          type="info"
          showIcon
          message="Chỉ xem trong tối đa 15 phút"
          description="Xem lịch làm việc, chấm công, bảng lương và đơn yêu cầu. Không thay đổi dữ liệu hoặc ảnh hưởng phiên đăng nhập của nhân viên."
          className="mb-4"
        />
        <Form form={form} layout="vertical" onFinish={start} preserve={false}>
          <Form.Item
            name="password"
            label="Mật khẩu quản trị của bạn"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu quản trị.' }
            ]}
          >
            <Input.Password
              autoComplete="current-password"
              disabled={loading}
            />
          </Form.Item>
        </Form>
        {error && <Alert type="error" showIcon message={error} />}
      </Modal>
    </>
  );
}
