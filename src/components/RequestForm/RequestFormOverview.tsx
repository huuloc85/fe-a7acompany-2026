import { useMemo } from 'react';
import { DatePicker, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import {
  adminRequestFormService,
  supervisorRequestFormService
} from '@services/RequestFormService';
import { FaCalendarAlt, FaUserClock, FaMedal } from 'react-icons/fa';

export const RequestFormOverview = ({
  year,
  onYearChange,
  supervisorId
}: {
  year: Dayjs;
  onYearChange: (date: Dayjs) => void;
  supervisorId?: string;
}) => {
  const fromDate = year.startOf('year').format('YYYY-MM-DD');
  const toDate = year.endOf('year').format('YYYY-MM-DD');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-request-forms-overview', supervisorId, fromDate, toDate],
    queryFn: () =>
      (supervisorId
        ? supervisorRequestFormService
        : adminRequestFormService
      ).getList({
        per_page: 10000,
        from_date: fromDate,
        to_date: toDate
      })
  });

  const requestForms = useMemo(
    () => data?.data?.data || [],
    [data?.data?.data]
  );

  const overviewData = useMemo(() => {
    let leaveCount = 0;
    let lateEarlyCount = 0;

    const employeeLeaveMap: Record<string, { name: string; count: number }> =
      {};

    requestForms.forEach((form) => {
      if (form.type === 'don_xin_nghi_phep') {
        leaveCount++;
        const empId = form.employee?.id;
        const empName = form.employee?.name || 'Unknown';

        if (empId) {
          if (!employeeLeaveMap[empId]) {
            employeeLeaveMap[empId] = { name: empName, count: 0 };
          }
          // Lấy số ngày nghỉ từ form_data (nếu có), nếu không mặc định quy đổi là 1
          const days =
            Number((form.form_data as Record<string, unknown>)?.so_ngay_nghi) ||
            1;
          employeeLeaveMap[empId].count += days;
        }
      } else if (form.type === 'don_xin_di_tre_ve_som') {
        lateEarlyCount++;
      }
    });

    let topEmployee = 'Chưa có thông tin';
    let maxLeaves = 0;

    Object.values(employeeLeaveMap).forEach((emp) => {
      if (emp.count > maxLeaves) {
        maxLeaves = emp.count;
        topEmployee = `${emp.name} (${emp.count} ngày)`;
      }
    });

    return {
      leaveCount,
      lateEarlyCount,
      topEmployee
    };
  }, [requestForms]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:gap-4 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 md:text-xl dark:text-gray-100">
          Tổng quan năm {year.year()}
        </h3>
        <DatePicker
          picker="year"
          value={year}
          onChange={(date) => date && onYearChange(date)}
          allowClear={false}
          className="w-full !rounded-lg sm:w-32"
          placeholder="Chọn năm"
          size="large"
        />
      </div>

      <Spin spinning={isLoading}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {/* Box 1: Đơn nghỉ phép */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md md:p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500 md:h-12 md:w-12 dark:bg-blue-900/30 dark:text-blue-400">
              <FaCalendarAlt className="text-[15px] md:text-xl" />
            </div>
            <div className="mt-3 md:mt-4">
              <div className="text-2xl font-bold text-gray-800 md:text-3xl dark:text-gray-100">
                {overviewData.leaveCount}
              </div>
              <div className="mt-1 flex min-h-[32px] items-start text-xs font-medium text-gray-500 md:min-h-[40px] md:text-sm dark:text-gray-400">
                <span className="line-clamp-2">Đơn xin nghỉ phép</span>
              </div>
            </div>
          </div>

          {/* Box 2: Đơn đi trễ, về sớm */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md md:p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 md:h-12 md:w-12 dark:bg-orange-900/30 dark:text-orange-400">
              <FaUserClock className="text-[15px] md:text-xl" />
            </div>
            <div className="mt-3 md:mt-4">
              <div className="text-2xl font-bold text-gray-800 md:text-3xl dark:text-gray-100">
                {overviewData.lateEarlyCount}
              </div>
              <div className="mt-1 flex min-h-[32px] items-start text-xs font-medium text-gray-500 md:min-h-[40px] md:text-sm dark:text-gray-400">
                <span className="line-clamp-2">Đơn đi trễ, về sớm</span>
              </div>
            </div>
          </div>

          {/* Box 3: Người xin nghỉ nhiều nhất */}
          <div className="col-span-2 flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md md:col-span-1 md:p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-500 md:h-12 md:w-12 dark:bg-purple-900/30 dark:text-purple-400">
              <FaMedal className="text-[15px] md:text-xl" />
            </div>
            <div className="mt-3 md:mt-4">
              <div
                className="text-sm leading-snug font-bold text-gray-800 md:text-lg dark:text-gray-100"
                title={overviewData.topEmployee}
              >
                {overviewData.topEmployee}
              </div>
              <div className="mt-1 flex min-h-[32px] items-start text-xs font-medium text-gray-500 md:min-h-[40px] md:text-sm dark:text-gray-400">
                <span className="line-clamp-2">Nghỉ nhiều nhất</span>
              </div>
            </div>
          </div>
        </div>
      </Spin>
    </div>
  );
};
