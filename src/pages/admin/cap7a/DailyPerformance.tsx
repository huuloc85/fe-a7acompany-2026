import { useState } from 'react';
import { Alert, Card, DatePicker, Spin, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
import Button from '@/components/common/AppButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCap7ADaily, resetCap7ADaily } from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';
import type { Cap7AState, Cap7ASystem } from '@/services/Cap7AService';
import LivePerformance from './LivePerformance';

const todayVN = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export default function DailyPerformance({
  system,
  state,
  online,
  receivedAt
}: {
  system: Cap7ASystem;
  state?: Cap7AState | null;
  online: boolean;
  receivedAt?: number | null;
}) {
  const [date, setDate] = useState(todayVN);
  const [resetting, setResetting] = useState(false);
  const historical = date !== todayVN();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['cap7a', system, 'daily', date],
    queryFn: () => getCap7ADaily(system, date),
    enabled: !!date,
    refetchOnWindowFocus: false,
    retry: false
  });
  const reset = async () => {
    if (resetting || date !== todayVN()) return;
    setResetting(true);
    try {
      await queryClient.cancelQueries({
        queryKey: ['cap7a', system, 'daily', date]
      });
      const response = await resetCap7ADaily(system, date);
      queryClient.setQueryData(['cap7a', system, 'daily', date], response);
      message.success('Đã lưu mốc reset hiệu suất.');
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Chưa xác định kết quả reset; bấm Cập nhật để kiểm tra trước khi thử lại.'
        )
      );
      void query.refetch();
    } finally {
      setResetting(false);
    }
  };
  const pendingReset = !!query.data?.reset_pending;
  const report = pendingReset
    ? {
        total: 0,
        ok: 0,
        ng: 0,
        unconfirmed: 0,
        ok_percent: null,
        warning: false,
        hours: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          ok: 0,
          ng: 0,
          unconfirmed: 0
        }))
      }
    : query.data?.report;
  const max = Math.max(1, ...(report?.hours.map((h) => h.ok + h.ng) ?? []));

  return (
    <Card
      title={
        historical
          ? 'Hiệu suất theo ngày'
          : `Hiệu suất trực tiếp · ${dayjs(todayVN()).format('DD/MM')}`
      }
      size="small"
      className="cap7a-daily-card liquid-glass-card !rounded-2xl"
    >
      <div className="flex flex-col gap-3">
        <LivePerformance
          system={system}
          state={state}
          online={online}
          receivedAt={receivedAt}
          historical={historical}
          report={query.isError ? null : report}
        />
        <details>
          <summary className="cursor-pointer py-2 font-medium">
            Lịch sử theo ngày / giờ
          </summary>
          <div className="flex flex-wrap items-center gap-3">
            <DatePicker
              id="cap7a-report-date"
              aria-label="Ngày báo cáo"
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
              className="!rounded-lg"
              disabled={resetting}
              value={date ? dayjs(date) : null}
              disabledDate={(value) => value.format('YYYY-MM-DD') > todayVN()}
              onChange={(value) =>
                setDate(value ? value.format('YYYY-MM-DD') : '')
              }
              style={{ width: 170 }}
            />
            <Button
              disabled={!date || resetting}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Cập nhật
            </Button>
            <Button
              tone="danger"
              danger
              loading={resetting}
              disabled={date !== todayVN() || query.isFetching || pendingReset}
              onClick={() => void reset()}
            >
              Reset thống kê ngày
            </Button>
          </div>
          {pendingReset && (
            <Alert
              type="info"
              showIcon
              message="Đã lưu mốc reset · Bấm Cập nhật để lấy lịch sử mới."
            />
          )}
          {!!query.data?.reset_at_ms && (
            <div className="text-xs text-gray-500">
              Tính từ:{' '}
              {new Date(query.data.reset_at_ms).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh'
              })}
            </div>
          )}
          {query.isError ? (
            <Alert
              type="error"
              showIcon
              message={getApiErrorMessage(
                query.error,
                'Không lấy được báo cáo ngày.'
              )}
            />
          ) : query.isPending && date ? (
            <Spin />
          ) : !report ? (
            <p>Chưa có nhật ký sản lượng cho ngày đã chọn.</p>
          ) : (
            <>
              {report.warning && (
                <Alert
                  type="warning"
                  showIcon
                  message="Nhật ký có cảnh báo thiếu/lỗi bản ghi."
                />
              )}
              <Card
                title="Sản lượng theo giờ"
                size="small"
                className="liquid-glass-card mt-3 !rounded-2xl"
              >
                <div className="mb-2 flex flex-wrap gap-3 text-xs">
                  <span style={{ color: '#16a34a' }}>■ OK</span>
                  <span style={{ color: '#ef4444' }}>■ NG</span>
                </div>
                <div
                  className="flex h-40 items-end gap-1"
                  role="group"
                  aria-label="Biểu đồ sản lượng 24 giờ; di chuột hoặc chọn từng giờ để xem số liệu"
                >
                  {report.hours.map((h) => (
                    <Tooltip
                      key={h.hour}
                      trigger={['hover', 'focus', 'click']}
                      title={
                        <div>
                          <div>
                            {String(h.hour).padStart(2, '0')}:00 –{' '}
                            {String(h.hour + 1).padStart(2, '0')}:00
                          </div>
                          <div>OK: {h.ok.toLocaleString('vi-VN')}</div>
                          <div>NG: {h.ng.toLocaleString('vi-VN')}</div>
                          <div>
                            Tổng: {(h.ok + h.ng).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      }
                    >
                      <button
                        type="button"
                        className="flex h-full min-w-0 flex-1 flex-col justify-end border-0 bg-transparent p-0 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                        aria-label={`${h.hour} giờ: OK ${h.ok}, NG ${h.ng}, Tổng ${h.ok + h.ng}`}
                      >
                        <div
                          className="w-full"
                          style={{
                            height: `${(100 * h.ng) / max}%`,
                            background: '#ef4444'
                          }}
                        />
                        <div
                          className="w-full"
                          style={{
                            height: `${(100 * h.ok) / max}%`,
                            background: '#16a34a'
                          }}
                        />
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <div className="mt-1 flex gap-1 text-[10px]">
                  {report.hours.map((h) => (
                    <span key={h.hour} className="min-w-0 flex-1 text-center">
                      {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                    </span>
                  ))}
                </div>
              </Card>
              <p className="m-0 text-sm text-gray-500">
                Đồng bộ:{' '}
                {query.data?.received_at_ms
                  ? new Date(query.data.received_at_ms).toLocaleString(
                      'vi-VN',
                      {
                        timeZone: 'Asia/Ho_Chi_Minh'
                      }
                    )
                  : '—'}
              </p>
            </>
          )}
        </details>
      </div>
    </Card>
  );
}
