import QueryErrorNotice from '@components/common/QueryErrorNotice';
import AppSearchInput from '@/components/common/AppSearchInput';
import { QueryParams } from '@/types/queryParams';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { useCrudList } from '@hooks/useCrudList';
import { empScheduleService } from '@services/workScheduleService';
import { Empty, Select, Spin, Tag } from 'antd';

import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { useState, useEffect, useMemo, useId } from 'react';
import { FaSearch, FaCalendarAlt, FaCalendarCheck } from 'react-icons/fa';
import { ScheduleDetailContent } from './ScheduleDetailContent';
import { useSearch } from '@tanstack/react-router';

export const ScheduleList = () => {
  const fieldId = useId();
  const [params, setParams] = useState<QueryParams>({
    limit: 0,
    sort: '-date'
  });
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null
  );
  const search = useSearch({ strict: false }) as { openId?: string };

  // Auto-open detail from notification
  useEffect(() => {
    if (search.openId) {
      setSelectedScheduleId(search.openId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [search.openId]);

  const {
    data,
    pagination,
    queryResult: { isLoading, isFetching, refetch, isError }
  } = useCrudList({
    service: empScheduleService,
    queryKey: 'empWorkSchedules',
    initialFilters: params
  });

  useEffect(() => {
    if (selectedScheduleId || search.openId || !data.length) {
      return;
    }

    setSelectedScheduleId(String(data[0].id));
  }, [data, search.openId, selectedScheduleId]);

  const selectedSchedule = data.find(
    (item) => String(item.id) === selectedScheduleId
  );

  const scheduleOptions = data.map((item) => ({
    value: String(item.id),
    label: item.title,
    date: item.date
  }));

  const handleSearch = useMemo(
    () =>
      debounce((value: string) => {
        setParams((prev) => ({
          ...prev,
          'filter[title]': value ? value : undefined
        }));
      }, 300),
    []
  );
  useEffect(() => () => handleSearch.cancel(), [handleSearch]);

  return (
    <>
      <ComponentCard
        actions={<BackButton to="/" />}
        headingLevel={1}
        title={
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-blue-500" />
            <span>Danh sách lịch làm việc</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Action Bar ──────────────────────────────────────── */}
          <div className="ui-toolbar flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton isLoading={isFetching} refresh={refetch} />
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <FaCalendarCheck className="text-xs text-blue-500" />
              <Tag color="blue" className="!m-0 !text-xs">
                Tổng: <strong>{pagination.total ?? 0}</strong> lịch
              </Tag>
            </div>
          </div>

          {/* ── Filter Bar ──────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
            <div data-tour="schedule-search" className="flex flex-col gap-1">
              <label
                htmlFor={`${fieldId}-search`}
                className="text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                <FaSearch className="mr-1 inline-block text-gray-400" />
                Tìm kiếm
              </label>
              <AppSearchInput
                id={`${fieldId}-search`}
                className="max-w-sm"
                placeholder="Nhập tiêu đề lịch làm việc..."
                onChange={(e) => {
                  const inputValue = e.target.value;
                  handleSearch(inputValue);
                }}
              />
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────── */}
          <QueryErrorNotice
            isError={isError}
            isFetching={isFetching}
            onRetry={refetch}
          />

          {/* ── Content ────────────────────────────────────────── */}
          <Spin spinning={isLoading}>
            {data.length > 0 ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Lịch làm việc đang xem
                    </h2>
                    {selectedSchedule && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tháng {dayjs(selectedSchedule.date).format('MM/YYYY')}
                      </p>
                    )}
                  </div>
                  <div
                    data-tour="schedule-select"
                    className="w-full xl:w-[360px]"
                  >
                    <label
                      htmlFor={`${fieldId}-schedule`}
                      className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
                    >
                      <FaCalendarAlt className="text-blue-500" />
                      Đổi lịch làm việc
                    </label>
                    <Select
                      id={`${fieldId}-schedule`}
                      value={selectedScheduleId ?? undefined}
                      options={scheduleOptions}
                      onChange={setSelectedScheduleId}
                      placeholder="Chọn lịch làm việc"
                      className="w-full [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-blue-200 [&_.ant-select-selector]:!bg-white [&_.ant-select-selector]:!shadow-sm dark:[&_.ant-select-selector]:!border-blue-900 dark:[&_.ant-select-selector]:!bg-gray-900"
                      showSearch
                      optionFilterProp="label"
                      size="large"
                      suffixIcon={<FaCalendarAlt className="text-gray-400" />}
                      optionRender={(option) => {
                        const schedule = option.data as {
                          label: string;
                          date: string;
                        };

                        return (
                          <div className="py-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {schedule.label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Tháng {dayjs(schedule.date).format('MM/YYYY')}
                            </div>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>

                <ScheduleDetailContent scheduleId={selectedScheduleId} />
              </div>
            ) : (
              !isError && !isLoading && <Empty description="Không có dữ liệu" />
            )}
          </Spin>
        </div>
      </ComponentCard>
    </>
  );
};
