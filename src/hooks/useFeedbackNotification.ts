import { useEffect, useRef } from 'react';
import { useStore } from '@tanstack/react-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sendNotification } from '@utils/notificationUtil';
import { echo } from '@utils/lib/echo';
import { fetchMyFeedbacks } from '@services/FeedbackService';
import {
  feedbackNotificationStore,
  addFeedbackNotification,
  markAllFeedbackNotificationsRead,
  clearFeedbackNotifications
} from '@stores/feedbackNotificationStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackRepliedPayload = {
  id: number;
  subject: string;
  type: string;
  status: 'resolved' | 'rejected';
  admin_reply: string;
  replied_by: string;
  replied_at: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook cho employee — lắng nghe khi góp ý được phản hồi.
 * @param enabled - true nếu user là employee
 * @param userId - employee id để subscribe Echo channel
 */
export function useFeedbackNotification(enabled: boolean, userId?: string) {
  const queryClient = useQueryClient();
  const { items: notifications } = useStore(feedbackNotificationStore);
  const prevStatusMapRef = useRef<Map<number, string>>(new Map());
  const isFirstLoadRef = useRef(true);

  // ── 1. Realtime via Echo ──────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !userId) return;

    const channelName = `feedback.employee.${userId}`;
    const eventName = '.feedback.replied';
    const channel = echo.channel(channelName);

    const handler = (payload: FeedbackRepliedPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['my-feedbacks'] });
      const statusLabel =
        payload.status === 'resolved' ? 'đã xử lý ✓' : 'bị từ chối ✕';

      addFeedbackNotification({
        id: payload.id,
        subject: payload.subject,
        status: payload.status,
        admin_reply: payload.admin_reply || '',
        replied_at: payload.replied_at || new Date().toISOString()
      });

      sendNotification('Góp ý của bạn ' + statusLabel, {
        body: `"${payload.subject}" — ${payload.admin_reply || 'Đã được phản hồi'}`,
        tag: `feedback-${payload.id}`
      });
    };

    channel.listen(eventName, handler);

    return () => {
      channel.stopListening(eventName);
      echo.leaveChannel(channelName);
    };
  }, [enabled, userId, queryClient]);

  // ── 2. Polling backup (mỗi 60s) ──────────────────────────────────────

  const { data } = useQuery({
    queryKey: ['my-feedbacks-poll'],
    queryFn: () => fetchMyFeedbacks({ per_page: 50 }),
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true
  });

  useEffect(() => {
    if (!data?.data) return;

    const feedbacks = data.data;
    const newStatusMap = new Map<number, string>();
    feedbacks.forEach((fb) => newStatusMap.set(fb.id, fb.status));

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      prevStatusMapRef.current = newStatusMap;
      return;
    }

    feedbacks.forEach((fb) => {
      const prevStatus = prevStatusMapRef.current.get(fb.id);
      if (!prevStatus) return;

      const isNewlyProcessed =
        (prevStatus === 'pending' || prevStatus === 'reviewed') &&
        (fb.status === 'resolved' || fb.status === 'rejected');

      if (isNewlyProcessed) {
        addFeedbackNotification({
          id: fb.id,
          subject: fb.subject,
          status: fb.status as 'resolved' | 'rejected',
          admin_reply: fb.admin_reply || '',
          replied_at: fb.replied_at || new Date().toISOString()
        });
      }
    });

    prevStatusMapRef.current = newStatusMap;
  }, [data]);

  // ── Return ────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAllRead: markAllFeedbackNotificationsRead,
    clearAll: clearFeedbackNotifications
  };
}
