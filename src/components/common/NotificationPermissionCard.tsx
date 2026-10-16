import React from 'react';
import { Button, Card, Space, Typography, Alert } from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNotificationPermission } from '@hooks/useNotificationPermission';

const { Title, Text } = Typography;

interface NotificationPermissionCardProps {
  title?: string;
  description?: string;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  showStatusAlert?: boolean;
}

export const NotificationPermissionCard: React.FC<
  NotificationPermissionCardProps
> = ({
  title = 'Quyền thông báo',
  description = 'Cho phép ứng dụng gửi thông báo để bạn không bỏ lỡ thông tin quan trọng',
  onPermissionGranted,
  onPermissionDenied,
  showStatusAlert = true
}) => {
  const { permission, isSupported, requestPermission, isLoading } =
    useNotificationPermission();

  const handleRequestPermission = async () => {
    const result = await requestPermission();

    if (result === 'granted') {
      onPermissionGranted?.();
    } else if (result === 'denied') {
      onPermissionDenied?.();
    }
  };

  const getStatusText = () => {
    switch (permission) {
      case 'granted':
        return 'Đã cho phép';
      case 'denied':
        return 'Đã từ chối';
      default:
        return 'Chưa được yêu cầu';
    }
  };

  const getStatusIcon = () => {
    switch (permission) {
      case 'granted':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'denied':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <BellOutlined style={{ color: '#faad14' }} />;
    }
  };

  if (!isSupported) {
    return (
      <Card className="ui-card liquid-glass-card !rounded-2xl">
        <Alert
          message="Không hỗ trợ"
          description="Trình duyệt của bạn không hỗ trợ thông báo đẩy"
          type="warning"
          icon={<CloseCircleOutlined />}
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card className="ui-card liquid-glass-card !rounded-2xl">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BellOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            <Text type="secondary">{description}</Text>
          </div>
        </div>

        {showStatusAlert && (
          <Alert
            message={`Trạng thái: ${getStatusText()}`}
            type={
              permission === 'granted'
                ? 'success'
                : permission === 'denied'
                  ? 'error'
                  : 'info'
            }
            icon={getStatusIcon()}
            showIcon
          />
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {permission !== 'granted' && (
            <Button
              type="primary"
              icon={<BellOutlined />}
              loading={isLoading}
              onClick={handleRequestPermission}
              disabled={permission === 'denied'}
            >
              {permission === 'denied' ? 'Đã bị từ chối' : 'Cho phép thông báo'}
            </Button>
          )}

          {permission === 'granted' && (
            <Button type="default" icon={<CheckCircleOutlined />} disabled>
              Đã được cấp quyền
            </Button>
          )}
        </div>

        {permission === 'denied' && (
          <Alert
            message="Hướng dẫn cấp quyền thủ công"
            description={
              <div>
                <p>Để bật thông báo, bạn cần:</p>
                <ol>
                  <li>Nhấp vào biểu tượng khóa bên cạnh URL</li>
                  <li>Chọn "Cho phép" cho mục Thông báo</li>
                  <li>Tải lại trang</li>
                </ol>
              </div>
            }
            type="info"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};
