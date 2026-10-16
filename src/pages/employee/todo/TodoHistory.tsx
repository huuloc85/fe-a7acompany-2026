import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { UserInfo } from '@components/UserInfo';
import { productStatusOptions } from '@constants/productStatus.enum';
import { fetchTodoHistory } from '@services/TodoService';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { DatePicker, Empty, Select, Spin, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import { FaCalendarAlt, FaSearch } from 'react-icons/fa';
import { FaClockRotateLeft } from 'react-icons/fa6';
import { dateTimeToShift } from '@utils/dateTimeToShift';

interface TodoOption {
  key: string;
  label: string;
  value: string;
  searchText: string;
}

export const TodoHistory = () => {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [selectProduct, setSelectProduct] = useState<string | undefined>(
    undefined
  );

  const { data: histories, isLoading } = useQuery({
    queryKey: ['product', 'todo', 'history', month, selectProduct],
    queryFn: () =>
      fetchTodoHistory({
        month: month.format('YYYY-MM'),
        productId: selectProduct
      })
  });

  const todoOptions: TodoOption[] =
    histories?.products?.map((todo) => ({
      key: todo.id,
      label: todo.name,
      value: todo.id,
      searchText: `${todo.code} ${todo.name}`.toLowerCase()
    })) || [];

  return (
    <>
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaClockRotateLeft className="text-blue-500" />
            <span>Lịch Sử Cập Nhật Sản Lượng</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <Link to="/employee/todo/add-product">
              <AppButton tone="primary">← NHẬP SẢN PHẨM</AppButton>
            </Link>
          </div>

          <div className="space-y-6 lg:w-1/2">
            {/* ── User Info ──────────────────────────────────────── */}
            <UserInfo />

            {/* ── Filter Bar ────────────────────────────────────── */}
            <div
              data-tour="production-history-filters"
              className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    <FaCalendarAlt className="mr-1 inline-block text-blue-500" />
                    Tháng
                  </label>
                  <DatePicker
                    value={month}
                    onChange={(date) => setMonth(date)}
                    placeholder="Chọn tháng"
                    format="MM/YYYY"
                    picker="month"
                    className="!rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    <FaSearch className="mr-1 inline-block text-emerald-500" />
                    Sản phẩm
                  </label>
                  <Select
                    options={todoOptions}
                    allowClear
                    showSearch
                    placeholder="Chọn sản phẩm"
                    onChange={(value) => setSelectProduct(value)}
                    optionFilterProp="searchText"
                    filterOption={(input, option) =>
                      String(option?.searchText ?? option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    className="!rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* ── Data Table ────────────────────────────────────── */}
            <div
              data-tour="production-history-records"
              className="rounded-xl border border-gray-100 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50"
            >
              {/* Header Row - Desktop only */}
              <div className="hidden border-b border-gray-200 bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-4 dark:border-gray-700 dark:bg-gray-800">
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Ngày
                </span>
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Ca
                </span>
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Loại
                </span>
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Số lượng
                </span>
              </div>
              {/* Data Rows */}
              <Spin spinning={isLoading}>
                {histories?.data && histories.data.length > 0 ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {histories.data.map((history) => (
                      <div key={history.id}>
                        {/* Desktop row */}
                        <div className="hidden px-4 py-3 transition-colors hover:bg-gray-50 sm:grid sm:grid-cols-4 dark:hover:bg-gray-800/30">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {dayjs(history.date).format('DD/MM/YYYY')}
                          </span>
                          <span>
                            {history.status === 1 &&
                              (() => {
                                const shiftValue = history.shift
                                  ? history.shift
                                  : dateTimeToShift(
                                        dayjs(history.date).format(
                                          'DD-MM-YYYY'
                                        ),
                                        String(history.created_at)
                                      ) === 2
                                    ? 'Ca 2'
                                    : 'Ca 1';
                                return (
                                  <Tag
                                    color={
                                      shiftValue === 'Ca 1' ? 'blue' : 'purple'
                                    }
                                    className="!text-xs"
                                  >
                                    {shiftValue}
                                  </Tag>
                                );
                              })()}
                          </span>
                          <span>
                            <Tag color="blue" className="!text-xs">
                              {
                                productStatusOptions.find(
                                  (item) => item.value === history.status
                                )?.label
                              }
                            </Tag>
                          </span>
                          <span className="font-semibold text-blue-600">
                            {Number(history.quantity || 0).toLocaleString(
                              'vi-VN'
                            )}
                          </span>
                        </div>

                        {/* Mobile row */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:hidden">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {dayjs(history.date).format('DD/MM/YYYY')}
                              </span>
                              {history.status === 1 &&
                                (() => {
                                  const shiftValue = history.shift
                                    ? history.shift
                                    : dateTimeToShift(
                                          dayjs(history.date).format(
                                            'DD-MM-YYYY'
                                          ),
                                          String(history.created_at)
                                        ) === 2
                                      ? 'Ca 2'
                                      : 'Ca 1';
                                  return (
                                    <Tag
                                      color={
                                        shiftValue === 'Ca 1'
                                          ? 'blue'
                                          : 'purple'
                                      }
                                      className="!m-0 !text-[11px]"
                                    >
                                      {shiftValue}
                                    </Tag>
                                  );
                                })()}
                              <Tag color="blue" className="!m-0 !text-[11px]">
                                {
                                  productStatusOptions.find(
                                    (item) => item.value === history.status
                                  )?.label
                                }
                              </Tag>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-blue-600">
                            {Number(history.quantity || 0).toLocaleString(
                              'vi-VN'
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8">
                    <Empty description="Không có dữ liệu" />
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </ComponentCard>
    </>
  );
};
