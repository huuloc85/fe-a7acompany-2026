import { Button, Tooltip } from 'antd';
import { BellOutlined, BellFilled } from '@ant-design/icons';
import { useNotificationPermission } from '@hooks/useNotificationPermission';
import { useActionTooltip } from '@/hooks/useActionTooltip';

interface NotificationStatusIndicatorProps {
  size?: 'small' | 'middle' | 'large';
  showText?: boolean;
}

export const NotificationStatusIndicator: React.FC<
  NotificationStatusIndicatorProps
> = ({ size = 'small', showText = false }) => {
  const { tooltipProps, triggerProps } = useActionTooltip();
  const { permission, requestPermission, isLoading, isSupported } =
    useNotificationPermission();

  if (!isSupported) {
    return null;
  }

  const getTooltipTitle = () => {
    switch (permission) {
      case 'granted':
        return 'Thông báo đã được bật';
      case 'denied':
        return 'Thông báo đã bị tắt - Vào cài đặt trình duyệt để bật lại';
      default:
        return 'Nhấp để bật thông báo';
    }
  };

  const getIcon = () => {
    return permission === 'granted' ? <BellFilled /> : <BellOutlined />;
  };

  const getButtonType = () => {
    switch (permission) {
      case 'granted':
        return 'default';
      case 'denied':
        return 'default';
      default:
        return 'primary';
    }
  };

  const handleClick = async () => {
    if (permission === 'default') {
      await requestPermission();
    }
  };

  const getText = () => {
    if (!showText) return null;

    switch (permission) {
      case 'granted':
        return 'Đã bật';
      case 'denied':
        return 'Đã tắt';
      default:
        return 'Bật thông báo';
    }
  };

  return (
    <Tooltip title={getTooltipTitle()} {...tooltipProps}>
      <Button
        {...triggerProps}
        aria-label={getTooltipTitle()}
        type={getButtonType()}
        icon={getIcon()}
        size={size}
        loading={isLoading}
        disabled={permission === 'denied'}
        onClick={handleClick}
        style={{
          color:
            permission === 'granted'
              ? '#52c41a'
              : permission === 'denied'
                ? '#ff4d4f'
                : undefined
        }}
      >
        {getText()}
      </Button>
    </Tooltip>
  );
};
