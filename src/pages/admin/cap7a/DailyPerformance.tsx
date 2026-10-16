import { useState } from 'react';
import { Alert, Card, Input, Spin, Table, message } from 'antd';
import Button from '@/components/common/AppButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCap7ADaily, resetCap7ADaily } from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';
import type { Cap7AState } from '@/services/Cap7AService';
import LivePerformance from './LivePerformance';

const todayVN = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export default function DailyPerformance({
  state,
  online,
  receivedAt
}: {
  state?: Cap7AState | null;
  online: boolean;
  receivedAt?: number | null;
}) {
  const [date, setDate] = useState(todayVN);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['cap7a-daily', date],
    queryFn: () => getCap7ADaily(date),
    enabled: historyOpen && !!date,
    refetchOnWindowFocus: false,
    retry: false
  });
  const reset = async () => {
    if (resetting || date !== todayVN()) return;
    setResetting(true);
    try {
      await queryClient.cancelQueries({ queryKey: ['cap7a-daily', date] });
      const response = await resetCap7ADaily(date);
      queryClient.setQueryData(['cap7a-daily', date], response);
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
      title="Hiệu suất trực tiếp"
      size="small"
      className="cap7a-daily-card liquid-glass-card !rounded-2xl"
    >
      <div className="flex flex-col gap-3">
        <LivePerformance
          state={state}
          online={online}
          receivedAt={receivedAt}
        />
        <details
          onToggle={(event) => {
            if (event.target === event.currentTarget)
              setHistoryOpen(event.currentTarget.open);
          }}
        >
          <summary className="cursor-pointer py-2 font-medium">
            Lịch sử theo ngày / giờ
          </summary>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="cap7a-report-date">Ngày (giờ Việt Nam)</label>
            <Input
              id="cap7a-report-date"
              type="date"
              disabled={resetting}
              value={date}
              max={todayVN()}
              onChange={(e) => setDate(e.target.value)}
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
          ) : !report ? null : (
            <>
              {report.warning && (
                <Alert
                  type="warning"
                  showIcon
                  message="Nhật ký có cảnh báo thiếu/lỗi bản ghi."
                />
              )}
              <details>
                <summary className="cursor-pointer py-2 font-medium">
                  Chi tiết sản lượng theo giờ
                </summary>
                <Card
                  title="Sản lượng theo giờ"
                  size="small"
                  className="liquid-glass-card !rounded-2xl"
                >
                  <div className="mb-2 flex flex-wrap gap-3 text-xs">
                    <span style={{ color: '#16a34a' }}>■ OK</span>
                    <span style={{ color: '#ef4444' }}>■ NG</span>
                  </div>
                  <div
                    className="flex h-40 items-end gap-1"
                    role="img"
                    aria-label="Biểu đồ sản lượng 24 giờ; số liệu chi tiết trong bảng bên dưới"
                  >
                    {report.hours.map((h) => (
                      <div
                        key={h.hour}
                        className="flex h-full min-w-0 flex-1 flex-col justify-end"
                        title={`${h.hour}h: OK ${h.ok}, NG ${h.ng}`}
                      >
                        <div
                          style={{
                            height: `${(100 * h.ng) / max}%`,
                            background: '#ef4444'
                          }}
                        />
                        <div
                          style={{
                            height: `${(100 * h.ok) / max}%`,
                            background: '#16a34a'
                          }}
                        />
                      </div>
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
                <Table
                  size="small"
                  pagination={false}
                  scroll={{ y: 260 }}
                  rowKey="hour"
                  dataSource={report.hours}
                  columns={[
                    {
                      title: 'Giờ',
                      dataIndex: 'hour',
                      render: (h: number) => `${String(h).padStart(2, '0')}:00`
                    },
                    { title: 'OK', dataIndex: 'ok' },
                    { title: 'NG', dataIndex: 'ng' }
                  ]}
                />
              </details>
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
