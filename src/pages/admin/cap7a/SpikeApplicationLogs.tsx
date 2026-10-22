import { useState } from 'react';
import { Card, Select, Tag } from 'antd';
import type { Cap7AStatus } from '@/services/Cap7AService';

const labels = { error: 'Lỗi', warning: 'Cảnh báo', info: 'Thông tin' };
const colors = { error: 'red', warning: 'gold', info: 'blue' };
const stamp = (at: number) =>
  new Date(at).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false
  });

export default function SpikeApplicationLogs({
  logs,
  online,
  failed
}: {
  logs?: Cap7AStatus['app_logs'];
  online: boolean;
  failed: boolean;
}) {
  const [level, setLevel] = useState('all');
  const events =
    logs?.events.filter((event) => level === 'all' || event.level === level) ??
    [];
  return (
    <Card size="small" className="liquid-glass-card !rounded-2xl">
      <details>
        <summary className="cursor-pointer font-medium">
          Nhật ký ứng dụng SPIKE
          {!!logs?.events.length && (
            <span className="ml-2 text-sm font-normal">
              ({logs.events.length})
            </span>
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
              { value: 'error', label: 'Lỗi' },
              { value: 'warning', label: 'Cảnh báo' },
              { value: 'info', label: 'Thông tin' }
            ]}
          />
          {logs && (
            <span className="text-xs text-gray-500">
              Đồng bộ: {stamp(logs.received_at_ms)}
            </span>
          )}
        </div>
        {(!online || failed) && (
          <p className="mt-2 text-sm text-amber-600">
            Chưa nhận trạng thái mới. Nhật ký bên dưới là dữ liệu đã nhận trước
            đó.
          </p>
        )}
        {logs && (!logs.source_available || !logs.storage_ok) && (
          <p className="mt-2 text-sm text-amber-600">
            {!logs.source_available
              ? 'Không đọc được file log tại Jetson. '
              : ''}
            {!logs.storage_ok ? 'Chưa lưu được nhật ký tại Jetson. ' : ''}
          </p>
        )}
        {!logs ? (
          <p className="mt-3 text-sm">
            Chưa nhận nhật ký. Cập nhật SPIKE và mở app bằng icon desktop.
          </p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm">Không có sự kiện phù hợp.</p>
        ) : (
          <div
            className="mt-3 max-h-80 overflow-auto"
            role="region"
            aria-label="Các sự kiện ứng dụng"
          >
            <ul className="m-0 list-none divide-y divide-gray-200 p-0 dark:divide-gray-700">
              {events.map((event) => (
                <li key={event.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag color={colors[event.level]}>{labels[event.level]}</Tag>
                    <time dateTime={new Date(event.last_at_ms).toISOString()}>
                      {stamp(event.last_at_ms)}
                    </time>
                    {event.observed && (
                      <span className="text-xs text-gray-500">
                        Giờ ghi nhận
                      </span>
                    )}
                    {event.count > 1 && (
                      <span title={`Lần đầu: ${stamp(event.at_ms)}`}>
                        ×{event.count}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 break-words">{event.message}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>
    </Card>
  );
}
