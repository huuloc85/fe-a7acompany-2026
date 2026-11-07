import { useEffect, useRef, useState } from 'react';
import './cap7a.css';
import ScreenViewer from './ScreenViewer';
import DailyPerformance from './DailyPerformance';
import LivePerformance from './LivePerformance';
import SpikeControls from './SpikeControls';
import TailApplicationControls from './TailApplicationControls';
import SpikeApplicationControls from './SpikeApplicationControls';
import ApplicationLogs from './ApplicationLogs';
import SpikeApplicationLogs from './SpikeApplicationLogs';
import ProductionMailSettings from './ProductionMailSettings';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, InputNumber, Tabs, Tag, message } from 'antd';
import Button from '@/components/common/AppButton';
import ComponentCard from '@/components/common/ComponentCard';
import {
  getCap7AStatus,
  sendCap7ACommand,
  type Cap7AAction,
  type Cap7ASystem,
  type Cap7AStatus
} from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';
import useLiveClock from './useLiveClock';
import { livePollingInterval } from './livePolling';

const modeLabels: Record<string, string> = {
  RUN: 'Đang chạy',
  STOP: 'Dừng',
  TEST: 'Kiểm tra',
  FILE_TEST: 'Kiểm tra ảnh'
};
const modeLabel = (mode?: string | null) =>
  modeLabels[mode ?? ''] ?? mode ?? '—';
