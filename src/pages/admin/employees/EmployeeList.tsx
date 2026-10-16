import AppSearchInput from '@/components/common/AppSearchInput';
import { Link } from '@tanstack/react-router';
import {
  Avatar,
  Modal,
  Pagination,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tag
} from 'antd';
import { debounce } from 'lodash';
import { useState } from 'react';
import { FaUser, FaSearch } from 'react-icons/fa';
import { FaFingerprint } from 'react-icons/fa6';
import { LuUserRoundPlus } from 'react-icons/lu';
import { BiTrash } from 'react-icons/bi';
import { useIsMobile } from '@hooks/useIsMobile';

import { useCrudList } from '@/hooks/useCrudList';
import { EmployeeType } from '@/types/employeeType';
import { QueryParams } from '@/types/queryParams';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { ActionGroup, EditButton } from '@components/common/ActionButtons';
import AppButton from '@components/common/AppButton';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { employeeService } from '@services/EmployeeService';

import { STORAGE_URL } from '@/configs/environment.config';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';

export default function EmployeeList() {
  const isMobile = useIsMobile();
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 10,
    include: ['role', 'calendarCategory']
  });

  const {
    data: employees,
    pagination,
    queryResult: { isLoading, isFetching, refetch }
  } = useCrudList({
    service: employeeService,
    queryKey: 'employees',
    initialFilters: params
  });

  const handleSearch = debounce((value: string, type: 'name' | 'code') => {
    setParams((prev) => ({
      ...prev,
      'filter[name]': undefined,
      'filter[id]': undefined
    }));
    if (!value) {
      return;
    }
    if (type == 'name') {
      setParams((prev) => ({
        ...prev,
        'filter[name]': value
      }));
    } else if (type == 'code') {
      setParams((prev) => ({
        ...prev,
        'filter[id]': value
      }));
    }
  }, 300);

  const handleChange: TableProps<EmployeeType>['onChange'] = (
    _pagination,
    filters,
    sorter
  ) => {
    // Sort
    let sortValue = undefined;
    if (!Array.isArray(sorter) && sorter.order && sorter.field) {
      sortValue = `${sorter.order === 'ascend' ? '' : '-'}${sorter.field}`;
    }

    // Filter
    const newFilters: QueryParams = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        newFilters[`filter[${key}]`] = Array.isArray(value)
          ? String(value[0])
          : typeof value === 'boolean' || typeof value === 'bigint'
            ? String(value)
            : value;
      }
    });

    setParams((prev) => ({
      ...prev,
      sort: sortValue,
      ...newFilters
    }));
  };

  const handleAttendanceClick = () => {
    Modal.confirm({
      title: 'Thông báo',
      content: 'Bạn vui lòng đổi mạng A7A để tiếp tục',
      okText: 'Tiếp tục',
      cancelText: 'Hủy',
      onOk: () => {
        window.open('http://192.168.1.200/doc/index.html#/dashboard', '_blank');
      }
    });
  };

  const columns: TableColumnsType<EmployeeType> = [
    {
      title: 'STT',
      rowScope: 'row',
      width: 60,
      align: 'center',
      render: (_value, _record, index) => (
        <span className="font-mono text-xs text-gray-500">
          {index + 1 + (params.limit ?? 10) * ((params.page ?? 1) - 1)}
        </span>
      )
    },
    {
      title: 'Nhân viên',
      minWidth: 200,
      dataIndex: 'name',
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={`${STORAGE_URL}/${record.card_photo}`}
            alt="avatar"
            icon={<FaUser />}
            shape="square"
            size={'large'}
            className="flex-shrink-0"
          />
          <div className="text-nowrap">
            <div className="font-medium text-gray-800 dark:text-white/90">
              {value}
            </div>
            <div className="text-xs text-gray-500">{record.phone}</div>
          </div>
        </div>
      ),
      sorter: true
    },
    {
      title: 'Mã NV',
      width: 110,
      align: 'center',
      dataIndex: 'id',
      render: (value) => (
        <Tag color="blue" className="!font-mono !text-xs">
          {value}
        </Tag>
      )
    },
    {
      title: 'Chức vụ',
      minWidth: 150,
      dataIndex: 'role',
      render: (_, record) => {
        const roleName = record.role?.role_name;
        return roleName ? (
          <Tag color="geekblue">{roleName}</Tag>
        ) : (
          <span className="text-gray-400 italic">Chưa có</span>
        );
      },
      key: 'role'
    },
    {
      title: 'Công ty',
      minWidth: 120,
      dataIndex: ['company'],
      key: 'company',
      render: (_, record) => {
        const company = record.company?.toUpperCase();
        if (company == 'VVP') {
          return <Tag color="purple">VINH VINH PHÁT</Tag>;
        } else if (company == 'A7A') {
          return <Tag color="cyan">A7A</Tag>;
        } else {
          return company ? (
            <Tag>{company}</Tag>
          ) : (
            <span className="text-gray-300">—</span>
          );
        }
      }
    },
    {
      title: 'Danh mục lịch LV',
      minWidth: 180,
      dataIndex: 'calendar_category',
      render: (_, record) => {
        const catName = record.calendar_category?.name;
        return catName ? (
          <Tag color="green">{catName}</Tag>
        ) : (
          <span className="text-gray-400 italic">Chưa có</span>
        );
      }
    },
    {
      title: 'Hành động',
      width: 160,
      align: 'center',
      render: (_value, _record) => {
        return (
          <ActionGroup>
            <Link to={`/admin/employees/edit/$id`} params={{ id: _record.id }}>
              <EditButton />
            </Link>
            <ConfirmButton
              id={_record.id}
              service={employeeService}
              content={
                <p>
                  Bạn có chắc chắn muốn xóa nhân viên{' '}
                  <strong>
                    {_record.name} - {_record.id}
                  </strong>{' '}
                  không?
                </p>
              }
            />
          </ActionGroup>
        );
      }
    }
  ];

  const tableProps: TableProps<EmployeeType> = {
    ...(customTableProps as unknown as TableProps<EmployeeType>),
    rowKey: (record) => ['employee', record.id, record.id].join('-'),
    columns: columns,
    dataSource: employees,
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      current: params.page,
      pageSize: params.limit,
      total: pagination.total,
      onShowSizeChange: (_current, size) => {
        setParams((prev) => ({
          ...prev,
          limit: size
        }));
      },
      onChange: (page) => {
        setParams((prev) => ({
          ...prev,
          page: page
        }));
      }
    },
    onChange: handleChange
  };

  return (
    <ComponentCard title="Quản lý nhân viên">
      <div className="space-y-5">
        {/* ── Action Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <RefreshButton refresh={refetch} isLoading={isFetching} />
          <Link to="/admin/employees/add">
            <AppButton tone="success">
              <LuUserRoundPlus className="text-sm" />
              Thêm nhân viên
            </AppButton>
          </Link>
          <Link to="/admin/employees/trash">
            <AppButton tone="warning">
              <BiTrash className="text-sm" />
              Thùng rác
            </AppButton>
          </Link>
          <AppButton tone="neutral" onClick={handleAttendanceClick}>
            <FaFingerprint className="text-sm" />
            Thêm chấm công
          </AppButton>
          {/* Employee count badge */}
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <span className="text-xs text-gray-500">
              👥 Tổng:{' '}
              <strong className="text-blue-600">{pagination.total || 0}</strong>{' '}
              nhân viên
            </span>
          </div>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaSearch className="mr-1 inline-block text-gray-400" />
                Tìm kiếm nhân viên
              </label>
              <AppSearchInput
                placeholder="Mã hoặc tên nhân viên..."
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (/^\d+$/.test(inputValue)) {
                    handleSearch(inputValue, 'code');
                  } else {
                    handleSearch(inputValue, 'name');
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        {isMobile ? (
          <Spin spinning={isLoading}>
            {employees.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-12 dark:border-gray-700 dark:bg-gray-800">
                <FaUser className="mb-3 text-3xl text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400">
                  Không có dữ liệu nhân viên
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {employees.map((record, index) => (
                    <div
                      key={record.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    >
                      {/* Card top: index + ID badge */}
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {index +
                            1 +
                            (params.limit ?? 10) * ((params.page ?? 1) - 1)}
                        </span>
                        <Tag color="blue" className="!m-0 !font-mono !text-xs">
                          {record.id}
                        </Tag>
                      </div>

                      {/* Employee info */}
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={`${STORAGE_URL}/${record.card_photo}`}
                          alt="avatar"
                          icon={<FaUser />}
                          shape="square"
                          size={44}
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
                            {record.name}
                          </div>
                          {record.phone && (
                            <div className="mt-0.5 text-xs text-gray-400">
                              {record.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {record.role?.role_name && (
                          <Tag color="geekblue" className="!m-0 !text-xs">
                            {record.role.role_name}
                          </Tag>
                        )}
                        {record.company && (
                          <Tag
                            color={
                              record.company.toUpperCase() === 'VVP'
                                ? 'purple'
                                : record.company.toUpperCase() === 'A7A'
                                  ? 'cyan'
                                  : undefined
                            }
                            className="!m-0 !text-xs"
                          >
                            {record.company.toUpperCase() === 'VVP'
                              ? 'VINH VINH PHÁT'
                              : record.company.toUpperCase()}
                          </Tag>
                        )}
                        {record.calendar_category?.name && (
                          <Tag color="green" className="!m-0 !text-xs">
                            {record.calendar_category.name}
                          </Tag>
                        )}
                      </div>

                      {/* Actions */}
                      <ActionGroup className="mt-3 !justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
                        <Link
                          to={`/admin/employees/edit/$id`}
                          params={{ id: record.id }}
                        >
                          <EditButton size="small" />
                        </Link>
                        <ConfirmButton
                          id={record.id}
                          service={employeeService}
                          size="small"
                          content={
                            <p>
                              Bạn có chắc chắn muốn xóa nhân viên{' '}
                              <strong>
                                {record.name} - {record.id}
                              </strong>{' '}
                              không?
                            </p>
                          }
                        />
                      </ActionGroup>
                    </div>
                  ))}
                </div>
                {(pagination.total || 0) > (params.limit ?? 10) && (
                  <div className="mt-4 flex justify-center">
                    <Pagination
                      {...customPaginationProps}
                      current={params.page}
                      pageSize={params.limit}
                      total={pagination.total}
                      onChange={(page, size) => {
                        setParams((prev) => ({ ...prev, page, limit: size }));
                      }}
                      size="small"
                    />
                  </div>
                )}
              </>
            )}
          </Spin>
        ) : (
          <Table<EmployeeType> {...tableProps} />
        )}
      </div>
    </ComponentCard>
  );
}
