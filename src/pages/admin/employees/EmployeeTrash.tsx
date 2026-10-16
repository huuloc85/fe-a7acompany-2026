import AppSearchInput from '@/components/common/AppSearchInput';
import { Avatar, Table, TableColumnsType, TableProps } from 'antd';
import { useState } from 'react';

import { useCrudList } from '@/hooks/useCrudList';
import { EmployeeType } from '@/types/employeeType';
import { QueryParams } from '@/types/queryParams';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { employeeService } from '@services/EmployeeService';

import { STORAGE_URL } from '@/configs/environment.config';
import RefreshButton from '@components/common/RefreshButton';
import { customTableProps } from '@components/custom/TableProps.custom';
import { debounce } from 'lodash';
import { FaUser } from 'react-icons/fa';

export default function EmployeeTrash() {
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 10,
    include: ['role', 'calendarCategory']
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

  const {
    data: employees,
    pagination,
    queryResult: { isLoading, isFetching, refetch }
  } = useCrudList({
    service: employeeService,
    queryKey: 'employees',
    initialFilters: params,
    isTrash: true
  });

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

  const columns: TableColumnsType<EmployeeType> = [
    {
      title: 'STT',
      rowScope: 'row',
      minWidth: 50,
      align: 'center',
      render: (_value, _record, index) =>
        index + 1 + (params.limit ?? 10) * ((params.page ?? 1) - 1)
    },
    {
      title: 'Tên/Điên Thoại',
      minWidth: 200,
      dataIndex: 'name',
      render: (value, record) => (
        <div className="flex items-center gap-2">
          <Avatar
            src={`${STORAGE_URL}/${record.photo}`}
            alt="avatar"
            icon={<FaUser />}
            shape="square"
            size={'large'}
          />
          <div className="text-nowrap">
            <div className="font-semibold">{value}</div>
            <div className="text-xs">{record.phone}</div>
          </div>
        </div>
      ),
      sorter: true
    },
    {
      title: 'Chức vụ',
      minWidth: 150,
      dataIndex: 'role',
      render: (_, record) => record.role?.role_name,
      key: 'role'
    },
    {
      title: 'Công ty ',
      minWidth: 120,
      dataIndex: 'company'
    },
    {
      title: 'Mã nhân viên',
      minWidth: 110,
      align: 'center',
      dataIndex: 'id'
    },
    {
      title: 'Danh mục lịch làm việc',
      minWidth: 200,
      dataIndex: 'calendar_category',
      render: (_, record) => record.calendar_category?.name
    },
    {
      title: 'Hành động',
      minWidth: 100,
      align: 'center',
      render: (_value, _record) => {
        return (
          <div className="flex gap-2">
            <ConfirmButton
              isRestore={true}
              id={_record.id}
              service={employeeService}
              content={
                <p>
                  Bạn có chắc chắn muốn khôi phục nhân viên{' '}
                  <strong>
                    {_record.name} - {_record.id}
                  </strong>{' '}
                  không?
                </p>
              }
            />
            <ConfirmButton
              isForceDelete={true}
              id={_record.id}
              service={employeeService}
              content={
                <p>
                  Xoá vĩnh viễn nhân viên{' '}
                  <strong>
                    {_record.name} - {_record.id}
                  </strong>
                  ? Hành động này không thể hoàn tác! Bridge cũng sẽ xóa hồ sơ
                  và vân tay trên máy chấm công đối với nhân viên thuộc nhóm
                  đồng bộ.
                </p>
              }
            />
          </div>
        );
      }
    }
  ];

  const tableProps: TableProps<EmployeeType> = {
    ...(customTableProps as unknown as TableProps<EmployeeType>),
    rowKey: (record) => ['employee', record.id].join('-'),
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
    <div>
      <BackButton />
      <ComponentCard title="Danh sách nhân viên đã nghỉ việc">
        <RefreshButton refresh={refetch} isLoading={isFetching} />
        <div>
          <AppSearchInput
            className="max-w-3xs"
            placeholder="Tìm kiếm nhân viên"
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
        <Table<EmployeeType> {...tableProps} />
      </ComponentCard>
    </div>
  );
}
