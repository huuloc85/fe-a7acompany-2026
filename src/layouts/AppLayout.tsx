import { Outlet } from '@tanstack/react-router';
import {
  ConfigProvider,
  Layout,
  theme as antTheme,
  message,
  Modal
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BirthdayModal from '@components/BirthdayModal';
import CleaningDutyModal from '@components/CleaningDuty/CleaningDutyModal';
import MarqueeAlert from '@components/MarqueeText';
import { NotificationRequestModal } from '@components/common/NotificationRequestModal';
import FallingStars from '@components/holiday/FallingStars';
import HolidayGreetingModal from '@components/holiday/HolidayGreetingModal';
import { useBirthdayNotification } from '@hooks/useBirthdayNotification';
import { useCleaningDutyNotification } from '@hooks/useCleaningDutyNotification';
import { useForcedLogoutNotification } from '@hooks/useForcedLogoutNotification';
import { useHolidayMode } from '@hooks/useHolidayMode';
import { useNotificationRequest } from '@hooks/useAdminNotificationRequest';
import AppFooter from '@partials/Footer';
import Header from '@partials/Header';
import Sidebar from '@partials/Sidebar';
import { fetchNotifications } from '@services/NotificationService';
import {
  hasAppearancePreference,
  setAppearance,
  uiStore,
  updateScreenSize
} from '@stores/uiStore';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Route } from '@routes/__root';
import { motion } from 'framer-motion';
import { useStore } from '@tanstack/react-store';
import { FaMagic, FaRegWindowMaximize, FaTint } from 'react-icons/fa';

const { Content } = Layout;

type LoginModalKey =
  | 'cleaningDuty'
  | 'birthday'
  | 'notificationRequest'
  | 'appearance'
  | 'holiday';

const MODAL_CLOSE_ANIMATION_MS = 220;
const LOGIN_MODAL_ROOT_CLASS = 'login-modal-sequence-root';

