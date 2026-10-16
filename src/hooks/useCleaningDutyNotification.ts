import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CleaningDuty } from '@components/CleaningDuty/CleaningDutyModal';
import {
  fetchTodaysCleaningDuties,
  shouldShowCleaningDutyNotification,
  hideCleaningDutyNotificationForToday
} from '@services/CleaningDutyService';
import { authStore } from '@stores/authStore';
import { isAdmin } from '@utils/authUtil';

export const useCleaningDutyNotification = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDuties, setCurrentDuties] = useState<CleaningDuty[] | null>(
    null
  );
  const [hasTriggeredAutoShow, setHasTriggeredAutoShow] = useState(false);

  // Only fetch if user is authenticated
  const isAuthenticated = authStore.state.isAuthenticated;
  const user = authStore.state.user;

  const { data: duties, isLoading } = useQuery({
    queryKey: ['todaysCleaningDuties', user?.id],
    queryFn: async () => await fetchTodaysCleaningDuties(),
    enabled: isAuthenticated && !!user && !isAdmin(user.role.name), // Only run query if user is authenticated and loaded
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2 // Only retry twice if API fails
  });

  // Check if we should show notification when duties are loaded and user is authenticated
  useEffect(() => {
    if (
      !isLoading &&
      duties &&
      isAuthenticated &&
      user &&
      !hasTriggeredAutoShow &&
      shouldShowCleaningDutyNotification()
    ) {
      // AppLayout sequences the dialogs once their data is ready.
      setCurrentDuties(duties);
      setModalOpen(true);
      setHasTriggeredAutoShow(true);
    }
  }, [duties, isLoading, isAuthenticated, user, hasTriggeredAutoShow]);

  const handleClose = () => {
    setModalOpen(false);
  };

  const handleDontShowAgain = (checked: boolean) => {
    if (checked) {
      hideCleaningDutyNotificationForToday();
    }
  };

  // Function to manually trigger the modal (for testing)
  const showModal = () => {
    setModalOpen(true);
  };

  return {
    modalOpen,
    currentDuties,
    isLoading,
    handleClose,
    handleDontShowAgain,
    showModal // For manual testing
  };
};
