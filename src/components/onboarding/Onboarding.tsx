import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useActionTooltip } from '@/hooks/useActionTooltip';
import {
  OnboardingContext as Context,
  useOnboarding
} from './OnboardingContext';
import { Alert, App as AntApp, Button, Modal, Tooltip, Tour } from 'antd';
import { FaRegQuestionCircle } from 'react-icons/fa';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { authStore } from '@/stores/authStore';
import { toggleSidebar, uiStore } from '@/stores/uiStore';
import { isRequestFormSupervisor } from '@/utils/authUtil';
import { canUseGuide, canUseOnboarding } from './onboardingAccess';
import { businessGuides } from './businessGuides';
import {
  fetchOnboardingProgress,
  saveOnboardingProgress,
  type OnboardingProgress,
  type OnboardingProgressPatch,
  type OnboardingTaskKey
} from '@/services/OnboardingProgressService';
import { getApiErrorMessage } from '@/utils/apiError';
import './onboarding.css';

type Step = { id: string; title: string; description: string; target?: string };
const guides: { id: string; title: string; route: string; steps: Step[] }[] = [
  {
    id: 'profile',
    title: 'Hồ sơ và ảnh đại diện',
    route: '/profile',
    steps: [
      {
        id: 'identity',
        title: 'Kiểm tra hồ sơ',
        description:
          'Kiểm tra họ tên, mã nhân viên và chức vụ. Nếu thông tin chưa đúng hoặc không sửa được, liên hệ nhân sự.',
        target: 'profile-info'
      },
      {
        id: 'avatar',
        title: 'Cập nhật ảnh đại diện',
        description:
          'Bấm vào ảnh đại diện để chọn ảnh JPG hoặc PNG. Cắt ảnh cho vừa khung, xem lại rồi bấm “Lưu ảnh đại diện”.',
        target: 'profile-avatar'
      },
      {
        id: 'review',
        target: 'onboarding-help',
        title: 'Xác nhận đã kiểm tra hồ sơ',
        description:
          'Sau khi kiểm tra hồ sơ, mở mục hướng dẫn này và bấm “Tôi đã kiểm tra thông tin”. Nếu không cần đổi ảnh, chọn “Giữ ảnh hiện tại”.'
      }
    ]
  },
  {
    id: 'attendance',
    title: 'Xem chấm công',
    route: '/employee/attendances',
    steps: [
      {
        id: 'period',
        target: 'attendance-filters',
        title: 'Chọn kỳ chấm công',
        description:
          'Chọn tháng hoặc kỳ lương từ ngày 16 đến ngày 15 tháng sau để xem chấm công.'
      },
      {
        id: 'check',
        target: 'attendance-summary',
        title: 'Kiểm tra ngày công và tăng ca',
        description:
          'Xem tổng ngày công, giờ làm và tăng ca trong kỳ. Nếu số liệu chưa đúng, báo người phụ trách chấm công.'
      },
      {
        id: 'missing-attendance',
        target: 'attendance-forgotten',
        title: 'Kiểm tra kỹ những ngày quên chấm công',
        description:
          'Trong “Bảng tính công”, bật “Quên chấm công” để xem ngày thiếu giờ vào hoặc giờ ra. Trên điện thoại, nút này nằm cạnh biểu tượng cảnh báo. Kiểm tra kỹ từng ngày và ca làm; tắt bộ lọc để xem lại cả kỳ.'
      },
      {
        id: 'verify-missing-attendance',
        target: 'attendance-filters',
        title: 'Xem lại lịch sử quẹt',
        description:
          'Mở “Lịch sử quẹt” để kiểm tra giờ đã chấm và so lại với lịch làm việc. Ngày chưa đến hoặc ca chưa kết thúc có thể chưa đủ giờ vào, ra. Nếu vẫn thiếu, báo người phụ trách chấm công, ghi rõ ngày, ca và giờ cần kiểm tra.'
      }
    ]
  },
  {
    id: 'schedules',
    title: 'Xem lịch làm việc',
    route: '/employee/schedules',
    steps: [
      {
        id: 'view',
        target: 'schedule-search',
        title: 'Lịch của bạn',
        description:
          'Nhập tiêu đề để tìm lịch làm việc. Sau đó chọn lịch cần xem ở mục Đổi lịch làm việc.'
      },
      {
        id: 'select',
        target: 'schedule-select',
        title: 'Đổi lịch làm việc',
        description: 'Chọn lịch tại đây để xem ca làm và ngày nghỉ tương ứng.'
      },
      {
        id: 'cleaning-duty',
        target: 'schedule-cleaning-duty',
        title: 'Lịch trực vệ sinh',
        description:
          'Kéo xuống để xem lịch trực phòng ăn, đổ rác WC và trực WC theo khu vực. Các mục chỉ hiển thị khi bạn có lịch được phân công.'
      }
    ]
  },
  {
    id: 'salary',
    title: 'Xem phiếu lương',
    route: '/employee/salaries',
    steps: [
      {
        id: 'period',
        title: 'Chọn kỳ lương',
        target: 'salary-period',
        description:
          'Chọn kỳ lương cần xem. Danh sách chỉ có các kỳ đã công bố cho nhân viên.'
      },
      {
        id: 'details',
        target: 'salary-heading',
        title: 'Kiểm tra phiếu lương',
        description:
          'Kiểm tra thu nhập, các khoản khấu trừ và tiền thực lãnh. Nếu có khoản chưa rõ, liên hệ bộ phận tính lương.'
      }
    ]
  },
  {
    id: 'requests',
    title: 'Gửi và theo dõi đơn',
    route: '/employee/request-forms',
    steps: [
      {
        id: 'create',
        target: 'request-create',
        title: 'Tạo đơn',
        description:
          'Chọn loại đơn cần gửi, điền đầy đủ thông tin và kiểm tra người duyệt nếu có. Xem lại nội dung trước khi gửi.'
      },
      {
        id: 'track',
        target: 'request-filters',
        title: 'Tìm và theo dõi đơn',
        description:
          'Dùng bộ lọc để tìm đơn đã gửi. Xem trạng thái trong danh sách bên dưới để biết đơn đã được xử lý hay chưa.'
      }
    ]
  },
  ...businessGuides
];

