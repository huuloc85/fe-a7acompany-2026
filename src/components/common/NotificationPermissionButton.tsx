import React, { useState } from 'react';
import { Space } from 'antd';
import Button from '@components/common/AppButton';
import { BellOutlined } from '@ant-design/icons';
import { useNotificationPermission } from '@hooks/useNotificationPermission';

interface NotificationPermissionButtonProps {
  variant?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  size?: 'small' | 'middle' | 'large';
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  children?: React.ReactNode;
  showTestButton?: boolean;
}

export const NotificationPermissionButton: React.FC<
  NotificationPermissionButtonProps
> = ({
  variant = 'primary',
  size = 'middle',
  onPermissionGranted,
  onPermissionDenied,
  children,
  showTestButton = false
}) => {
  const { permission, isSupported, requestPermission, isLoading } =
    useNotificationPermission();
  const [testLoading, setTestLoading] = useState(false);

  const handleRequestPermission = async () => {
    const result = await requestPermission();

    if (result === 'granted') {
      onPermissionGranted?.();
    } else if (result === 'denied') {
      onPermissionDenied?.();
    }
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      return;
    }

    setTestLoading(true);

    try {
      new Notification('Thông báo thử nghiệm', {
        body: 'Đây là thông báo thử nghiệm từ ứng dụng!',
        icon: '/logo.svg',
        badge: '/logo.svg',
        data: { type: 'test' }
      });
    } catch (error) {
      console.error('Lỗi khi gửi thông báo thử nghiệm:', error);
    } finally {
      setTimeout(() => setTestLoading(false), 1000);
    }
  };

  const getButtonText = () => {
    if (children) return children;

    switch (permission) {
      case 'granted':
        return 'Đã được cấp quyền';
      case 'denied':
        return 'Đã bị từ chối';
      default:
        return 'Yêu cầu quyền thông báo';
    }
  };

  const getButtonProps = () => {
    const baseProps = {
      icon: <BellOutlined />,
      size,
      loading: isLoading
    };

    switch (permission) {
      case 'granted':
        return {
          ...baseProps,
          type: 'default' as const,
          disabled: true
        };
      case 'denied':
        return {
          ...baseProps,
          type: 'default' as const,
          disabled: true
        };
      default:
        return {
          ...baseProps,
          type: variant,
          onClick: handleRequestPermission
        };
    }
  };

  if (!isSupported) {
    return (
      <Button tone="inherit" disabled icon={<BellOutlined />} size={size}>
        Không hỗ trợ
      </Button>
    );
  }

  return (
    <Space size="small">
      <Button tone="inherit" {...getButtonProps()}>
        {getButtonText()}
      </Button>

      {showTestButton && permission === 'granted' && (
        <Button
          tone="inherit"
          type="dashed"
          size={size}
          loading={testLoading}
          onClick={handleTestNotification}
        >
          Thử nghiệm
        </Button>
      )}
    </Space>
  );
};
