import { User } from '@/types/authType';
import { isAllowRole } from '@utils/authUtil';
import { useEffect, useState } from 'react';
import {
  NotificationPermissionStatus,
  useNotificationPermission
} from './useNotificationPermission';

interface UseAdminNotificationRequestReturn {
  shouldShowModal: boolean;
  hideModal: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<NotificationPermissionStatus>;
  isLoading: boolean;
}

export function useNotificationRequest(
  user: User | null,
  isAuthenticated: boolean
): UseAdminNotificationRequestReturn {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const {
    permission,
    requestPermission: requestNotificationPermission,
    isLoading,
    isSupported
  } = useNotificationPermission();

  useEffect(() => {
    // Chỉ hiển thị modal cho admin
    if (
      !isAuthenticated ||
      !user ||
      !isAllowRole(user, ['super admin', 'qa-qc', 'qc', 'tổ trưởng qc', 23])
    ) {
      return;
    }

    // Kiểm tra nếu trình duyệt không hỗ trợ
    if (!isSupported) {
      return;
    }

    // Kiểm tra nếu đã có quyền
    if (permission === 'granted') {
      return;
    }

    // Kiểm tra xem đã từng yêu cầu chưa
    const hasRequested = localStorage.getItem('admin_notification_requested');
    const lastRequestTime = localStorage.getItem(
      'admin_notification_request_time'
    );

    // Nếu đã từ chối và chưa qua 24h, không hỏi lại
    if (permission === 'denied' && lastRequestTime) {
      const daysSinceLastRequest =
        (Date.now() - parseInt(lastRequestTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastRequest < 1) {
        return;
      }
    }

    // Nếu chưa từng yêu cầu hoặc permission là 'default', hiển thị modal
    if (!hasRequested || permission === 'default') {
      // AppLayout handles ordering; no additional delay before enqueueing.
      setShouldShowModal(true);
    }
  }, [isAuthenticated, user, permission, isSupported]);

  const hideModal = () => {
    setShouldShowModal(false);
    // Đánh dấu đã yêu cầu
    localStorage.setItem('admin_notification_requested', 'true');
    localStorage.setItem(
      'admin_notification_request_time',
      Date.now().toString()
    );
  };

  const requestPermission = async () => {
    const result = await requestNotificationPermission();

    // Lưu trạng thái
    localStorage.setItem('admin_notification_requested', 'true');
    localStorage.setItem(
      'admin_notification_request_time',
      Date.now().toString()
    );

    if (result === 'granted') {
      setShouldShowModal(false);
    }

    return result;
  };

  return {
    shouldShowModal,
    hideModal,
    hasPermission: permission === 'granted',
    requestPermission,
    isLoading
  };
}
