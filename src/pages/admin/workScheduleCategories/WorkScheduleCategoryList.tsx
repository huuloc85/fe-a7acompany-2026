import QueryErrorNotice from '@components/common/QueryErrorNotice';
import { useQuery } from '@tanstack/react-query';
import {
  Empty,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tag,
  Pagination
} from 'antd';
import { useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import { useIsMobile } from '@hooks/useIsMobile';

import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { AddModal } from '@components/workScheduleCategories/AddModal';
import { DeleteModal } from '@components/workScheduleCategories/DeleteModal';
import { UpdateWorkScheduleCategory } from '@components/workScheduleCategories/UpdateModal';

import { WorkScheduleCategoryType } from '@/types/workScheduleCategoryType';
import { fetchWorkScheduleCategories } from '@services/WorkScheduleCategoryService';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import { ActionGroup } from '@components/common/ActionButtons';

export default function WorkScheduleCategoryList() {
  const isMobile = useIsMobile();
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching, isError } = useQuery({
    queryKey: ['workScheduleCategories', page, limit],
    queryFn: () => fetchWorkScheduleCategories({ page, limit })
  });

  const { workScheduleCategories, total } = data || {
    workScheduleCategories: [],
    total: 0
  };

  const workScheduleCategoryColumns: TableColumnsType<WorkScheduleCategoryType> =
    [
      {
        title: 'STT',
        rowScope: 'row',
        width: 60,
        align: 'center',
        render: (_value, _record, index) => (
          <span className="font-mono text-xs text-gray-500">
            {index + 1 + limit * (page - 1)}
          </span>
        )
      },
      {
        title: 'Tên danh mục',
        dataIndex: 'name',
        render: (value) => (
          <span className="font-medium text-gray-800 dark:text-white/90">
            {value || <span className="text-gray-400 italic">Chưa có</span>}
          </span>
        )
      },
      {
        title: 'Mã danh mục',
        dataIndex: 'id',
        align: 'center',
        width: 120,
        render: (value) => (
          <Tag color="blue" className="!font-mono !text-xs">
            {value}
          </Tag>
        )
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'created_at',
        align: 'center',
        minWidth: 160,
        render: (value) => (
          <div className="text-center">
            <div className="text-sm">
              {new Date(value).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </div>
            <div className="text-xs text-gray-400">
              {new Date(value).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>
        )
      },
      {
        title: 'Ngày cập nhật',
        dataIndex: 'updated_at',
        align: 'center',
        minWidth: 160,
        render: (value) => (
          <div className="text-center">
            <div className="text-sm">
              {new Date(value).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </div>
            <div className="text-xs text-gray-400">
              {new Date(value).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>
        )
      },
      {
        title: 'Hành động',
        align: 'center',
        width: 180,
        render: (_value, _record) => {
          return (
            <ActionGroup>
              <UpdateWorkScheduleCategory
                categoryId={_record.id}
                categoryName={_record.name}
              />
              <DeleteModal id={_record.id} name={_record.name} />
            </ActionGroup>
          );
        }
      }
    ];

  const tableProps: TableProps<WorkScheduleCategoryType> = {
    ...(customTableProps as unknown as TableProps<WorkScheduleCategoryType>),
    rowKey: (record) => ['workScheduleCategory', record.id].join('-'),
    columns: workScheduleCategoryColumns,
    dataSource: workScheduleCategories,
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      pageSize: limit,
      total: total,
      onShowSizeChange: (_current, size) => {
        setLimit(size);
      },
      onChange: (page) => {
        setPage(page);
      },
      current: page
    }
  };

  return (
    <ComponentCard title="Danh mục lịch làm việc" headingLevel={1}>
      <div className="space-y-5">
        <QueryErrorNotice
          isError={isError}
          isFetching={isFetching}
          onRetry={refetch}
        />
        {/* ── Action Bar ────────────────────────────────────────── */}
        <div className="ui-toolbar flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <RefreshButton refresh={refetch} isLoading={isFetching} />
          <AddModal />
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <FaCalendarAlt className="text-xs text-blue-500" />
            <span className="text-xs text-gray-500">
              Tổng: <strong className="text-blue-600">{total}</strong> danh mục
            </span>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        {isMobile ? (
          <Spin spinning={isLoading}>
            <div className="flex flex-col gap-3">
              {!isLoading &&
                !isError &&
                workScheduleCategories.length === 0 && (
                  <Empty description="Không có dữ liệu danh mục lịch làm việc" />
                )}
              {workScheduleCategories.map((record, index) => (
                <div
                  key={record.id}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                      {index + 1 + limit * (page - 1)}
                    </span>
                    <span className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
                      {record.name || (
                        <span className="text-gray-400 italic">Chưa có</span>
                      )}
                    </span>
                    <Tag
                      color="blue"
                      className="!m-0 ml-auto !font-mono !text-xs"
                    >
                      {record.id}
                    </Tag>
                  </div>
                  <div className="space-y-1 pl-8 text-xs text-gray-500">
                    <div>
                      <span className="font-medium text-gray-500">Tạo:</span>{' '}
                      {new Date(record.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}{' '}
                      {new Date(record.created_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">
                        Cập nhật:
                      </span>{' '}
                      {new Date(record.updated_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}{' '}
                      {new Date(record.updated_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  {/* Actions */}
                  <ActionGroup className="mt-3 !justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
                    <UpdateWorkScheduleCategory
                      categoryId={record.id}
                      categoryName={record.name}
                      size="small"
                    />
                    <DeleteModal
                      id={record.id}
                      name={record.name}
                      size="small"
                    />
                  </ActionGroup>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Pagination
                  {...customPaginationProps}
                  size="small"
                  current={page}
                  pageSize={limit}
                  total={total}
                  onChange={(p, size) => {
                    setPage(p);
                    setLimit(size);
                  }}
                />
              </div>
            </div>
          </Spin>
        ) : (
          <Table<WorkScheduleCategoryType> {...tableProps} />
        )}
      </div>
    </ComponentCard>
  );
}
