import AppSearchInput from '@/components/common/AppSearchInput';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Button,
  DatePicker,
  Select,
  Table,
  TableColumnsType,
  TableProps
} from 'antd';
import { debounce } from 'lodash';
import { useState } from 'react';
import dayjs from 'dayjs';

import {
  attendanceUpdateFields,
  useAttendanceCreateFields
} from '@/configs/attendanceForm.config';
import { AttendanceType } from '@/types/attendanceType';
import { QueryParams } from '@/types/queryParams';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { customTableProps } from '@components/custom/TableProps.custom';
import { IconTable } from '@components/icons';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { CreateModal } from '@components/ui/CRUD/CreateModal';
import { UpdateModal } from '@components/ui/CRUD/UpdateModal';
import { useCrudList } from '@hooks/useCrudList';
import { attendanceSchema } from '@schemas/attendanceSchema.schema';
import { attendanceService } from '@services/AttendanceService';
import { fetchWorkScheduleCategories } from '@services/WorkScheduleCategoryService';

type TableColumns = AttendanceType;

export const History = () => {
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 50,
    include: ['employees']
  });

  const {
    data: attendances,
    pagination,
    queryResult: { isLoading, isFetching, refetch }
  } = useCrudList({
    service: attendanceService,
    queryKey: 'attendances',
    initialFilters: params
  });

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['workScheduleCategories', { limit: 0 }],
    queryFn: () => fetchWorkScheduleCategories({ limit: 0 })
  });

  const handleSearch = debounce((value: string, type: 'name' | 'code') => {
    setParams((prev) => ({
      ...prev,
      'filter[employees.id]': undefined,
      'filter[employees.name]': undefined
    }));
    if (!value) {
      return;
    }
    if (type == 'name') {
      setParams((prev) => ({
        ...prev,
        'filter[employees.name]': value ? value : undefined
      }));
    } else if (type == 'code') {
      setParams((prev) => ({
        ...prev,
        'filter[employees.id]': value ? value : undefined
      }));
    }
  }, 500);

  const handleChange: TableProps<TableColumns>['onChange'] = (
    pagination,
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
      page: pagination.current,
      limit: pagination.pageSize,
      sort: sortValue,
      ...newFilters
    }));
  };

  const categoryOptions = categories?.workScheduleCategories.map((item) => ({
    label: item.name,
    value: item.id
  }));

  const columns: TableColumnsType<TableColumns> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      render: (_value, _record, index) =>
        index + 1 + (params.limit ?? 10) * ((params.page ?? 1) - 1)
    },
    {
      title: 'Mã nhân viên',
      key: 'employee_code',
      dataIndex: 'employee_code',
      align: 'center'
    },
    {
      title: 'Tên nhân viên',
      key: 'employee_name',
      dataIndex: ['employees', 'name'],
      render: (value) => {
        return value || 'Chưa có thông tin';
      }
    },
    {
      title: 'Thời gian chấm công',
      dataIndex: 'datetime',
      key: 'datetime',
      align: 'center',
      sorter: true,
      render: (value) => {
        if (!value) return null;
        return new Date(value).toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    },
    {
      title: 'Danh mục làm việc',
      key: 'workScheduleCategory',
      render: (_value, record) => {
        return (
          categories?.workScheduleCategories.find(
            (item) => item.id === record.employees?.calendar_category_id
          )?.name || 'Chưa có thông tin'
        );
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      render: (_value, record) => (
        <div className="flex items-center justify-center gap-2">
          <UpdateModal
            id={record.id}
            service={attendanceService}
            schema={attendanceSchema}
            fields={attendanceUpdateFields}
          />
          <ConfirmButton
            id={record.id}
            service={attendanceService}
            content={
              <p>
                Bạn có chắc chắn muốn xóa dữ liệu chấm công của nhân viên{' '}
                <strong>{record.employee_code}</strong> vào ngày{' '}
                <strong>
                  {new Date(record.datetime).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </strong>{' '}
                không?
              </p>
            }
          />
        </div>
      )
    }
  ];

  const tableProps: TableProps<TableColumns> = {
    ...(customTableProps as unknown as TableProps<TableColumns>),
    rowKey: (record) =>
      ['attendances', record.id, record.employee_code].join('-'),
    columns: columns,
    dataSource: attendances,
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
    <ComponentCard title="Lịch sử chấm công">
      <div className="flex flex-wrap gap-4">
        <RefreshButton
          refresh={() => {
            refetch();
            refetchCategories();
          }}
          isLoading={isFetching}
        />
        <CreateModal
          title="Thêm dữ liệu chấm công"
          service={attendanceService}
          schema={attendanceSchema}
          fields={useAttendanceCreateFields()}
        />
        <Link to="/admin/attendances">
          <Button color="blue" variant="solid" icon={<IconTable />}>
            Bảng tính công
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <DatePicker
          picker="month"
          format="MM/YYYY"
          placeholder="Chọn tháng"
          inputReadOnly={false}
          onChange={(value) => {
            setParams((prev) => ({
              ...prev,
              'filter[date]': value
                ? `${dayjs(value).format('YYYY-MM')}`
                : undefined
            }));
          }}
        />
        <DatePicker.RangePicker
          format="MM/YYYY"
          placeholder={['Chọn ngày bắt đầu', 'Chọn ngày kết thúc']}
          inputReadOnly={false}
          onChange={(value) => {
            setParams((prev) => ({
              ...prev,
              'filter[date_between]':
                value && value[0] && value[1]
                  ? `${dayjs(value[0]).format('YYYY-MM-DD')},${dayjs(value[1]).format('YYYY-MM-DD')}`
                  : undefined
            }));
          }}
        />
        <Select
          options={categoryOptions}
          placeholder="Chọn danh mục"
          popupMatchSelectWidth={false}
          allowClear
          onSelect={(value) => {
            setParams((prev) => ({
              ...prev,
              'filter[employees.calendar_category_id]': value
            }));
          }}
          onClear={() => {
            setParams((prev) => ({
              ...prev,
              'filter[employees.calendar_category_id]': undefined
            }));
          }}
        />
        <AppSearchInput
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
      <Table<TableColumns> {...tableProps} />
    </ComponentCard>
  );
};