const welcomeSteps: Step[] = [
  {
    id: 'profile',
    target: 'profile-menu',
    title: 'Bắt đầu từ hồ sơ cá nhân',
    description:
      'Kiểm tra thông tin và cập nhật ảnh đại diện trong Hồ sơ. Bạn có thể mở hướng dẫn riêng cho phần này từ nút dấu hỏi.'
  },
  {
    id: 'sidebar',
    target: 'navigation-menu',
    title: 'Mở và đóng menu',
    description:
      'Bấm nút menu ở góc trên để mở danh sách chức năng. Bấm lại nút này hoặc chọn một mục trong menu để đóng sidebar trên điện thoại.'
  },
  {
    id: 'permissions',
    target: 'navigation-menu',
    title: 'Các mục công việc',
    description:
      'Bấm nút này để mở menu và chọn công việc cần làm. Các mục hiển thị tùy theo quyền được cấp cho tài khoản.'
  },
  {
    id: 'help',
    title: 'Xem lại bất cứ lúc nào',
    description:
      'Bấm “Hoàn tất” để chọn hướng dẫn tiếp theo. Khi cần xem lại, bấm dấu hỏi trên thanh đầu trang.',
    target: 'onboarding-help'
  }
];

export function OnboardingHelpButton() {
  const { open } = useOnboarding();
  const { user } = useStore(authStore);
  const { tooltipProps, triggerProps } = useActionTooltip();
  if (!canUseOnboarding(user)) return null;
  return (
    <Tooltip title="Hướng dẫn sử dụng" {...tooltipProps}>
      <button
        {...triggerProps}
        type="button"
        data-tour="onboarding-help"
        aria-label="Hướng dẫn sử dụng"
        onClick={open}
        className="onboarding-help-btn header-action-btn liquid-glass-control relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-gray-300 dark:hover:text-white"
      >
        <FaRegQuestionCircle aria-hidden className="text-xl" />
      </button>
    </Tooltip>
  );
}

export function OnboardingProvider({
  children,
  blocked
}: {
  children: ReactNode;
  blocked: boolean;
}) {
  const { user } = useStore(authStore);
  return user && canUseOnboarding(user) ? (
    <Session key={user.id} userId={user.id} blocked={blocked}>
      {children}
    </Session>
  ) : (
    children
  );
}

