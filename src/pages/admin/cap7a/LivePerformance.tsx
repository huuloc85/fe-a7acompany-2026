import { useEffect, useState } from 'react';
import { Card } from 'antd';
import type { Cap7AState } from '@/services/Cap7AService';
import {
  appendRateSample,
  productionRate,
  type RateSample
} from './productionRate';

export default function LivePerformance({
  state,
  online,
  receivedAt
}: {
  state?: Cap7AState | null;
  online: boolean;
  receivedAt?: number | null;
}) {
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
  const rate = running ? productionRate(samples) : null;
  const seconds = rate !== null && rate > 0 ? Math.ceil(100 / rate) : null;
  const counts = online && state ? state : null;
  const classified = counts ? counts.ok + counts.ng : 0;
  const percent = (value: number) =>
    classified > 0
      ? `${((100 * value) / classified).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`
      : '—';
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Tổng sản phẩm', counts?.total.toLocaleString('vi-VN') ?? '—'],
          ['OK', counts?.ok.toLocaleString('vi-VN') ?? '—'],
          ['NG', counts?.ng.toLocaleString('vi-VN') ?? '—'],
          ['Tỷ lệ OK', counts ? percent(counts.ok) : '—'],
          ['Tỷ lệ NG', counts ? percent(counts.ng) : '—']
        ].map(([label, value]) => (
          <Card
            key={label}
            size="small"
            className="liquid-glass-card !rounded-2xl"
            classNames={{
              body: 'flex h-full min-h-32 flex-col items-center justify-center text-center'
            }}
          >
            <div className="text-sm">{label}</div>
            <div className="text-center text-2xl font-semibold">{value}</div>
          </Card>
        ))}
        <Card
          size="small"
          className="liquid-glass-card !rounded-2xl"
          classNames={{
            body: 'flex h-full min-h-32 flex-col items-center justify-center text-center'
          }}
        >
          <div className="text-sm">Tốc độ sản xuất</div>
          <div className="text-center text-2xl font-semibold">
            {rate === null
              ? '—'
              : `${rate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} SP/s`}
          </div>
          <div className="text-center text-sm">
            100 SP ≈{' '}
            {seconds === null
              ? '—'
              : `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {!running
              ? 'Chờ RUN và kết nối.'
              : rate === null
                ? 'Lấy mẫu tối thiểu 10 giây.'
                : 'Ước tính theo tốc độ gần nhất.'}
          </div>
        </Card>
      </div>
      <div className="text-xs text-gray-500">
        Bộ đếm trực tiếp từ Jetson · cập nhật theo trạng thái mỗi giây. Tỷ lệ
        trên OK + NG; TOTAL có thể gồm sản phẩm đang xử lý.
      </div>
    </>
  );
}
