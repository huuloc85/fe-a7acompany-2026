import { useRef, useState } from 'react';
import { Alert, Card, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/common/AppButton';
import {
  getSpikeLauncher,
  startSpikeApplication,
  sendSpikeCommand,
  type Cap7AState
} from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';
import useLiveClock from './useLiveClock';
import { livePollingInterval } from './livePolling';

export default function SpikeApplicationControls({
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
  const [uncertain, setUncertain] = useState(false);
  const sending = useRef(false);
  const now = useLiveClock(active);
  const query = useQuery({
    queryKey: ['cap7a', 'spike', 'launcher'],
    queryFn: ({ signal }) => getSpikeLauncher(signal),
    enabled: active,
    staleTime: 1000,
    refetchInterval: (query) =>
      livePollingInterval(1000, query.state.fetchFailureCount),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false
  });
  const launcher = query.data?.state;
  const fresh =
    active &&
    !!query.data?.online &&
    !query.isError &&
    !!launcher &&
    now - query.dataUpdatedAt < 15000 &&
    now - launcher.sampled_at_ms >= -5000 &&
    now - launcher.sampled_at_ms < 15000;
  const enabled = active && !!query.data?.enabled && !busy && !uncertain;
  const canStart =
    enabled &&
    fresh &&
    !!launcher?.desktop_ready &&
    !launcher.app_running &&
    !online;
  const canClose =
    enabled &&
    !query.isError &&
    online &&
    allowed &&
    !!state?.controls &&
    !state.controls.calibration;
  const execute = async (action: 'start' | 'close') => {
    if (sending.current || (action === 'start' ? !canStart : !canClose)) return;
    sending.current = true;
    setBusy(true);
    setNotice(
      action === 'start'
        ? 'Đang gửi yêu cầu mở ứng dụng…'
        : 'Đang gửi yêu cầu thoát ứng dụng…'
    );
    try {
      const reply =
        action === 'start'
          ? await startSpikeApplication(launcher!.session_id)
          : await sendSpikeCommand(state!, 'close_app');
      setNotice(action === 'start' && reply.ok ? '' : reply.message);
      if (!reply.ok) setUncertain(true);
      if (reply.ok && action === 'start') onStartAccepted();
      if (reply.ok && action === 'close') onCloseAccepted();
    } catch (error) {
      setUncertain(true);
      setNotice(
        getApiErrorMessage(
          error,
          'Chưa xác định kết quả. Kiểm tra máy trước khi thao tác tiếp.'
        )
      );
    } finally {
      sending.current = false;
      setBusy(false);
      void query.refetch({ cancelRefetch: false });
      refresh();
    }
  };
  if (!query.data?.enabled && !query.isError) return null;
  return (
    <Card
      title="Kiểm tra cổng keo cao"
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
              message={`Ứng dụng kết thúc với mã ${launcher.last_exit_code}. Kiểm tra log Jetson.`}
            />
          )}
        {!!state?.controls?.calibration && (
          <p>Thoát cài đặt trước khi đóng ứng dụng.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canStart}
            loading={busy}
            onClick={() => void execute('start')}
          >
            Mở ứng dụng
          </Button>
          <Button
            danger
            disabled={!canClose}
            onClick={() => void execute('close')}
          >
            Thoát ứng dụng
          </Button>
        </div>
        {notice && (
          <p role="status" className="m-0 text-sm">
            {notice}
          </p>
        )}
        {uncertain && (
          <Button disabled={busy} onClick={() => setUncertain(false)}>
            Đã kiểm tra máy
          </Button>
        )}
      </div>
    </Card>
  );
}
