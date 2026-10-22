import { useEffect, useState } from 'react';
import { Card } from 'antd';
import type {
  Cap7ADaily,
  Cap7AState,
  Cap7ASystem
} from '@/services/Cap7AService';
import {
  compatibleRateSample,
  readRateReading,
  updateRateTracker,
  type RateTracker
} from './productionRate';

export default function LivePerformance({
  system,
  state,
  online,
  receivedAt,
  historical = false,
  report
}: {
  system: Cap7ASystem;
  state?: Cap7AState | null;
  online: boolean;
  receivedAt?: number | null;
  historical?: boolean;
  report?: Cap7ADaily['report'];
}) {
  const rateCacheKey = `cap7a-${system}-production-rate-v1`;
  const [tracker, setTracker] = useState<RateTracker>(() => {
    try {
      return {
        samples: [],
        last: readRateReading(sessionStorage.getItem(rateCacheKey))
      };
    } catch {
      return { samples: [], last: null };
    }
  });
  const running = online && state?.mode === 'RUN';
  const ok = state?.ok;
  const ng = state?.ng;
  const session = state?.session_id
    ? `${state.session_id}:${state.runtime_date ?? ''}`
    : null;
  useEffect(() => {
    if (
      !session ||
      !receivedAt ||
      !Number.isSafeInteger(ok) ||
      !Number.isSafeInteger(ng) ||
      ok! < 0 ||
      ng! < 0
    ) {
      setTracker((previous) => ({ ...previous, samples: [] }));
      return;
    }
    setTracker((previous) =>
      updateRateTracker(
        previous,
        {
          time: receivedAt,
          ok: ok!,
          ng: ng!,
          session
        },
        running
      )
    );
  }, [online, running, session, receivedAt, ok, ng]);
  useEffect(() => {
    try {
      if (tracker.last)
        sessionStorage.setItem(rateCacheKey, JSON.stringify(tracker.last));
      else sessionStorage.removeItem(rateCacheKey);
    } catch {
      // Storage may be disabled; keep the reading in memory for this screen.
    }
  }, [tracker.last, rateCacheKey]);
  const lastRate = tracker.last;
  const rate =
    !historical &&
    lastRate &&
    session &&
    receivedAt &&
    ok !== undefined &&
    ng !== undefined &&
    compatibleRateSample(lastRate.sample, { session, time: receivedAt, ok, ng })
      ? lastRate.value
      : null;
  const measuring =
    running &&
    tracker.samples.length >= 2 &&
    tracker.samples[tracker.samples.length - 1].time -
      tracker.samples[0].time >=
      10000;
  const counts = historical ? report : state;
  const classified = counts ? counts.ok + counts.ng : 0;
  const duration = (value?: number) => {
    if (value === undefined || !Number.isFinite(value) || value < 0) return '—';
    const seconds = Math.floor(value);
    return [
      Math.floor(seconds / 3600),
      Math.floor(seconds / 60) % 60,
      seconds % 60
    ]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  };
  const percent = (value: number) =>
    classified > 0
      ? `${((100 * value) / classified).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`
      : '—';
  const appTime = (value?: number | null) => {
    if (!value || !Number.isFinite(value) || value <= 0) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return {
      time: date.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false
      }),
      date: date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };
  };
  const appStarted = appTime(state?.app_started_at_ms);
  const appExited =
    state?.app_exited_at_ms &&
    state.app_started_at_ms &&
    state.app_exited_at_ms >= state.app_started_at_ms
      ? appTime(state.app_exited_at_ms)
      : null;
  return (
    <>
      <div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
        {[
          ['Tổng sản phẩm', counts?.total.toLocaleString('vi-VN') ?? '—'],
          ['OK', counts?.ok.toLocaleString('vi-VN') ?? '—'],
          ['NG', counts?.ng.toLocaleString('vi-VN') ?? '—'],
          ['Tỷ lệ OK', counts ? percent(counts.ok) : '—'],
          ['Tỷ lệ NG', counts ? percent(counts.ng) : '—'],
          [
            historical ? 'Thời gian chạy' : 'Thời gian chạy hôm nay',
            duration(historical ? undefined : state?.run_seconds)
          ],
          [
            historical ? 'Thời gian dừng' : 'Thời gian dừng hôm nay',
            duration(historical ? undefined : state?.stop_seconds)
          ]
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
              : rate > 0 && rate * 60 < 1
                ? '< 1 SP/phút'
                : `${Math.round(rate * 60).toLocaleString('vi-VN')} SP/phút`}
          </div>
          {(historical || rate !== null || running) && (
            <div className="mt-1 text-xs text-gray-500">
              {historical
                ? 'Chưa có dữ liệu tốc độ theo ngày.'
                : rate === null
                  ? running
                    ? 'Lấy mẫu tối thiểu 10 giây.'
                    : null
                  : !online
                    ? 'Dữ liệu cuối trước khi mất kết nối.'
                    : !running
                      ? 'Tốc độ cuối trước khi dừng.'
                      : !measuring
                        ? 'Tốc độ cuối · đang lấy mẫu mới.'
                        : null}
            </div>
          )}
        </Card>
        {!historical &&
          [
            {
              label: 'Mở ứng dụng',
              stamp: appStarted,
              fallback: 'Chưa ghi nhận'
            },
            {
              label: 'Thoát ứng dụng',
              stamp: appExited,
              fallback: online && appStarted ? 'Đang chạy' : 'Chưa ghi nhận'
            }
          ].map(({ label, stamp, fallback }) => (
            <Card
              key={label}
              size="small"
              className="liquid-glass-card !rounded-2xl"
              classNames={{
                body: 'flex h-full min-h-32 flex-col items-center justify-center text-center'
              }}
            >
              <div className="text-sm">{label}</div>
              <div className="text-center text-2xl font-semibold">
                {stamp?.time ?? fallback}
              </div>
              {stamp && label !== 'Mở ứng dụng' && (
                <div className="text-sm text-gray-500">{stamp.date}</div>
              )}
            </Card>
          ))}
      </div>
      {historical && (
        <div className="text-xs text-gray-500">
          Số liệu theo ngày đã chọn · Tỷ lệ trên OK + NG. Chưa có dữ liệu thời
          gian chạy/dừng theo ngày.
        </div>
      )}
    </>
  );
}
