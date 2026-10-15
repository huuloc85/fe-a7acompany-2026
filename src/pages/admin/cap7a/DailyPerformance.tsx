import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Spin, Table, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCap7ADaily, resetCap7ADaily } from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';
import type { Cap7AState } from '@/services/Cap7AService';
import {
  appendRateSample,
  productionRate,
  type RateSample
} from './productionRate';

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
  const [resetting, setResetting] = useState(false);
  const queryClient = useQueryClient();
  const [samples, setSamples] = useState<RateSample[]>([]);
  const running = online && state?.mode === 'RUN';
  const ok = state?.ok;
  const ng = state?.ng;
  const session = state?.session_id;
  useEffect(() => {
    if (
      !running ||
      !session ||
      !receivedAt ||
      !Number.isSafeInteger(ok) ||
      !Number.isSafeInteger(ng) ||
      ok! < 0 ||
      ng! < 0
    ) {
      setSamples([]);
      return;
    }
    setSamples((previous) =>
      appendRateSample(previous, {
        time: receivedAt,
        ok: ok!,
        ng: ng!,
        session
      })
    );
  }, [running, session, receivedAt, ok, ng]);
  const rate = running && date === todayVN() ? productionRate(samples) : null;
  const secondsFor100 =
    rate !== null && rate > 0 ? Math.ceil(100 / rate) : null;
  const query = useQuery({
    queryKey: ['cap7a-daily', date],
    queryFn: () => getCap7ADaily(date),
    enabled: !!date,
    refetchInterval: date === todayVN() ? 30000 : false,
    refetchIntervalInBackground: false,
    retry: false
  });
  useEffect(() => {
    setSamples([]);
  }, [query.data?.reset_at_ms]);
  const reset = async () => {
    if (resetting || date !== todayVN()) return;
    setResetting(true);
    try {
      await queryClient.cancelQueries({ queryKey: ['cap7a-daily', date] });
      const response = await resetCap7ADaily(date);
      queryClient.setQueryData(['cap7a-daily', date], response);
      setSamples([]);
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
    <Card title="Hiệu suất theo ngày" size="small" className="cap7a-daily-card">
      <div className="flex flex-col gap-3">
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
            danger
            loading={resetting}
            disabled={date !== todayVN() || query.isFetching || pendingReset}
            onClick={() => void reset()}
          >
            Reset hiệu suất
          </Button>
        </div>
        {pendingReset && (
          <Alert
            type="info"
            showIcon
            message="Đã reset về 0 · Chờ Jetson đồng bộ số liệu từ mốc mới."
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
          <Alert
            type="info"
            showIcon
            message="Chưa có nhật ký được đồng bộ cho ngày này."
            description="Không đồng nghĩa với sản lượng bằng 0. Jetson cần bản cập nhật thống kê và nhật ký results.csv."
          />
        ) : (
          <>
            {report.warning && (
              <Alert
                type="warning"
                showIcon
                message="Nhật ký có cảnh báo thiếu/lỗi bản ghi."
              />
            )}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              {[
                [
                  'Tổng sản phẩm',
                  (report.ok + report.ng).toLocaleString('vi-VN')
                ],
                ['OK', report.ok.toLocaleString('vi-VN')],
                ['NG', report.ng.toLocaleString('vi-VN')],
                [
                  'Tỷ lệ OK',
                  report.ok_percent === null ? '—' : `${report.ok_percent}%`
                ],
                [
                  'Tỷ lệ NG',
                  report.ok_percent === null
                    ? '—'
                    : `${Number((100 - report.ok_percent).toFixed(2))}%`
                ]
              ].map(([label, value]) => (
                <Card key={label} size="small">
                  <div className="text-sm">{label}</div>
                  <div className="text-2xl font-semibold">{value}</div>
                </Card>
              ))}
              <Card size="small">
                <div className="text-sm">Tốc độ sản xuất · hiện tại</div>
                <div className="text-2xl font-semibold">
                  {rate === null
                    ? '—'
                    : rate.toLocaleString('vi-VN', {
                        maximumFractionDigits: 2
                      })}
                  {rate !== null && (
                    <span className="text-sm font-normal"> SP/s</span>
                  )}
                </div>
                <div className="text-sm">
                  100 SP ≈{' '}
                  {secondsFor100 === null
                    ? '—'
                    : `${Math.floor(secondsFor100 / 60)} phút ${secondsFor100 % 60} giây`}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {date !== todayVN()
                    ? 'Không có tốc độ trực tiếp cho ngày cũ.'
                    : !running
                      ? 'Chờ máy RUN và kết nối.'
                      : rate === null
                        ? 'Đang lấy mẫu · cần ít nhất 10 giây.'
                        : 'OK + NG trong tối đa 60 giây gần nhất. Ước tính nếu giữ tốc độ này.'}
                </div>
              </Card>
            </div>
            <details>
              <summary className="cursor-pointer py-2 font-medium">
                Chi tiết sản lượng theo giờ
              </summary>
              <Card title="Sản lượng theo giờ" size="small">
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
                ? new Date(query.data.received_at_ms).toLocaleString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh'
                  })
                : '—'}
              . Cập nhật khoảng 30–60 giây khi online.
            </p>
          </>
        )}
        <p className="m-0 text-sm text-gray-500">
          Chỉ tính sản phẩm RUN đã ghi nhận xuất OK/NG. Tổng = OK + NG; không
          tính TEST hoặc lượt chưa có kết quả xuất. Reset bộ đếm không xoá báo
          cáo ngày. Đây là thống kê nhật ký, chưa phải OEE.
        </p>
      </div>
    </Card>
  );
}
