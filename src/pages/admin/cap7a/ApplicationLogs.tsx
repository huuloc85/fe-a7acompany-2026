import { useState } from 'react';
import { Card, Select, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getTailAppLogs } from '@/services/Cap7AService';
import { groupTailLogs } from './groupTailLogs';

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

export default function ApplicationLogs({ online }: { online: boolean }) {
  const date = todayVN();
  const [level, setLevel] = useState('all');
  const query = useQuery({
    queryKey: ['cap7a', 'tail', 'logs', date],
    queryFn: ({ signal }) => getTailAppLogs(date, signal),
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    retry: false
  });
  const logs = query.data?.logs ?? [];
  // Group before filtering: intervening events must keep separate groups.
  const groups = groupTailLogs(logs);
  const rows = groups.filter((row) => level === 'all' || row.level === level);

  return (
    <Card size="small" className="liquid-glass-card !rounded-2xl">
      <details>
        <summary className="cursor-pointer font-medium">
          Nhật ký ứng dụng TAIL
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
          <p className="mt-3 text-sm">Chưa nhận nhật ký ứng dụng TAIL.</p>
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
