import { useState } from 'react';
import { Card, Select, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getTailAppLogs } from '@/services/Cap7AService';
import { groupTailLogs } from './groupTailLogs';
import useLiveClock from './useLiveClock';
import { livePollingInterval } from './livePolling';

const todayVN = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
const stamp = (at: number) =>
  new Date(at).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false
  });
const levels = { error: 'Lỗi', warning: 'Cảnh báo', info: 'Thông tin' };
const colors = { info: 'blue', warning: 'gold', error: 'red' };

export default function ApplicationLogs({
  online,
  active
}: {
  online: boolean;
  active: boolean;
}) {
  useLiveClock(active);
  const [expanded, setExpanded] = useState(false);
  const date = todayVN();
  const [level, setLevel] = useState('all');
  const query = useQuery({
    queryKey: ['cap7a', 'tail', 'logs', date],
    queryFn: ({ signal }) => getTailAppLogs(date, signal),
    enabled: active && expanded,
    staleTime: 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) =>
      livePollingInterval(1000, query.state.fetchFailureCount),
    refetchIntervalInBackground: false,
    retry: false
  });
  const logs = query.data?.logs ?? [];
  // Group before filtering: intervening events must keep separate groups.
  const groups = groupTailLogs(logs);
  const rows = groups.filter((row) => level === 'all' || row.level === level);

  return (
    <Card size="small" className="liquid-glass-card !rounded-2xl">
      <details
        onToggle={(event) => {
          const open = event.currentTarget.open;
          setExpanded(open);
        }}
      >
        <summary className="cursor-pointer font-medium">
          Nhật ký kiểm tra điểm thiếu nhựa
          {!!groups.length && (
            <span className="ml-2 text-sm font-normal">({groups.length})</span>
          )}
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select
            aria-label="Lọc mức độ nhật ký"
            value={level}
            onChange={setLevel}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              ...Object.entries(levels).map(([value, label]) => ({
                value,
                label
              }))
            ]}
          />
          {!!query.dataUpdatedAt && (
            <span className="text-xs text-gray-500">
              Đồng bộ: {stamp(query.dataUpdatedAt)}
            </span>
          )}
        </div>
        {(!online || query.isError) && (
          <p className="mt-2 text-sm text-amber-600">
            Chưa nhận trạng thái mới. Nhật ký bên dưới là dữ liệu đã nhận trước
            đó.
          </p>
        )}
        {query.isPending ? (
          <p className="mt-3 text-sm">Đang tải nhật ký…</p>
        ) : !query.data ? (
          <p className="mt-3 text-sm">
            Chưa nhận nhật ký kiểm tra điểm thiếu nhựa.
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm">Không có sự kiện phù hợp.</p>
        ) : (
          <div
            className="mt-3 max-h-80 overflow-auto"
            role="region"
            aria-label="Nhật ký Screen 1"
          >
            <ul className="m-0 list-none divide-y divide-gray-200 p-0 dark:divide-gray-700">
              {rows.map((row) => (
                <li key={row.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag color={colors[row.level]}>{levels[row.level]}</Tag>
                    <time dateTime={new Date(row.at_ms).toISOString()}>
                      {stamp(row.at_ms)}
                    </time>
                    {row.repetitions > 1 && (
                      <span title={`Lần đầu: ${stamp(row.firstAt)}`}>
                        ×{row.repetitions}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-1 break-words"
                    title={
                      row.details.sdk_code === undefined
                        ? undefined
                        : row.details.sdk_code === -1
                          ? 'Frame lặp'
                          : `SDK: 0x${(row.details.sdk_code >>> 0).toString(16).padStart(8, '0')}`
                    }
                  >
                    {row.message}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>
    </Card>
  );
}