function AppLayout() {
  const { appearance, isMobile, isSidebarClose } = useStore(uiStore);
  const isLiquidAppearance = appearance === 'liquid';

  useEffect(() => {
    window.addEventListener('resize', updateScreenSize);
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);

  useEffect(() => {
    const sidebarWidth = isMobile ? '0px' : isSidebarClose ? '80px' : '256px';
    document.documentElement.style.setProperty(
      '--app-sidebar-width',
      sidebarWidth
    );

    return () => {
      document.documentElement.style.removeProperty('--app-sidebar-width');
    };
  }, [isMobile, isSidebarClose]);

  const {
    token: { borderRadiusLG }
  } = antTheme.useToken();

  // ── Holiday mode (30/4 – 1/5) ──
  const { isHoliday } = useHolidayMode();
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showAppearancePrompt, setShowAppearancePrompt] = useState(false);

  useEffect(() => {
    if (hasAppearancePreference()) return;

    const timer = window.setTimeout(() => {
      setShowAppearancePrompt(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isHoliday) return;
    const key = `holiday-modal-dismissed-${new Date().getFullYear()}`;
    if (!localStorage.getItem(key)) {
      // Delay slightly so the page loads first
      const t = setTimeout(() => setShowHolidayModal(true), 1500);
      return () => clearTimeout(t);
    }
  }, [isHoliday]);

  const handleHolidayModalClose = useCallback(() => {
    setShowHolidayModal(false);
    const key = `holiday-modal-dismissed-${new Date().getFullYear()}`;
    localStorage.setItem(key, '1');
  }, []);

  // Get authenticated user context
  const { authenticated } = Route.useRouteContext();
  const { user } = authenticated;
  useForcedLogoutNotification();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'banner'],
    queryFn: () => {
      return fetchNotifications({ 'filter[is_show]': 1 });
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: 30 * 1000
  });

  // Use cleaning duty notification hook
  const {
    modalOpen,
    currentDuties: currentDuty,
    handleClose,
    handleDontShowAgain
  } = useCleaningDutyNotification();

  // Use birthday notification hook
  const {
    shouldShow: showBirthdayModal,
    todayBirthdays,
    markAsShown: markBirthdayAsShown
  } = useBirthdayNotification();

  // Use admin notification request hook
  const {
    shouldShowModal: showNotificationModal,
    hideModal: hideNotificationModal,
    requestPermission,
    isLoading: notificationLoading
  } = useNotificationRequest(user, true);

  const handleAllowNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      message.success('Đã bật thông báo thành công!');
    } else if (result === 'denied') {
      message.warning('Quyền thông báo đã bị từ chối');
    }

    if (result !== 'granted') {
      hideNotificationModal();
    }
  };

  const handleUseLiquidAppearance = () => {
    setAppearance('liquid');
    setShowAppearancePrompt(false);
  };

  const handleKeepDefaultAppearance = () => {
    setAppearance('classic');
    setShowAppearancePrompt(false);
  };

  const messages = useMemo(
    () =>
      notifications?.data
        .filter(
          (notification) =>
            !notification.message
              .normalize('NFC')
              .trim()
              .toLocaleLowerCase('vi')
              .startsWith('hệ thống đã cập nhật mã nhân viên.')
        )
        .map((notification) => notification.message) || [],
    [notifications?.data]
  );
  const isCurrentUserBirthday = todayBirthdays.some(
    (employee) => String(employee.id) === String(user?.id)
  );
  const shouldShowCleaningDutyModal =
    modalOpen && (currentDuty ?? []).length > 0;
  const shouldShowBirthdayNotificationModal =
    showBirthdayModal && todayBirthdays.length > 0;
  const shouldShowNotificationRequestModal = showNotificationModal;
  const shouldShowHolidayGreetingModal = isHoliday && showHolidayModal;
  const [activeLoginModal, setActiveLoginModal] =
    useState<LoginModalKey | null>(null);
  const [closingLoginModal, setClosingLoginModal] =
    useState<LoginModalKey | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const visibleLoginModalsRef = useRef<LoginModalKey[]>([]);
  const visibleLoginModals = useMemo(() => {
    const modalQueue: LoginModalKey[] = [];

    if (shouldShowCleaningDutyModal) modalQueue.push('cleaningDuty');
    if (shouldShowBirthdayNotificationModal) modalQueue.push('birthday');
    if (shouldShowNotificationRequestModal) {
      modalQueue.push('notificationRequest');
    }
    if (showAppearancePrompt) modalQueue.push('appearance');
    if (shouldShowHolidayGreetingModal) modalQueue.push('holiday');

    return modalQueue;
  }, [
    shouldShowBirthdayNotificationModal,
    shouldShowCleaningDutyModal,
    shouldShowHolidayGreetingModal,
    shouldShowNotificationRequestModal,
    showAppearancePrompt
  ]);

  useEffect(() => {
    visibleLoginModalsRef.current = visibleLoginModals;
  }, [visibleLoginModals]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (activeLoginModal && visibleLoginModals.includes(activeLoginModal)) {
      return;
    }

    if (closingLoginModal) {
      return;
    }

    if (activeLoginModal) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      setClosingLoginModal(activeLoginModal);
      setActiveLoginModal(null);

      closeTimerRef.current = window.setTimeout(() => {
        setClosingLoginModal(null);
        setActiveLoginModal(visibleLoginModalsRef.current[0] ?? null);
        closeTimerRef.current = null;
      }, MODAL_CLOSE_ANIMATION_MS);

      return;
    }

    if (visibleLoginModals.length > 0) {
      setActiveLoginModal(visibleLoginModals[0] ?? null);
    }
  }, [activeLoginModal, closingLoginModal, visibleLoginModals]);

  const isCleaningDutyModalRendered =
    shouldShowCleaningDutyModal || closingLoginModal === 'cleaningDuty';
  const isBirthdayModalRendered =
    shouldShowBirthdayNotificationModal || closingLoginModal === 'birthday';
  const isNotificationRequestModalRendered =
    shouldShowNotificationRequestModal ||
    closingLoginModal === 'notificationRequest';
  const isHolidayGreetingModalRendered =
    shouldShowHolidayGreetingModal || closingLoginModal === 'holiday';
  const isLoginModalSequenceVisible =
    activeLoginModal !== null || closingLoginModal !== null;
  const loginModalMotionProps = {
    forceRender: true,
    mask: false,
    rootClassName: LOGIN_MODAL_ROOT_CLASS
  };

  return (
    <>
      <ConfigProvider
        popupOverflow="viewport"
        theme={{
          token: {
            borderRadius: 12,
            borderRadiusLG: 16,
            colorPrimary: '#2563eb',
            colorBgContainer: 'rgba(255, 255, 255, 0.72)',
            colorBorderSecondary: 'rgba(148, 163, 184, 0.22)',
            boxShadowSecondary: '0 14px 34px rgba(15, 23, 42, 0.08)'
          },
          components: {
            Table: isLiquidAppearance
              ? {
                  headerBg: '#eef7ff',
                  headerColor: '#1f2937',
                  borderColor: 'rgba(125, 169, 215, 0.26)',
                  bodySortBg: '#f6fbff',
                  footerBg: '#f6fbff',
                  rowHoverBg: '#eef7ff',
                  rowSelectedBg: '#e2f0ff',
                  rowSelectedHoverBg: '#d9ebff',
                  rowExpandedBg: '#f6fbff'
                }
              : {}
          }
        }}
      >
        <Layout
          className="glass-app-shell"
          style={{
            minHeight: '100vh',
            borderRadius: borderRadiusLG
          }}
          hasSider
        >
          <Sidebar />
          <Layout>
            <Header />
            <Content style={{ overflow: 'initial' }} className="glass-main p-4">
              {messages.length > 0 && (
                <div className="mb-4">
                  <MarqueeAlert messages={messages} />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </Content>
            <AppFooter />
          </Layout>
        </Layout>
      </ConfigProvider>

      <div
        aria-hidden="true"
        className={`login-modal-sequence-backdrop ${
          isLoginModalSequenceVisible
            ? 'login-modal-sequence-backdrop--open'
            : ''
        }`}
      />

      {/* Cleaning Duty Modal */}
      {isCleaningDutyModalRendered && (
        <CleaningDutyModal
          {...loginModalMotionProps}
          open={activeLoginModal === 'cleaningDuty'}
          onClose={handleClose}
          duties={currentDuty ?? []}
          onDontShowAgain={handleDontShowAgain}
        />
      )}

      {/* Birthday Modal - Show when there are birthdays today and hasn't been shown yet */}
      {isBirthdayModalRendered && (
        <BirthdayModal
          {...loginModalMotionProps}
          open={activeLoginModal === 'birthday'}
          employees={todayBirthdays.map((employee) => employee.name)}
          isCurrentUserBirthday={isCurrentUserBirthday}
          currentUserName={user?.name}
          companyName="Công Ty Vinh Vinh Phát"
          onClose={markBirthdayAsShown}
          autoCloseMs={10000} // 10 seconds auto close
        />
      )}

      {/* Admin Notification Request Modal */}
      {isNotificationRequestModalRendered && (
        <NotificationRequestModal
          {...loginModalMotionProps}
          open={activeLoginModal === 'notificationRequest'}
          onAllow={handleAllowNotifications}
          onDeny={hideNotificationModal}
          loading={notificationLoading}
        />
      )}

      <Modal
        {...loginModalMotionProps}
        open={activeLoginModal === 'appearance'}
        title={
          <div className="appearance-choice-modal__title">
            <span className="appearance-choice-modal__title-icon">
              <FaMagic />
            </span>
            <span>Chọn giao diện bạn muốn dùng</span>
          </div>
        }
        className="appearance-choice-modal"
        width={520}
        footer={null}
        centered
        onCancel={handleKeepDefaultAppearance}
      >
        <p className="appearance-choice-modal__description">
          Bạn có thể giữ giao diện cũ quen thuộc hoặc thử giao diện mới mềm và
          trong hơn.
        </p>

        <div className="appearance-choice-modal__options">
          <button
            type="button"
            aria-label="Giữ giao diện cũ"
            className="appearance-choice-option appearance-choice-option--classic"
            onClick={handleKeepDefaultAppearance}
          >
            <span className="appearance-choice-option__icon">
              <FaRegWindowMaximize />
            </span>
            <span className="appearance-choice-option__content">
              <span className="appearance-choice-option__label">
                Giao diện cũ
              </span>
              <span className="appearance-choice-option__text">
                Gọn, quen thuộc và nhẹ.
              </span>
            </span>
          </button>

          <button
            type="button"
            aria-label="Dùng giao diện mới"
            className="appearance-choice-option appearance-choice-option--liquid"
            onClick={handleUseLiquidAppearance}
          >
            <span className="appearance-choice-option__icon">
              <FaTint />
            </span>
            <span className="appearance-choice-option__content">
              <span className="appearance-choice-option__label">
                Giao diện mới
              </span>
              <span className="appearance-choice-option__text">
                Hiệu ứng giọt nước trong và mềm hơn.
              </span>
            </span>
          </button>
        </div>
      </Modal>

      {/* ── Holiday Decorations (30/4 – 1/5) ── */}
      {isHoliday && <FallingStars count={30} />}
      {isHolidayGreetingModalRendered && (
        <HolidayGreetingModal
          {...loginModalMotionProps}
          open={activeLoginModal === 'holiday'}
          onClose={handleHolidayModalClose}
          autoCloseMs={12000}
        />
      )}
    </>
  );
}

export default AppLayout;
