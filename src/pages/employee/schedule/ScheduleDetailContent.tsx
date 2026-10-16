import axiosPrivate from '@/api/axiosInstance';
import { workLegends } from '@/configs/legend/workLegends.config';
import { PaginatedResponse } from '@/types/responseTypes';
import { ScheduleDetailType } from '@/types/scheduleDetailType';
import { uiStore } from '@stores/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { Empty, Spin } from 'antd';
import dayjs from 'dayjs';
import { ScheduleWcListSection } from './SchemaListSection';

// ── Mobile schedule card ────────────────────────────────────────────────────
function MobileScheduleCard({ item }: { item: ScheduleDetailType }) {
  const date = dayjs(item.date);
  const isWeekend = date.day() === 0 || date.day() === 6;
  const legend = item.hnhc !== null ? workLegends[item.hnhc] : null;

  return (
    <div
      className={`flex items-center rounded-lg border px-3 py-2.5 transition-all ${
        isWeekend ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-white'
      }`}
      style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}
    >
      {/* Weekday - fixed width */}
      <span
        className={`w-7 shrink-0 text-center text-[12px] font-semibold ${
          isWeekend ? 'text-red-400' : 'text-gray-400'
        }`}
        style={{ flexShrink: 0, width: '28px', textAlign: 'center' }}
      >
        {date.format('dd')}
      </span>
      {/* Date - grows */}
      <span
        className="ml-2 flex-1 text-sm font-medium text-gray-700"
        style={{ flex: 1, marginLeft: '8px' }}
      >
        {date.format('DD/MM')}
      </span>
      {/* Shift icon + label - grouped, pushed right */}
      <div
        className="ml-auto flex w-28 shrink-0 items-center gap-1.5"
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          width: '112px'
        }}
      >
        <span
          className="w-8 shrink-0 text-center"
          style={{
            flexShrink: 0,
            width: '32px',
            textAlign: 'center',
            marginRight: '6px'
          }}
        >
          {legend ? legend.icon : <span className="text-gray-300">-</span>}
        </span>
        <span className="text-[12px] text-gray-500">{legend?.label ?? ''}</span>
      </div>
    </div>
  );
}

// ── Desktop schedule row ────────────────────────────────────────────────────
function DesktopScheduleRow({ item }: { item: ScheduleDetailType }) {
  const date = dayjs(item.date);
  const isWeekend = date.day() === 0 || date.day() === 6;
  const legend = item.hnhc !== null ? workLegends[item.hnhc] : null;

  return (
    <div
      className={`flex items-center px-4 py-2.5 transition-colors ${
        isWeekend
          ? 'bg-gray-50 dark:bg-gray-800/30'
          : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/20'
      }`}
    >
      {/* Weekday - fixed width */}
      <span
        className={`w-8 shrink-0 text-center text-xs font-semibold ${
          isWeekend ? 'text-red-400' : 'text-gray-400'
        }`}
      >
        {date.format('dd')}
      </span>
      {/* Date - grows */}
      <span className="ml-3 flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        {date.format('DD/MM/YYYY')}
      </span>
      {/* Shift icon + label - grouped, pushed right */}
      <div className="ml-auto flex w-32 shrink-0 items-center gap-2">
        <span className="w-9 shrink-0 text-center">
          {legend ? legend.icon : <span className="text-gray-300">-</span>}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {legend?.label ?? ''}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main Content Component (used inside Drawer)
// ═══════════════════════════════════════════════════════════════════════════

interface ScheduleDetailContentProps {
  scheduleId: string | null;
}

export const ScheduleDetailContent = ({
  scheduleId
}: ScheduleDetailContentProps) => {
  const { isMobile } = useStore(uiStore);

  const { data, isLoading } = useQuery({
    queryKey: ['empScheduleDetail', scheduleId],
    queryFn: async () => {
      const response = await axiosPrivate.get<
        ScheduleDetailType,
        PaginatedResponse<ScheduleDetailType>
      >(`/api/employee/schedules/${scheduleId}`, {
        params: { limit: 0, sort: 'date' }
      });
      return response;
    },
    enabled: !!scheduleId
  });

  const scheduleData = data?.data ?? [];

  // Derive month from first data item
  const monthLabel =
    scheduleData.length > 0
      ? dayjs(scheduleData[0].date).format('MM/YYYY')
      : '';

  return (
    <div className="space-y-4">
      {/* ── Legend ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
          Chú thích
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.values(workLegends).map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Schedule Detail ──────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50">
        {/* Month header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            📅 Chi tiết lịch làm việc
          </h3>
          {monthLabel && (
            <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              Tháng {monthLabel}
            </span>
          )}
        </div>

        <Spin spinning={isLoading}>
          {scheduleData.length > 0 ? (
            isMobile ? (
              <div className="flex flex-col gap-1.5 p-3">
                {scheduleData.map((item) => (
                  <MobileScheduleCard
                    key={`hnhc_${item.date}-${item.employee_id}-${item.schedule_id}-${item.hnhc}`}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {scheduleData.map((item) => (
                  <DesktopScheduleRow
                    key={`hnhc_${item.date}-${item.employee_id}-${item.schedule_id}-${item.hnhc}`}
                    item={item}
                  />
                ))}
              </div>
            )
          ) : (
            !isLoading && (
              <div className="p-6">
                <Empty description="Không có dữ liệu" />
              </div>
            )
          )}
        </Spin>
      </div>

      {/* ── Additional Schedules (WC, eat room, etc.) ──────── */}
      {scheduleData.some(
        (item) =>
          item.is_eat_room ||
          item.is_wc_trash ||
          item.is_wc_clean_women ||
          item.is_wc_clean_men
      ) && (
        <div data-tour="schedule-cleaning-duty" className="space-y-4">
          {scheduleData.some((item) => item.is_eat_room) && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                🍽️ Lịch trực phòng ăn
              </h3>
              <ScheduleWcListSection
                dataSource={scheduleData.filter((item) => item.is_eat_room)}
                loading={isLoading}
              />
            </div>
          )}

          {scheduleData.some((item) => item.is_wc_trash) && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                🗑️ Lịch đổ rác WC
              </h3>
              <ScheduleWcListSection
                dataSource={scheduleData.filter((item) => item.is_wc_trash)}
                loading={isLoading}
              />
            </div>
          )}

          {scheduleData.some((item) => item.is_wc_clean_women) && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                🚺 Lịch trực WC nữ
              </h3>
              <ScheduleWcListSection
                dataSource={scheduleData.filter(
                  (item) => item.is_wc_clean_women
                )}
                loading={isLoading}
              />
            </div>
          )}

          {scheduleData.some((item) => item.is_wc_clean_men) && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                🚹 Lịch trực WC nam
              </h3>
              <ScheduleWcListSection
                dataSource={scheduleData.filter((item) => item.is_wc_clean_men)}
                loading={isLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