const resultLabels: Record<string, string> = {
  WAIT: 'Chờ',
  READY: 'Sẵn sàng',
  REVIEW: 'Cần kiểm tra',
  ERROR: 'Lỗi thiết bị',
  None: 'Chưa có',
  'GPIO FAIL': 'Lỗi UART'
};
const resultLabel = (result: string) => resultLabels[result] ?? result;
const temperatureLabel = (value?: number | null) =>
  value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)} °C`;

export default function Cap7APage() {
  const [activeSystem, setActiveSystem] = useState('tail');
  return (
    <ComponentCard title="CAP7A">
      <Tabs
        activeKey={activeSystem}
        onChange={setActiveSystem}
        destroyOnHidden={false}
        items={[
          {
            key: 'tail',
            label: 'Screen 1',
            children: (
              <Cap7ASystemPanel
                key="tail"
                system="tail"
                active={activeSystem === 'tail'}
              />
            )
          },
          {
            key: 'spike',
            label: 'Screen 2',
            children: (
              <Cap7ASystemPanel
                key="spike"
                system="spike"
                active={activeSystem === 'spike'}
              />
            )
          },
          {
            key: 'production-mail',
            label: 'Báo cáo qua email',
            children: <ProductionMailSettings />
          }
        ]}
      />
    </ComponentCard>
  );
}

function Cap7ASystemPanel({
  system,
  active
}: {
  system: Cap7ASystem;
  active: boolean;
}) {
  const now = useLiveClock(active);
  const [busy, setBusy] = useState(false);
  const [screenOpenRequest, setScreenOpenRequest] = useState(0);
  const screenRequestedForVisit = useRef(false);
  const [screenGeneration, setScreenGeneration] = useState(0);
  const closeScreen = () => {
    setScreenOpenRequest(0);
    setScreenGeneration((value) => value + 1);
  };
  const [threshold, setThreshold] = useState<number | null>(null);
  const [roi, setRoi] = useState<(number | null)[]>([null, null, null, null]);
  const query = useQuery({
    queryKey: ['cap7a', system, 'status'],
    queryFn: ({ signal }) => getCap7AStatus(system, signal),
    enabled: active,
    staleTime: 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) =>
      livePollingInterval(1000, query.state.fetchFailureCount),
    refetchIntervalInBackground: false,
    retry: false
  });
  const data = query.data?.system === system ? query.data : undefined;
  const capabilities = data?.capabilities;
  const [lastSnapshot, setLastSnapshot] = useState<Cap7AStatus | null>(null);
  useEffect(() => {
    if (data?.state) setLastSnapshot(data);
  }, [data]);
  const displayed = data?.state ? data : lastSnapshot;
  const state = displayed?.state;
  const online =
    active &&
    !!data?.online &&
    !!data?.state &&
    !query.isError &&
    now - query.dataUpdatedAt < 20000 &&
    !!data?.received_at_ms &&
    now - data.received_at_ms >= -5000 &&
    now - data.received_at_ms < 20000;
  // A paused browser poll is not evidence of an MQTT disconnect.
  // Keep the last confirmed status labelled as such while refreshing;
  // command authorization continues to use the strict freshness above.
  const syncing =
    active && !online && !!data?.online && !query.isError && query.isFetching;
  const allowed =
    online &&
    !!capabilities?.commands &&
    !!state?.remote_allowed &&
    !!data?.commands_enabled &&
    !busy;
  useEffect(() => {
    if (!active) {
      screenRequestedForVisit.current = false;
      return;
    }
    if (!online || !capabilities?.screen || screenRequestedForVisit.current)
      return;
    screenRequestedForVisit.current = true;
    setScreenOpenRequest(Date.now());
  }, [active, online, capabilities?.screen]);
  const stopped = allowed && state?.mode === 'STOP';
  const operable =
    allowed &&
    state?.mode !== 'FILE_TEST' &&
    state?.worker_alive !== false &&
    state?.plc_ok;
  const ready = operable && state?.camera_ready && state?.model_ready;

  const command = async (action: Cap7AAction, values = {}) => {
    if (!state || busy || !allowed) return;
    setBusy(true);
    try {
      const response = await sendCap7ACommand(
        system,
        state.session_id,
        action,
        values
      );
      if (response.ok) message.info(`Jetson đã nhận lệnh: ${response.message}`);
      else message.warning(response.message);
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Không xác định kết quả lệnh. Kiểm tra máy trước khi thử lại.'
        )
      );
    } finally {
      setBusy(false);
      void query.refetch({ cancelRefetch: false });
    }
  };

  return (
    <>
      <section
        aria-label={`Giám sát CAP7A ${system.toUpperCase()}`}
        className="cap7a-page"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tag color={online ? 'green' : syncing ? 'blue' : 'default'}>
            {online
              ? 'MQTT · Online'
              : syncing
                ? 'MQTT · Online lần cuối'
                : 'Chưa kết nối / dữ liệu cũ'}
          </Tag>
          {system === 'tail' && capabilities?.commands && (
            <Button
              disabled={!allowed}
              title="Reset thời gian chạy/dừng hôm nay, giữ nguyên bộ đếm sản phẩm"
              onClick={() => command('reset_runtime')}
            >
              Reset thời gian
            </Button>
          )}
        </div>
        {query.isError ? (
          <Alert
            type="error"
            showIcon
            message="Không đọc được dữ liệu backend"
            description="Đã khoá điều khiển. Các số liệu còn hiển thị là lần nhận trước."
          />
        ) : !data?.configured ? (
          <Alert
            type="info"
            showIcon
            message={
              query.isPending
                ? 'Đang kiểm tra kết nối…'
                : 'Backend chưa cấu hình kết nối thiết bị'
            }
          />
        ) : syncing ? null : !online ? (
          <Alert
            type="warning"
            showIcon
            message="Chưa nhận dữ liệu mới từ ứng dụng Jetson"
          />
        ) : !allowed && !busy ? (
          <Alert
            type="info"
            showIcon
            message={
              capabilities?.commands
                ? 'Chỉ giám sát — cần bật điều khiển ở backend và Cài đặt trên Jetson'
                : 'Hệ thống này chỉ hỗ trợ giám sát từ xa'
            }
          />
        ) : null}
        {capabilities?.daily ? (
          <DailyPerformance
            active={active}
            system={system}
            state={state}
            online={online}
            receivedAt={displayed?.received_at_ms}
          />
        ) : (
          <Card title="Bộ đếm trực tiếp" size="small">
            <LivePerformance
              key={system}
              system={system}
              state={state}
              online={online}
              receivedAt={displayed?.received_at_ms}
            />
          </Card>
        )}
        {system === 'tail' && (
          <ApplicationLogs online={online} active={active} />
        )}
        {system === 'spike' && (
          <SpikeApplicationLogs
            logs={data?.app_logs ?? displayed?.app_logs}
            online={online}
            failed={query.isError}
          />
        )}
        <div className="cap7a-workspace">
          <Card
            title={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Màn hình Jetson</span>
                <span
                  className="text-sm font-normal"
                  title="Giá trị xử lý gần nhất; không phải FPS truyền màn hình."
                >
                  FPS xử lý:{' '}
                  {online &&
                  typeof state?.processing_fps === 'number' &&
                  Number.isFinite(state.processing_fps) &&
                  state.processing_fps > 0
                    ? state.processing_fps.toLocaleString('vi-VN', {
                        maximumFractionDigits: 1
                      })
                    : '—'}
                </span>
              </div>
            }
            size="small"
            className="cap7a-screen-card liquid-glass-card !rounded-2xl"
          >
            {capabilities?.screen ? (
              <ScreenViewer
                key={`${system}-${screenGeneration}`}
                system={system}
                autoConnectRequest={screenOpenRequest}
                tabActive={active}
                appOnline={online}
              />
            ) : (
              <Alert
                type="info"
                message={`Chưa cấu hình màn hình ${system.toUpperCase()}`}
              />
            )}
          </Card>
          <aside
            className="cap7a-controls"
            aria-label="Trạng thái và điều khiển"
          >
            {system === 'tail' && (
              <TailApplicationControls
                active={active}
                state={state}
                online={online}
                allowed={allowed}
                busy={busy}
                setBusy={setBusy}
                onStartAccepted={() => setScreenOpenRequest(Date.now())}
                onCloseAccepted={closeScreen}
                refresh={() => {
                  void query.refetch({ cancelRefetch: false });
                }}
              />
            )}
            {system === 'spike' && (
              <SpikeApplicationControls
                active={active}
                state={state}
                online={online}
                allowed={allowed}
                busy={busy}
                setBusy={setBusy}
                onStartAccepted={() => setScreenOpenRequest(Date.now())}
                onCloseAccepted={closeScreen}
                refresh={() => {
                  void query.refetch({ cancelRefetch: false });
                }}
              />
            )}
            <Card
              title="Trạng thái Jetson"
              size="small"
              className="liquid-glass-card !rounded-2xl"
            >
              <dl className="space-y-1 text-sm">
                {[
                  ['Chế độ', modeLabel(state?.mode)],
                  [
                    'Camera',
                    state
                      ? state.camera_ready
                        ? 'Sẵn sàng'
                        : 'Chưa sẵn sàng'
                      : null
                  ],
                  [
                    'Model',
                    state
                      ? state.model_ready
                        ? 'Sẵn sàng'
                        : 'Chưa sẵn sàng'
                      : null
                  ],
                  [
                    'Kết quả gần nhất',
                    state
                      ? `${resultLabel(state.result)} · ${modeLabel(state.result_mode)}`
                      : null
                  ],
                  [
                    'CPU / GPU',
                    state
                      ? `${temperatureLabel(state.cpu_temp_c)} / ${temperatureLabel(state.gpu_temp_c)}`
                      : null
                  ],
                  [
                    system === 'tail' ? 'Ngưỡng NG' : 'Ngưỡng ảnh xám',
                    state
                      ? `${state.threshold}${system === 'tail' ? '%' : ''}`
                      : null
                  ],
                  [
                    'ROI',
                    state
                      ? (state.roi?.join(', ') ??
                        (system === 'tail' ? 'Mặc định' : 'Chỉnh tại máy'))
                      : null
                  ],
                  [
                    'Nhận dữ liệu',
                    displayed?.received_at_ms
                      ? new Date(displayed.received_at_ms).toLocaleString(
                          'vi-VN'
                        )
                      : null
                  ]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <dt>{label}</dt>
                    <dd className="m-0 font-medium">{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            {system === 'spike' && capabilities?.commands && (
              <SpikeControls
                state={state}
                allowed={allowed}
                refresh={() => {
                  void query.refetch({ cancelRefetch: false });
                }}
              />
            )}
            {system === 'tail' && capabilities?.commands && (
              <Card
                title="Điều khiển kiểm tra điểm thiếu nhựa"
                size="small"
                className="liquid-glass-card !rounded-2xl"
              >
                <div className="flex flex-wrap gap-3">
                  <Button
                    tone="success"
                    type="primary"
                    disabled={!ready}
                    onClick={() => command('run')}
                  >
                    RUN
                  </Button>
                  <Button
                    tone="danger"
                    danger
                    disabled={!allowed}
                    onClick={() => command('stop')}
                  >
                    STOP
                  </Button>
                  <Button
                    disabled={!ready || state?.mode === 'TEST'}
                    onClick={() => command('test')}
                  >
                    TEST
                  </Button>
                  <Button
                    disabled={!operable}
                    onClick={() => command('reset_counters')}
                  >
                    Reset bộ đếm
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label htmlFor="cap7a-threshold">Ngưỡng NG (%)</label>
                  <InputNumber
                    id="cap7a-threshold"
                    min={1}
                    max={100}
                    value={threshold}
                    onChange={setThreshold}
                    disabled={!stopped}
                  />
                  <Button
                    disabled={!stopped || threshold === null}
                    onClick={() => command('set_threshold', { threshold })}
                  >
                    Áp dụng
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {['X', 'Y', 'Rộng', 'Cao'].map((label, i) => (
                    <label key={label} className="flex flex-col gap-1">
                      {label}
                      <InputNumber
                        style={{ width: '100%' }}
                        aria-label={`ROI ${label}`}
                        min={0}
                        max={i % 2 === 0 ? 600 : 400}
                        precision={0}
                        value={roi[i]}
                        disabled={!stopped}
                        onChange={(value) =>
                          setRoi((current) =>
                            current.map((v, j) => (i === j ? value : v))
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={!stopped || roi.some((v) => v === null)}
                    onClick={() => command('set_roi', { roi })}
                  >
                    Lưu ROI
                  </Button>
                  <Button
                    disabled={!stopped}
                    onClick={() => command('clear_roi')}
                  >
                    ROI mặc định
                  </Button>
                </div>
              </Card>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
