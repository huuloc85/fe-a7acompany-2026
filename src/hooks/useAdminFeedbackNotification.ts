import { useEffect } from 'react';
import { useStore } from '@tanstack/react-store';
import { useQueryClient } from '@tanstack/react-query';
import { echo } from '@utils/lib/echo';
import { sendNotification } from '@utils/notificationUtil';
import {
  feedbackNotificationStore,
  addFeedbackNotification,
  clearFeedbackNotifications
} from '@stores/feedbackNotificationStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackCreatedPayload = {
  id: number;
  employee_id: string;
  type: string;
  subject: string;
  status: string;
  created_at: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook cho admin — lắng nghe khi employee gửi góp ý mới.
 * Channel: feedback.admin / Event: feedback.created
 */
export function useAdminFeedbackNotification(enabled: boolean) {
  const queryClient = useQueryClient();
  const { items: notifications } = useStore(feedbackNotificationStore);

  useEffect(() => {
    if (!enabled) return;

    const channelName = 'feedback.admin';
    const eventName = '.feedback.created';
    const channel = echo.channel(channelName);

    const handler = (payload: FeedbackCreatedPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      addFeedbackNotification({
        id: payload.id,
        subject: payload.subject,
        status: 'resolved', // placeholder — admin sẽ xử lý
        admin_reply: '',
        replied_at: payload.created_at
      });

      sendNotification('Góp ý mới từ nhân viên', {
        body: `"${payload.subject}" — ${payload.type === 'bug' ? 'Báo lỗi' : payload.type === 'complaint' ? 'Khiếu nại' : 'Góp ý'}`,
        tag: `feedback-new-${payload.id}`
      });
    };

    channel.listen(eventName, handler);

    return () => {
      channel.stopListening(eventName);
      echo.leaveChannel(channelName);
    };
  }, [enabled, queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    clearAll: clearFeedbackNotifications
  };
}
