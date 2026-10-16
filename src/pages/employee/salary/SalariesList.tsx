import AppSearchInput from '@/components/common/AppSearchInput';
import { QueryParams } from '@/types/queryParams';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { fetchEmpSalaries, fetchSalaryDetail } from '@services/SalaryService';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Alert, Empty, Select, Spin, Tag } from 'antd';

import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { useEffect, useState } from 'react';
import {
  FaCalendarAlt,
  FaSearch,
  FaMoneyBillWave,
  FaMoneyCheckAlt
} from 'react-icons/fa';
import { PayslipDetailContent } from '@components/salaries/PayslipDetailContent';
import { useSearch } from '@tanstack/react-router';

export default function SalariesList() {
  const [params, setParams] = useState<QueryParams>({
    limit: 0,
    sort: '-end_date'
  });
  const [selectedSalaryId, setSelectedSalaryId] = useState<string | null>(null);
  const search = useSearch({ strict: false }) as { openId?: string };

  // Auto-open detail from notification
  useEffect(() => {
    if (search.openId) {
      setSelectedSalaryId(search.openId);
      // Clean URL param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [search.openId]);

  const {
    data: salaries,
    isFetching,
    isLoading,
    refetch,
    isError
  } = useQuery({
    queryKey: ['salariesList', 'employee', params],
    queryFn: async () => await fetchEmpSalaries(params),
    placeholderData: keepPreviousData
  });

  // Fetch detail when a salary is selected
  const {
    data: salaryDetails,
    isLoading: isDetailLoading,
    error: detailError
  } = useQuery({
    queryKey: ['salaryDetail', selectedSalaryId],
    queryFn: async () => {
      const response = await fetchSalaryDetail(selectedSalaryId!);
      return response;
    },
    enabled: !!selectedSalaryId,
    placeholderData: keepPreviousData,
    retry: false
  });

  useEffect(() => {
    if (selectedSalaryId || search.openId || !salaries?.data.length) {
      return;
    }

    setSelectedSalaryId(String(salaries.data[0].id));
  }, [salaries?.data, search.openId, selectedSalaryId]);

  const selectedSalary = salaries?.data.find(
    (item) => String(item.id) === selectedSalaryId
  );

  const salaryOptions =
    salaries?.data.map((item) => ({
      value: String(item.id),
      label: item.title,
      startDate: item.start_date,
      endDate: item.end_date
    })) ?? [];

  const handleSearch = debounce((value: string) => {
    setParams((prev) => ({
      ...prev,
      'filter[title]': value ? value : undefined
    }));
  }, 300);

  return (
    <>
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaMoneyBillWave className="text-emerald-500" />
            <span>Danh sách bảng lương</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Action Bar ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton isLoading={isFetching} refresh={refetch} />
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <FaMoneyCheckAlt className="text-xs text-emerald-500" />
              <Tag color="blue" className="!m-0 !text-xs">
                Tổng: <strong>{salaries?.total ?? 0}</strong> bảng lương
              </Tag>
            </div>
          </div>

          {/* ── Filter Bar ──────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaSearch className="mr-1 inline-block text-gray-400" />
                Tìm kiếm
              </label>
              <AppSearchInput
                className="max-w-sm"
                placeholder="Nhập tiêu đề bảng lương..."
                onChange={(e) => {
                  const inputValue = e.target.value;
                  handleSearch(inputValue);
                }}
              />
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────── */}
          {isError && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
              <Alert
                message="Đã có lỗi xảy ra vui lòng thử lại sau"
                type="error"
                showIcon
              />
            </div>
          )}

          {/* ── Content ────────────────────────────────────────── */}
          <Spin spinning={isLoading}>
            {salaries && salaries.data.length > 0 ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Phiếu lương đang xem
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedSalary
                          ? `${selectedSalary.title} (${dayjs(selectedSalary.start_date).format('DD/MM/YYYY')} - ${dayjs(selectedSalary.end_date).format('DD/MM/YYYY')})`
                          : 'Đang tải phiếu lương'}
                      </p>
                    </div>
                    <div className="w-full xl:w-[360px]">
                      <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <FaCalendarAlt className="text-emerald-500" />
                        Đổi kỳ lương
                      </label>
                      <Select
                        value={selectedSalaryId ?? undefined}
                        options={salaryOptions}
                        onChange={setSelectedSalaryId}
                        placeholder="Chọn kỳ lương"
                        className="w-full [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-emerald-200 [&_.ant-select-selector]:!bg-white [&_.ant-select-selector]:!shadow-sm dark:[&_.ant-select-selector]:!border-emerald-900 dark:[&_.ant-select-selector]:!bg-gray-900"
                        showSearch
                        optionFilterProp="label"
                        size="large"
                        suffixIcon={<FaCalendarAlt className="text-gray-400" />}
                        dropdownStyle={{ minWidth: 340 }}
                        optionRender={(option) => {
                          const data = option.data as {
                            label: string;
                            startDate: string;
                            endDate: string;
                          };

                          return (
                            <div className="py-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {data.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {dayjs(data.startDate).format('DD/MM/YYYY')} -{' '}
                                {dayjs(data.endDate).format('DD/MM/YYYY')}
                              </div>
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>

                  <PayslipDetailContent
                    salaryDetails={salaryDetails}
                    isLoading={isDetailLoading}
                    error={detailError}
                  />
                </div>
              </div>
            ) : (
              <Empty description="Không có dữ liệu" />
            )}
          </Spin>
        </div>
      </ComponentCard>
    </>
  );
}
