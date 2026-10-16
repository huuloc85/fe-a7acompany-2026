import { Empty, Select, Spin } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCalendarCheck } from 'react-icons/fa';

import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { AddWorkSchedule } from '@components/workSchedules/AddModal';
import { DeleteModal } from '@components/workSchedules/DeleteModal';
import { scheduleService } from '@services/workScheduleService';
import Detail from './Detail';

import { useCrudList } from '@hooks/useCrudList';
import { QueryParams } from '@/types/queryParams';
import { useAuth } from '@hooks/useAuth';
import { isAllowRole } from '@utils/authUtil';

export default function WorkScheduleList() {
  const { user } = useAuth();
  const [params] = useState<QueryParams>({ limit: 0, sort: '-date' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shouldSelectLatestAfterCreate, setShouldSelectLatestAfterCreate] =
    useState(false);
  const hasObservedCreateRefetchRef = useRef(false);
  const canManageWorkSchedules = isAllowRole(user, [
    'admin',
    'super admin',
    'co admin'
  ]);

  const {
    data,
    pagination,
    queryResult: { isLoading, isFetching, refetch }
  } = useCrudList({
    service: scheduleService,
    queryKey: 'workSchedules',
    initialFilters: params
  });

  const workSchedules = useMemo(() => data || [], [data]);

  const selectedSchedule = useMemo(
    () => workSchedules.find((item) => item.id === selectedId) || null,
    [selectedId, workSchedules]
  );

  const scheduleOptions = useMemo(
    () =>
      workSchedules.map((item) => ({
        value: item.id,
        label: item.title,
        date: item.date
      })),
    [workSchedules]
  );

  useEffect(() => {
    if (selectedId || !workSchedules.length) return;
    setSelectedId(workSchedules[0].id);
  }, [selectedId, workSchedules]);

  useEffect(() => {
    if (!shouldSelectLatestAfterCreate) {
      return;
    }

    if (isFetching) {
      hasObservedCreateRefetchRef.current = true;
      return;
    }

    if (!hasObservedCreateRefetchRef.current || !workSchedules.length) {
      return;
    }

    setSelectedId(workSchedules[0].id);
    setShouldSelectLatestAfterCreate(false);
    hasObservedCreateRefetchRef.current = false;
  }, [isFetching, shouldSelectLatestAfterCreate, workSchedules]);

  return (
    <ComponentCard
      className="!overflow-visible"
      title="Danh sách lịch làm việc"
    >
      <div className="space-y-5">
        {/* ── Action Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <RefreshButton refresh={refetch} isLoading={isFetching} />
          {canManageWorkSchedules && (
            <AddWorkSchedule
              onCreated={() => {
                hasObservedCreateRefetchRef.current = false;
                setShouldSelectLatestAfterCreate(true);
              }}
            />
          )}
          {canManageWorkSchedules && selectedSchedule && (
            <DeleteModal
              id={selectedSchedule.id}
              name={selectedSchedule.title}
              transparent
              onDeleted={() => {
                const nextSchedule = workSchedules.find(
                  (item) => item.id !== selectedSchedule.id
                );

                setSelectedId(nextSchedule?.id ?? null);
              }}
            />
          )}
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <FaCalendarCheck className="text-xs text-blue-500" />
            <span className="text-xs text-gray-500">
              Tổng:{' '}
              <strong className="text-blue-600">
                {pagination?.total || 0}
              </strong>{' '}
              lịch
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <FaCalendarCheck className="text-blue-500" />
                Lịch làm việc đang xem
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedSchedule
                  ? `${selectedSchedule.title} (${dayjs(selectedSchedule.date).format('DD/MM/YYYY')})`
                  : 'Chọn lịch làm việc để xem chi tiết'}
              </p>
            </div>

            <div className="w-full xl:w-[420px]">
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaCalendarCheck className="text-blue-500" />
                Kỳ lịch làm việc
              </label>
              <Select
                data-tour="total-schedules-select"
                value={selectedId ?? undefined}
                options={scheduleOptions}
                onChange={setSelectedId}
                placeholder="Chọn lịch làm việc"
                className="w-full"
                showSearch
                optionFilterProp="label"
                size="large"
                loading={isLoading}
                optionRender={(option) => {
                  const optionData = option.data as {
                    label: string;
                    date: string;
                  };

                  return (
                    <div className="py-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {optionData.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dayjs(optionData.date).format('DD/MM/YYYY')}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>

          <Spin spinning={isLoading}>
            {selectedId ? (
              <Detail scheduleId={selectedId} isDrawer />
            ) : (
              <Empty description="Không có dữ liệu lịch làm việc" />
            )}
          </Spin>
        </div>
      </div>
    </ComponentCard>
  );
}