function Session({
  children,
  userId,
  blocked
}: {
  children: ReactNode;
  userId: string;
  blocked: boolean;
}) {
  const { user } = useStore(authStore);
  const { message: antMessage } = AntApp.useApp();
  const { isMobile, isSidebarClose } = useStore(uiStore);
  const client = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const [helpOpen, setHelpOpen] = useState(false);
  const [invite, setInvite] = useState(false);
  const [guideId, setGuideId] = useState('welcome');
  const [tourOpen, setTourOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const [pendingTour, setPendingTour] = useState(false);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [startingGuide, setStartingGuide] = useState<string | null>(null);
  const startRequest = useRef(0);
  const overlayVisible = useRef(false);
  overlayVisible.current = !blocked && (helpOpen || invite);
  const finished = useRef(false);
  const prompted = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const active = () =>
    mounted.current &&
    authStore.state.user?.id === userId &&
    canUseOnboarding(authStore.state.user);
  const allowed = guides
    .filter((guide) => canUseGuide(user, guide.route))
    .map((guide) => {
      if (guide.id !== 'requests' || !isRequestFormSupervisor(user))
        return guide;
      return {
        ...guide,
        steps: [
          ...guide.steps,
          {
            id: 'supervisor',
            target: 'request-approval-tab',
            title: 'Duyệt đơn của nhân viên',
            description:
              'Mở mục “Duyệt đơn”, chọn đơn cần xử lý và đọc kỹ nội dung trước khi duyệt hoặc từ chối.'
          }
        ]
      };
    });
  const selected = allowed.find((guide) => guide.id === guideId);
  const steps =
    guideId === 'welcome'
      ? welcomeSteps.map((step) =>
          step.id === 'permissions'
            ? {
                ...step,
                description: `Tài khoản của bạn thuộc nhóm ${user?.role.name}. Bấm nút này để mở menu và chọn công việc cần làm. Các mục trong menu hiển thị theo quyền đã được cấp.`
              }
            : step
        )
      : (selected?.steps ?? []);
  const queryKey = ['onboarding', userId, guideId];
  const progress = useQuery({
    queryKey,
    queryFn: () => fetchOnboardingProgress(guideId),
    retry: false,
    staleTime: 0
  });
  const welcome = useQuery({
    queryKey: ['onboarding', userId, 'welcome'],
    queryFn: () => fetchOnboardingProgress('welcome'),
    retry: false
  });

  useEffect(() => {
    if (
      blocked ||
      helpOpen ||
      tourOpen ||
      prompted.current ||
      welcome.data?.status !== 'not_started'
    )
      return;
    // The layout already blocks onboarding while login dialogs are active.
    prompted.current = true;
    setInvite(true);
  }, [blocked, helpOpen, tourOpen, welcome.data?.status]);

  const performWrite = async (patch: OnboardingProgressPatch, id: string) => {
    if (!active()) return false;
    const guide = guides.find((item) => item.id === id);
    if (guide && !canUseGuide(authStore.state.user, guide.route)) return false;
    setSaving(true);
    try {
      const latest =
        client.getQueryData<OnboardingProgress>(['onboarding', userId, id]) ??
        (await fetchOnboardingProgress(id));
      if (!active()) return false;
      let next: OnboardingProgress;
      try {
        next = await saveOnboardingProgress(latest, patch);
      } catch (error) {
        // A second tab/device may have advanced the revision. Re-read once and
        // merge this queued update instead of surfacing a noisy 409 to users.
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        if (status !== 409) throw error;
        const fresh = await fetchOnboardingProgress(id);
        if (!active()) return false;
        next = await saveOnboardingProgress(fresh, patch);
      }
      if (!active()) return false;
      client.setQueryData(['onboarding', userId, id], next);
      return true;
    } catch (error) {
      // Refresh a stale revision without silently overwriting another device.
      if (active())
        void client.invalidateQueries({ queryKey: ['onboarding', userId, id] });
      if (active())
        antMessage.warning(
          getApiErrorMessage(
            error,
            'Chưa đồng bộ được tiến độ. Bạn vẫn có thể sử dụng web.'
          )
        );
      return false;
    } finally {
      if (active()) setSaving(false);
    }
  };
  const write = (patch: OnboardingProgressPatch, id = guideId) => {
    const pending = writes.current.then(() => performWrite(patch, id));
    writes.current = pending;
    return pending;
  };
  const recordTask = (task: OnboardingTaskKey) => {
    void write(
      { task_results: { [task]: new Date().toISOString() } },
      'profile'
    );
  };
  const closeTour = () => {
    setTourOpen(false);
    // Ant Tour invokes onClose immediately before onFinish on the final step.
    queueMicrotask(() => {
      if (!finished.current && active())
        void write({
          status: 'deferred',
          last_step_id: steps[current]?.id ?? null
        });
    });
  };
  const start = async (id: string) => {
    const guide = allowed.find((item) => item.id === id);
    if (
      id !== 'welcome' &&
      (!guide || !canUseGuide(authStore.state.user, guide.route))
    )
      return;
    const request = ++startRequest.current;
    setStartingGuide(id);
    setTourOpen(false);
    setPendingTour(false);
    try {
      // The mobile drawer must be closed before navigating/highlighting a page.
      // Otherwise the drawer remains above the tour mask and shifts the target.
      if (isMobile && !isSidebarClose) {
        toggleSidebar();
        await new Promise<void>((resolve) => window.setTimeout(resolve, 240));
      }
      const saved = await client.fetchQuery({
        queryKey: ['onboarding', userId, id],
        queryFn: () => fetchOnboardingProgress(id),
        staleTime: 30_000
      });
      if (!active() || request !== startRequest.current) return;
      if (guide) {
        if (!canUseGuide(authStore.state.user, guide.route)) return;
        await navigate({ to: guide.route });
      }
      if (!active() || request !== startRequest.current) return;
      const nextSteps = guide?.steps ?? welcomeSteps;
      const index = nextSteps.findIndex(
        (step) => step.id === saved.last_step_id
      );
      setGuideId(id);
      setCurrent(saved.status === 'completed' ? 0 : Math.max(0, index));
      finished.current = false;
      setOverlayClosing(overlayVisible.current);
      setPendingTour(true);
      setHelpOpen(false);
      setInvite(false);
      void write({ status: 'in_progress' }, id);
    } catch (error) {
      if (active() && request === startRequest.current)
        antMessage.warning(
          getApiErrorMessage(error, 'Chưa mở được hướng dẫn. Vui lòng thử lại.')
        );
    } finally {
      if (active() && request === startRequest.current) setStartingGuide(null);
    }
  };
  const onPage = !selected || pathname.replace(/\/$/, '') === selected.route;
  useEffect(() => {
    if (!pendingTour || overlayClosing || blocked || !onPage || !steps.length)
      return;
    setPendingTour(false);
    setTourOpen(true);
  }, [pendingTour, overlayClosing, blocked, onPage, steps.length]);
  const visible = tourOpen && !blocked && onPage && steps.length > 0;
  useEffect(() => {
    if (guideId !== 'welcome' && !selected) {
      ++startRequest.current;
      setStartingGuide(null);
      setPendingTour(false);
      setTourOpen(false);
      setGuideId('welcome');
      setCurrent(0);
    } else if (current >= steps.length) {
      setCurrent(Math.max(0, steps.length - 1));
    }
  }, [guideId, selected, current, steps.length]);
  const [highlightTarget, setHighlightTarget] = useState<HTMLElement | null>(
    null
  );
  const targetId = steps[current]?.target;
  useEffect(() => {
    if (!visible || !targetId) {
      setHighlightTarget(null);
      return;
    }
    let highlighted: HTMLElement | null = null;
    const refresh = () => {
      const element = document.querySelector<HTMLElement>(
        `[data-tour="${targetId}"]`
      );
      const next = element?.getClientRects().length ? element : null;
      if (highlighted === next) return;
      highlighted?.classList.remove('onboarding-highlight');
      highlighted = next;
      highlighted?.classList.add('onboarding-highlight');
      setHighlightTarget(next);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.getElementById('root') ?? document.body, {
      childList: true,
      subtree: true
    });
    window.addEventListener('resize', refresh);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      highlighted?.classList.remove('onboarding-highlight');
    };
  }, [visible, targetId, pathname]);

  return (
    <Context.Provider
      value={{
        open: () => {
          prompted.current = true;
          if (isMobile && !isSidebarClose) toggleSidebar();
          ++startRequest.current;
          setStartingGuide(null);
          setPendingTour(false);
          setInvite(false);
          setTourOpen(false);
          setHelpOpen(true);
        },
        recordTask
      }}
    >
      {children}
      <Modal
        title="Chào mừng bạn!"
        centered
        width={460}
        className="onboarding-welcome-modal"
        open={invite && !blocked}
        afterClose={() => setOverlayClosing(false)}
        onCancel={() => {
          ++startRequest.current;
          setStartingGuide(null);
          setInvite(false);
          void write({ status: 'deferred' }, 'welcome');
        }}
        footer={null}
      >
        <p className="onboarding-welcome-description">
          Cùng kiểm tra thông tin cá nhân và làm quen với các chức năng dành cho
          bạn.
        </p>
        <p className="onboarding-welcome-hint">
          Bạn có thể xem lại bất cứ lúc nào bằng nút dấu hỏi trên thanh đầu
          trang.
        </p>
        <div className="onboarding-welcome-actions">
          <Button
            type="primary"
            size="large"
            loading={startingGuide === 'welcome'}
            onClick={() => void start('welcome')}
          >
            Bắt đầu hướng dẫn
          </Button>
          <Button
            size="large"
            onClick={() => {
              ++startRequest.current;
              setStartingGuide(null);
              setInvite(false);
              void write({ status: 'deferred' }, 'welcome');
            }}
          >
            Để sau
          </Button>
        </div>
      </Modal>
      <Modal
        title="Hướng dẫn sử dụng"
        open={helpOpen && !blocked}
        afterClose={() => setOverlayClosing(false)}
        onCancel={() => {
          ++startRequest.current;
          setStartingGuide(null);
          setPendingTour(false);
          setHelpOpen(false);
        }}
        centered
        footer={null}
        width={520}
        className="onboarding-help-modal"
      >
        <div className="space-y-4">
          <p>
            Chọn mục bạn cần xem hướng dẫn. Danh sách hiển thị theo quyền được
            cấp cho tài khoản của bạn.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[{ id: 'welcome', title: 'Tổng quan' }, ...allowed].map(
              (guide) => (
                <Button
                  key={guide.id}
                  type={guideId === guide.id ? 'primary' : 'default'}
                  loading={startingGuide === guide.id}
                  disabled={
                    startingGuide !== null && startingGuide !== guide.id
                  }
                  onClick={() => void start(guide.id)}
                >
                  {guide.title}
                </Button>
              )
            )}
          </div>
          {progress.isError && (
            <Alert
              type="warning"
              showIcon
              message="Chưa tải được phần hướng dẫn đã lưu"
              action={
                <Button onClick={() => void progress.refetch()}>Thử lại</Button>
              }
            />
          )}
          {progress.data && steps.length > 0 && (
            <>
              <p>
                {progress.data.status === 'completed'
                  ? 'Đã xem xong hướng dẫn. Bạn có thể xem lại.'
                  : 'Bạn có thể đóng và xem tiếp vào lần sau.'}
              </p>
              {guideId === 'profile' && onPage && (
                <div className="space-y-3">
                  <p>
                    Ảnh:{' '}
                    {progress.data.task_results.avatar_updated
                      ? 'Đã cập nhật thành công'
                      : progress.data.task_results.avatar_skipped
                        ? 'Giữ ảnh hiện tại'
                        : 'Chưa ghi nhận cập nhật'}
                    .
                  </p>
                  <Button
                    disabled={
                      saving || !!progress.data.task_results.profile_reviewed
                    }
                    onClick={() => recordTask('profile_reviewed')}
                  >
                    {progress.data.task_results.profile_reviewed
                      ? 'Đã kiểm tra thông tin'
                      : 'Tôi đã kiểm tra thông tin'}
                  </Button>
                  <Button
                    disabled={
                      saving || !!progress.data.task_results.avatar_updated
                    }
                    onClick={() => recordTask('avatar_skipped')}
                  >
                    Giữ ảnh hiện tại
                  </Button>
                  <Button onClick={() => setHelpOpen(false)}>
                    Đóng để cập nhật hồ sơ
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
      <Tour
        rootClassName="onboarding-tour"
        gap={{ offset: 6, radius: 10 }}
        mask={{ color: 'rgba(15, 23, 42, 0.6)' }}
        arrow={{ pointAtCenter: true }}
        disabledInteraction
        animated={reduceMotion ? false : { placeholder: true }}
        scrollIntoViewOptions={{
          behavior: reduceMotion ? 'instant' : 'smooth',
          block: 'center'
        }}
        open={visible}
        current={current}
        onClose={closeTour}
        onChange={(index) => {
          setCurrent(index);
          void write({
            last_step_id: steps[index].id,
            completed_step_ids: [steps[current].id]
          });
        }}
        onFinish={() => {
          finished.current = true;
          setTourOpen(false);
          if (active()) setHelpOpen(true);
          void write({
            status: 'completed',
            completed_step_ids: steps.map((step) => step.id),
            last_step_id: null
          });
        }}
        steps={steps.map((step, index) => ({
          title: step.title,
          description:
            index === current && step.target && !highlightTarget
              ? `${step.description} Phần này chưa hiển thị trên trang. Bạn có thể bấm “Tiếp theo” hoặc xem lại sau.`
              : step.description,
          target: index === current ? highlightTarget : null,
          nextButtonProps: {
            children: index === steps.length - 1 ? 'Hoàn tất' : 'Tiếp theo'
          },
          prevButtonProps: { children: 'Quay lại' }
        }))}
      />
    </Context.Provider>
  );
}
