import { useState } from 'react';
import { Alert, Card, Tag, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/common/AppButton';
import {
  getTailLauncher,
  startTailApplication,
  sendCap7ACommand,
  type Cap7AState
} from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';
import useLiveClock from './useLiveClock';
import { livePollingInterval } from './livePolling';

export default function TailApplicationControls({
  active,
  state,
  online,
  allowed,
  busy,
  setBusy,
  refresh,
  onStartAccepted,
  onCloseAccepted
}: {
  active: boolean;
  state?: Cap7AState | null;
  online: boolean;
  allowed: boolean;
  busy: boolean;
  setBusy: (value: boolean) => void;
  refresh: () => void;
  onStartAccepted: () => void;
  onCloseAccepted: () => void;
}) {
  const [notice, setNotice] = useState('');
  const now = useLiveClock(active);
  const query = useQuery({
    queryKey: ['cap7a', 'tail', 'launcher'],
    queryFn: ({ signal }) => getTailLauncher(signal),
    enabled: active,
    staleTime: 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) =>
      livePollingInterval(1000, query.state.fetchFailureCount),
    refetchIntervalInBackground: false,
    retry: false
  });
  const launcher = query.data?.state;
  const fresh =
    active &&
    !!query.data?.online &&
    !query.isError &&
    now - query.dataUpdatedAt < 15000 &&
    !!launcher &&
    now - launcher.sampled_at_ms >= -5000 &&
    now - launcher.sampled_at_ms < 15000;
  const canStart =
    !!query.data?.enabled &&
    fresh &&
    !!launcher?.desktop_ready &&
    !launcher.app_running &&
    !online &&
    !busy;
  const canClose =
    !!query.data?.enabled &&
    !query.isError &&
    allowed &&
    online &&
    (state?.mode === 'STOP' || state?.mode === 'RUN') &&
    !busy;
  const act = async (action: 'start' | 'close') => {
    if (action === 'start' ? !canStart || !launcher : !canClose || !state)
      return;
    setBusy(true);
    setNotice('');
    try {
      const result =
        action === 'start'
          ? await startTailApplication(launcher!.session_id)
          : await sendCap7ACommand('tail', state!.session_id, 'close_app');
      setNotice(action === 'start' && result.ok ? '' : result.message);
      if (action === 'start' && result.ok) onStartAccepted();
      if (action === 'close' && result.ok) onCloseAccepted();
      if (!result.ok) message.warning(result.message);
    } catch (error) {
      setNotice(
        getApiErrorMessage(
          error,
          'Chưa xác định kết quả. Kiểm tra trạng thái máy trước khi thử lại.'
        )
      );
    } finally {
      setBusy(false);
      void query.refetch({ cancelRefetch: false });
      refresh();
    }
  };
  if (!query.data?.enabled && !query.isError) return null;
  return (
    <Card
      title="Kiểm tra điểm thiếu nhựa"
      size="small"
      className="liquid-glass-card !rounded-2xl"
    >
      <div className="flex flex-col gap-3">
        <Tag color={online ? 'green' : fresh ? 'blue' : 'default'}>
          {online
            ? 'Ứng dụng đang kết nối'
            : !fresh
              ? 'Supervisor chưa kết nối'
              : launcher?.app_running
                ? 'App đang mở · chưa kết nối MQTT'
                : 'Ứng dụng đã đóng'}
        </Tag>
        {query.isError && (
          <Alert
            type="warning"
            message="Không đọc được trạng thái mở/thoát ứng dụng."
          />
        )}
        {fresh && !launcher?.desktop_ready && (
          <Alert
            type="info"
            message="Cần đăng nhập desktop Jetson để mở app."
          />
        )}
        {fresh &&
          launcher?.last_exit_code != null &&
          launcher.last_exit_code !== 0 && (
            <Alert
              type="warning"
              message={`Lần mở trước kết thúc với mã ${launcher.last_exit_code}. Kiểm tra log tại Jetson.`}
            />
          )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canStart} onClick={() => act('start')}>
            Mở ứng dụng
          </Button>
          <Button danger disabled={!canClose} onClick={() => act('close')}>
            Thoát ứng dụng
          </Button>
        </div>
        {notice && (
          <p className="m-0 text-sm" role="status">
            {notice}
          </p>
        )}
      </div>
    </Card>
  );
}
