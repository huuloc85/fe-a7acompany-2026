import { useState } from 'react';
import { Card, InputNumber, Select, message } from 'antd';
import Button from '@/components/common/AppButton';
import {
  sendSpikeCommand,
  type Cap7AState,
  type SpikeAction
} from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';

export default function SpikeControls({
  state,
  allowed,
  refresh
}: {
  state?: Cap7AState | null;
  allowed: boolean;
  refresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [blockedRevision, setBlockedRevision] = useState<string | null>(null);
  const [edge, setEdge] = useState(0);
  const [step, setStep] = useState<number | null>(1);
  const controls = state?.controls;
  const revisionKey =
    state && controls ? `${state.session_id}:${controls.revision}` : '';
  const enabled =
    allowed && !!controls && !busy && blockedRevision !== revisionKey;
  const calibration = !!controls?.calibration;
  const roi = controls?.page === 'roi';
  const execute = async (
    action: SpikeAction,
    values: Record<string, unknown> = {}
  ) => {
    if (!enabled || !state || !controls) return;
    setBusy(true);
    setBlockedRevision(revisionKey);
    try {
      const response = await sendSpikeCommand(state, action, values);
      if (!response.ok) message.warning(response.message);
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Chưa xác định kết quả lệnh. Kiểm tra máy trước khi thao tác tiếp.'
        )
      );
    } finally {
      setBusy(false);
      refresh();
    }
  };
  return (
    <Card title="Điều khiển SPIKE" size="small">
      {!controls && <p>Cần cập nhật lõi SPIKE để nhận lệnh từ xa.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={!enabled || calibration}
          onClick={() => void execute('calibrate')}
        >
          Cài đặt
        </Button>
        <Button
          disabled={!enabled || !calibration}
          onClick={() => void execute('back')}
        >
          Quay lại
        </Button>
        <Button
          disabled={!enabled || calibration}
          onClick={() => void execute('reset_counters')}
        >
          Reset bộ đếm
        </Button>
      </div>
      {calibration && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={!enabled || !roi}
              onClick={() => void execute('page', { page: 'vision' })}
            >
              Tham số
            </Button>
            <Button
              disabled={!enabled || roi}
              onClick={() => void execute('page', { page: 'roi' })}
            >
              ROI
            </Button>
          </div>
          {!roi ? (
            <>
              <p>
                Diện tích: {controls?.min_area} · Tỉ lệ SPIKE:{' '}
                {controls?.min_spike} · Ngưỡng ảnh xám: {state?.threshold}
              </p>
              <Select
                aria-label="Tham số SPIKE"
                value={controls?.selected}
                disabled={!enabled}
                options={[
                  { value: 0, label: 'Diện tích' },
                  { value: 1, label: 'Tỉ lệ SPIKE' },
                  { value: 2, label: 'Ngưỡng ảnh xám' }
                ]}
                onChange={(index) => void execute('select', { index })}
                style={{ width: 190 }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={!enabled}
                  onClick={() => void execute('adjust', { direction: -1 })}
                >
                  Giảm −
                </Button>
                <Button
                  disabled={!enabled}
                  onClick={() => void execute('adjust', { direction: 1 })}
                >
                  Tăng +
                </Button>
                <Button
                  disabled={!enabled}
                  onClick={() => void execute('threshold_view')}
                >
                  Ảnh nhị phân: {controls?.show_threshold ? 'Bật' : 'Tắt'}
                </Button>
                <Button
                  disabled={!enabled}
                  onClick={() => void execute('reset_params')}
                >
                  Reset tham số
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>
                Chọn cạnh ROI 1–4 và dịch chuyển theo % kích thước ảnh. Quan sát
                màn hình SPIKE trước khi lưu.
              </p>
              <Select
                aria-label="Cạnh ROI"
                value={edge}
                disabled={!enabled}
                onChange={setEdge}
                options={[0, 1, 2, 3].map((value) => ({
                  value,
                  label: `Cạnh ${value + 1}`
                }))}
                style={{ width: 110 }}
              />
              <InputNumber
                aria-label="Bước dịch ROI (%)"
                value={step}
                min={0.1}
                max={10}
                step={0.1}
                disabled={!enabled}
                onChange={setStep}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ['Trái', -1, 0],
                    ['Phải', 1, 0],
                    ['Lên', 0, -1],
                    ['Xuống', 0, 1]
                  ] as const
                ).map(([label, x, y]) => (
                  <Button
                    key={label}
                    disabled={!enabled || step === null}
                    onClick={() =>
                      void execute('move_roi', {
                        edge,
                        dx: (x * (step ?? 0)) / 100,
                        dy: (y * (step ?? 0)) / 100
                      })
                    }
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  disabled={!enabled}
                  onClick={() => void execute('save_roi')}
                >
                  Lưu ROI
                </Button>
                <Button
                  disabled={!enabled}
                  onClick={() => void execute('reset_roi')}
                >
                  Reset ROI
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
