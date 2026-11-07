import React from 'react';
import { Modal, Space, Typography } from 'antd';
import Button from '@components/common/AppButton';
import { BellOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNotificationPermission } from '@hooks/useNotificationPermission';

const { Text } = Typography;

interface NotificationPermissionModalProps {
  open: boolean;
  onCancel: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  title?: string;
  content?: string;
}

export const NotificationPermissionModal: React.FC<
  NotificationPermissionModalProps
> = ({
  open,
  onCancel,
  onPermissionGranted,
  onPermissionDenied,
  title = 'Cấp quyền thông báo',
  content = 'Ứng dụng muốn gửi thông báo để bạn không bỏ lỡ thông tin quan trọng. Bạn có muốn cho phép không?'
}) => {
  const { permission, isSupported, requestPermission, isLoading } =
    useNotificationPermission();

  const handleAllow = async () => {
    const result = await requestPermission();

    if (result === 'granted') {
      onPermissionGranted?.();
      onCancel();
    } else if (result === 'denied') {
      onPermissionDenied?.();
    }
  };

  const handleDeny = () => {
    onPermissionDenied?.();
    onCancel();
  };

  if (!isSupported) {
    return (
      <Modal
        open={open}
        onCancel={onCancel}
        footer={[
          <Button tone="inherit" key="ok" type="primary" onClick={onCancel}>
            Đã hiểu
          </Button>
        ]}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            Không hỗ trợ thông báo
          </Space>
        }
      >
        <Text>Trình duyệt của bạn không hỗ trợ thông báo đẩy.</Text>
      </Modal>
    );
  }

  if (permission === 'granted') {
    return (
      <Modal
        open={open}
        onCancel={onCancel}
        footer={[
          <Button tone="inherit" key="ok" type="primary" onClick={onCancel}>
            Đóng
          </Button>
        ]}
        title={
          <Space>
            <BellOutlined style={{ color: '#52c41a' }} />
            Đã được cấp quyền
          </Space>
        }
      >
        <Text>Bạn đã cấp quyền thông báo cho ứng dụng.</Text>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={[
        <Button tone="inherit" key="deny" onClick={handleDeny}>
          Không cho phép
        </Button>,
        <Button
          tone="inherit"
          key="allow"
          type="primary"
          icon={<BellOutlined />}
          loading={isLoading}
          onClick={handleAllow}
        >
          Cho phép
        </Button>
      ]}
      title={
        <Space>
          <BellOutlined style={{ color: '#1890ff' }} />
          {title}
        </Space>
      }
    >
      <Space direction="vertical" size="middle">
        <Text>{content}</Text>
        {permission === 'denied' && (
          <Text type="secondary">
            Lưu ý: Bạn có thể thay đổi quyền này trong cài đặt trình duyệt.
          </Text>
        )}
      </Space>
    </Modal>
  );
};
