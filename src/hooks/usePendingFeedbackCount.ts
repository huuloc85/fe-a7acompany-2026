import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllFeedbacks } from '@/services/FeedbackService';

export function usePendingFeedbackCount(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin-feedbacks', 'pending-count', user?.id],
    queryFn: async () => (await fetchAllFeedbacks({ status: 'pending' })).total,
    enabled: enabled && !!user && !user.is_preview,
    staleTime: 30_000,
    refetchInterval: 30_000
  });
}
