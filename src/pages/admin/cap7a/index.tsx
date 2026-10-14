import { useState } from 'react';
import ScreenViewer from './ScreenViewer';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, InputNumber, Modal, Tag, message } from 'antd';
import {
  getCap7AStatus,
  sendCap7ACommand,
  type Cap7AAction
} from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';

export default function Cap7APage() {
  const [busy, setBusy] = useState(false);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [roi, setRoi] = useState<(number | null)[]>([null, null, null, null]);
  const query = useQuery({
    queryKey: ['cap7a-status'],
    queryFn: getCap7AStatus,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: false
  });
  const data = query.data;
  const state = data?.state;
  const online =
    !!data?.online &&
    !query.isError &&
    Date.now() - query.dataUpdatedAt < 20000;
  const allowed =
    online && !!state?.remote_allowed && !!data?.commands_enabled && !busy;
  const stopped = allowed && state?.mode === 'STOP';
  const ready =
    stopped && state?.camera_ready && state?.model_ready && state?.plc_ok;

  const command = (action: Cap7AAction, title: string, values = {}) => {
    if (!state || busy) return;
    Modal.confirm({
      title,
      content:
        'Lệnh tác động tới Jetson thật. Xác nhận dây chuyền đang an toàn. STOP phần mềm không thay thế dừng khẩn.',
      okText: 'Xác nhận',
      cancelText: 'Huỷ',
      onOk: async () => {
        setBusy(true);
        try {
          const response = await sendCap7ACommand(
            state.session_id,
            action,
            values
          );
          if (response.ok) message.success(response.message);
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
          void query.refetch();
        }
      }
    });
  };

  return (
    <section aria-label="Giám sát Cap7A-Check" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold">Cap7A-Check</h1>
        <Tag color={online ? 'green' : 'default'}>
          {online ? 'MQTT · Online' : 'Chưa kết nối / dữ liệu cũ'}
        </Tag>
      </header>
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
              : 'Backend chưa cấu hình ThingsBoard'
          }
        />
      ) : !online ? (
        <Alert
          type="warning"
          showIcon
          message="Chưa nhận dữ liệu mới từ ứng dụng Jetson"
        />
      ) : !allowed && !busy ? (
        <Alert
          type="info"
          showIcon
          message="Chỉ giám sát — cần bật điều khiển ở backend và Cài đặt trên Jetson"
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            ['Tổng sản phẩm', state?.total],
            ['OK', state?.ok],
            ['NG', state?.ng]
          ] as const
        ).map(([label, value]) => (
          <Card key={label} size="small">
            <div>{label}</div>
            <div className="mt-2 text-4xl font-semibold">{value ?? '—'}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Trạng thái Jetson">
          <dl className="space-y-3">
            {[
              ['Chế độ', state?.mode],
              [
                'Camera',
                state ? (state.camera_ready ? 'READY' : 'Chưa sẵn sàng') : null
              ],
              [
                'Model',
                state ? (state.model_ready ? 'READY' : 'Chưa sẵn sàng') : null
              ],
              [
                'Kết quả gần nhất',
                state ? `${state.result} · ${state.result_mode ?? '—'}` : null
              ],
              [
                'CPU / GPU',
                state
                  ? `${state.cpu_temp_c ?? '—'} °C / ${state.gpu_temp_c ?? '—'} °C`
                  : null
              ],
              ['Ngưỡng NG', state ? `${state.threshold}%` : null],
              ['ROI', state ? (state.roi?.join(', ') ?? 'Mặc định') : null],
              [
                'Nhận dữ liệu',
                data?.received_at_ms
                  ? new Date(data.received_at_ms).toLocaleString('vi-VN')
                  : null
              ]
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2">
                <dt>{label}</dt>
                <dd className="m-0 font-medium">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Điều khiển">
          <div className="flex flex-wrap gap-3">
            <Button
              type="primary"
              disabled={!ready}
              onClick={() => command('run', 'Chuyển RUN, chờ trigger PLC?')}
            >
              RUN
            </Button>
            <Button
              danger
              disabled={!allowed}
              onClick={() => command('stop', 'Yêu cầu STOP?')}
            >
              STOP
            </Button>
            <Button
              disabled={!ready}
              onClick={() => command('test', 'Chuyển TEST?')}
            >
              TEST
            </Button>
            <Button
              disabled={!stopped}
              onClick={() => command('reset_counters', 'Reset bộ đếm về 0?')}
            >
              Reset bộ đếm
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
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
              onClick={() =>
                command('set_threshold', 'Đổi ngưỡng NG?', { threshold })
              }
            >
              Áp dụng
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {['X', 'Y', 'Rộng', 'Cao'].map((label, i) => (
              <label key={label} className="flex flex-col gap-1">
                {label}
                <InputNumber
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
              onClick={() =>
                command('set_roi', 'Đổi ROI trên khung 600×400?', { roi })
              }
            >
              Lưu ROI
            </Button>
            <Button
              disabled={!stopped}
              onClick={() => command('clear_roi', 'Dùng ROI mặc định?')}
            >
              ROI mặc định
            </Button>
          </div>
        </Card>
      </div>
      <Card title="Màn hình Jetson">
        <ScreenViewer />
      </Card>
    </section>
  );
}
