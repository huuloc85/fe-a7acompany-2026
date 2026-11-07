import QueryErrorNotice from '@components/common/QueryErrorNotice';
import {
  Table,
  TableColumnsType,
  TableProps,
  Tag,
  Pagination,
  Spin
} from 'antd';
import { useState } from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import { useIsMobile } from '@hooks/useIsMobile';

import { roleService } from '@services/RoleService';
import { roleFields } from '@/configs/roleForm.config';
import { useCrudList } from '@/hooks/useCrudList';
import { roleCreateSchema } from '@/schema/roleSchema.schema';
import { RoleType } from '@/types/roleType';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { CreateModal } from '@components/ui/CRUD/CreateModal';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { UpdateModal } from '@components/ui/CRUD/UpdateModal';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import { ActionGroup } from '@components/common/ActionButtons';
import { motion } from 'framer-motion';

export default function RoleList() {
  const isMobile = useIsMobile();
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const { data, pagination, queryResult } = useCrudList({
    service: roleService,
    queryKey: 'roles',
    initialFilters: {
      page,
      limit,
      sort: '-id'
    }
  });

  const { isLoading, isFetching, isError, refetch } = queryResult;

  const roles = data || [];
  const total = pagination.total || 0;

  const columns: TableColumnsType<RoleType> = [
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
      title: 'Tên chức vụ',
      minWidth: 200,
      dataIndex: 'role_name',
      render: (value) => (
        <span className="font-medium text-gray-800 dark:text-white/90">
          {value || <span className="text-gray-400 italic">Chưa có</span>}
        </span>
      )
    },
    {
      title: 'Mã chức vụ',
      align: 'center',
      width: 120,
      dataIndex: 'id',
      render: (value) => (
        <Tag color="blue" className="!font-mono !text-xs">
          {value}
        </Tag>
      )
    },
    {
      title: 'Ngày tạo',
      minWidth: 180,
      dataIndex: 'created_at',
      align: 'center',
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
      minWidth: 180,
      dataIndex: 'updated_at',
      align: 'center',
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
      width: 160,
      align: 'center',
      render: (_, record) => {
        return (
          <ActionGroup>
            <UpdateModal
              id={record.id}
              service={roleService}
              schema={roleCreateSchema}
              fields={roleFields}
            />
            <ConfirmButton id={record.id} service={roleService} />
          </ActionGroup>
        );
      }
    }
  ];

  const tableProps: TableProps<RoleType> = {
    ...(customTableProps as unknown as TableProps<RoleType>),
    rowKey: (record) => ['role', record.id].join('-'),
    columns: columns,
    dataSource: roles,
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
      }
    }
  };

  return (
    <ComponentCard title="Quản lý chức vụ" headingLevel={1}>
      <div className="space-y-5">
        <QueryErrorNotice
          isError={isError}
          isFetching={isFetching}
          onRetry={refetch}
        />
        {/* ── Action Bar ────────────────────────────────────────── */}
        <div className="ui-toolbar flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <RefreshButton refresh={refetch} isLoading={isFetching} />
          <CreateModal
            schema={roleCreateSchema}
            service={roleService}
            fields={roleFields}
          />
          {/* Role count badge */}
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <FaShieldAlt className="text-xs text-blue-500" />
            <span className="text-xs text-gray-500">
              Tổng: <strong className="text-blue-600">{total}</strong> chức vụ
            </span>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        {isMobile ? (
          <Spin spinning={isLoading}>
            {roles.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-12 dark:border-gray-700 dark:bg-gray-800">
                <FaShieldAlt className="mb-3 text-3xl text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400">
                  Không có dữ liệu chức vụ
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {roles.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    >
                      {/* Card top: index + ID badge */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {index + 1 + limit * (page - 1)}
                          </span>
                          <span className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
                            {record.role_name || (
                              <span className="text-gray-400 italic">
                                Chưa có
                              </span>
                            )}
                          </span>
                        </div>
                        <Tag color="blue" className="!m-0 !font-mono !text-xs">
                          {record.id}
                        </Tag>
                      </div>

                      {/* Dates */}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                        <span>
                          Tạo:{' '}
                          {new Date(record.created_at).toLocaleDateString(
                            'vi-VN',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }
                          )}
                        </span>
                        <span>·</span>
                        <span>
                          Cập nhật:{' '}
                          {new Date(record.updated_at).toLocaleDateString(
                            'vi-VN',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }
                          )}
                        </span>
                      </div>

                      {/* Actions */}
                      <ActionGroup className="mt-3 !justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
                        <UpdateModal
                          id={record.id}
                          service={roleService}
                          schema={roleCreateSchema}
                          fields={roleFields}
                          size="small"
                        />
                        <ConfirmButton
                          id={record.id}
                          service={roleService}
                          size="small"
                        />
                      </ActionGroup>
                    </motion.div>
                  ))}
                </div>
                {total > limit && (
                  <div className="mt-4 flex justify-center">
                    <Pagination
                      {...customPaginationProps}
                      current={page}
                      pageSize={limit}
                      total={total}
                      onChange={(p, size) => {
                        setPage(p);
                        setLimit(size);
                      }}
                      size="small"
                    />
                  </div>
                )}
              </>
            )}
          </Spin>
        ) : (
          <Table<RoleType> {...tableProps} />
        )}
      </div>
    </ComponentCard>
  );
}
