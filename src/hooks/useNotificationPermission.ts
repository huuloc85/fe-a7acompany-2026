import { useState, useEffect } from 'react';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

export interface UseNotificationPermissionReturn {
  permission: NotificationPermissionStatus;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermissionStatus>;
  isLoading: boolean;
}

export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [permission, setPermission] = useState<NotificationPermissionStatus>(
    () =>
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'denied'
  );
  const [isLoading, setIsLoading] = useState(false);

  // Kiểm tra xem trình duyệt có hỗ trợ Notification API không
  const isSupported = 'Notification' in window;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = async (): Promise<NotificationPermissionStatus> => {
    if (!isSupported) {
      return 'denied';
    }

    if (permission === 'granted') {
      return 'granted';
    }

    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Lỗi khi yêu cầu quyền thông báo:', error);
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    isLoading
  };
}
