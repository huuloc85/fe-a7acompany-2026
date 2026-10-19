import AppSearchInput from '@/components/common/AppSearchInput';
import { isCurrentAttendanceDate } from '@/utils/attendanceWindow';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Button,
  DatePicker,
  Select,
  Switch,
  Table,
  TableColumnsType,
  TableProps,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { useState } from 'react';
import type { Dayjs } from 'dayjs';

import { QueryParams } from '@/types/queryParams';
import { EmployeeListModal } from '@components/attendances/EmployeeListModal';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { customTableProps } from '@components/custom/TableProps.custom';
import { fetchWorkScheduleCategories } from '@services/WorkScheduleCategoryService';

import { IconHistory } from '@components/icons';
import { fetchAttendancesCalculated } from '@services/AttendanceService';
import { ExportModal } from './ExportModal';

interface TableColumns {
  employee_id: string;
  name: string;
  date: string;
  time_in: string;
  time_out: string;
  shift: number;
  hnhc: 'N' | 'LN' | 'D' | 'TC' | 'X' | 'NN' | null;
  day_type: string;
  is_schedule_change: boolean;
  total_hours: number | null;
  overtime_hours: number | null;
  administrative_hours: number | null;
}

export default function Records() {
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 50,
    sort: 'date',
    'filter[date_between]': `${dayjs().startOf('month').format('YYYY-MM-DD')},${dayjs().endOf('month').format('YYYY-MM-DD')}`
  });
  const [forgottenDays, setForgottenDays] = useState<boolean>(false);
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterType, setFilterType] = useState<'month' | 'range'>('month');

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['workScheduleCategories', { limit: 0 }],
    queryFn: () => fetchWorkScheduleCategories({ limit: 0 })
  });

  const categoryOptions = categories?.workScheduleCategories.map((item) => ({
    label: item.name,
    value: item.id
  }));

  const {
    data: response,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['attendances', params],
    queryFn: async () => {
      const response = await fetchAttendancesCalculated(params);
      const { data, current_page, total, per_page } = response;

      // Data is already calculated by the API, no need to calculate again
      const attendances = data as unknown as TableColumns[];

      return {
        attendances,
        pagination: {
          total: total,
          pageSize: per_page,
          current: current_page
        }
      };
    }
  });

  const { attendances, pagination } = response || {
    attendances: [],
    pagination: { total: 0, pageSize: params.limit, current: params.page }
  };

  const handleSearch = debounce((value: string, type: 'name' | 'code') => {
    setParams((prev) => ({
      ...prev,
      page: 1, // Reset về page 1 khi search
      'filter[employee_id]': undefined,
      'filter[employees.name]': undefined
    }));
    if (!value) {
      return;
    }
    if (type == 'name') {
      setParams((prev) => ({
        ...prev,
        page: 1, // Reset về page 1 khi search
        'filter[employees.name]': value ? value : undefined
      }));
    } else if (type == 'code') {
      setParams((prev) => ({
        ...prev,
        page: 1, // Reset về page 1 khi search
        'filter[employee_id]': value ? value : undefined
      }));
    }
  }, 300);

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

  const columns: TableColumnsType<TableColumns> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      render: (_value, _record, index) =>
        index + 1 + (params.limit ?? 50) * ((params.page ?? 1) - 1)
    },
    {
      title: 'Mã nhân viên',
      dataIndex: 'employee_id',
      align: 'center'
    },
    {
      title: 'Tên nhân viên',
      key: 'name',
      render: (_value, record) => {
        return record.name || 'Chưa có thông tin';
      }
    },
    {
      title: 'Ngày chấm công',
      dataIndex: 'date',
      key: 'date',
      align: 'center',
      sorter: true,
      render: (value) => {
        if (!value) return null;
        return new Date(value).toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    },
    {
      title: 'Ngày trong tuần',
      dataIndex: 'date',
      key: 'date',
      align: 'center',
      render: (value) => {
        if (!value) return null;
        return new Date(value).toLocaleString('vi-VN', {
          weekday: 'long'
        });
      }
    },
    {
      title: 'Giờ vào',
      dataIndex: 'time_in',
      key: 'time_in',
      align: 'center',
      render: (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleString('vi-VN', {
          // year: 'numeric',
          // month: '2-digit',
          // day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    },
    {
      title: 'Giờ ra',
      dataIndex: 'time_out',
      key: 'time_out',
      align: 'center',
      render: (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleString('vi-VN', {
          // year: 'numeric',
          // month: '2-digit',
          // day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    },
    {
      title: 'Loại ngày',
      dataIndex: 'day_type',
      key: 'day_type',
      align: 'center',
      render: (value, record) => {
        if (record.is_schedule_change) {
          return <Tag color="yellow">{value}</Tag>;
        }
        if (value === 'Ca ngày') return <Tag color="blue">Ca 1</Tag>;
        if (value === 'Ca đêm') return <Tag color="purple">Ca 2</Tag>;
        if (value === 'Nghỉ nửa ngày')
          return <Tag color="red">Nghỉ nửa ngày</Tag>;
        return <Tag color="green">Nghỉ</Tag>;
      }
    },
    {
      title: 'Tổng giờ làm việc(h)',
      dataIndex: 'total_hours',
      key: 'total_hours',
      align: 'center',
      render: (value, record) => {
        if (!record.shift) return '-';
        return value ? (
          value
        ) : isCurrentAttendanceDate(record.date) ? (
          '—'
        ) : (
          <Tag color="red">Chấm công chưa đủ</Tag>
        );
      }
    },
    {
      title: 'Giờ hành chính(h)',
      dataIndex: 'administrative_hours',
      key: 'administrative_hours',
      align: 'center',
      render: (value, record) => {
        if (!record.shift) return '-';
        return value ? (
          value
        ) : isCurrentAttendanceDate(record.date) ? (
          '—'
        ) : (
          <Tag color="red">Chấm công chưa đủ</Tag>
        );
      }
    },
    {
      title: 'Giờ tăng ca(h)',
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      align: 'center',
      render: (value) => {
        return value ? value : '-';
      }
    }
  ];

  const forgetAttendance = attendances.filter((item) => {
    if (isCurrentAttendanceDate(item.date)) return false;
    // Only show days that should have attendance but missing time_in or time_out
    // Case 1: Normal work day (shift > 0) with incomplete attendance
    if (
      item.shift > 0 &&
      (!item.time_in ||
        !item.time_out ||
        item.time_in === '' ||
        item.time_out === '')
    ) {
      return true;
    }
    // Case 2: Schedule change day (is_schedule_change = true) with incomplete attendance
    if (
      item.is_schedule_change &&
      item.shift > 0 &&
      (!item.time_in ||
        !item.time_out ||
        item.time_in === '' ||
        item.time_out === '')
    ) {
      return true;
    }
    return false;
  });

  const tableProps: TableProps<TableColumns> = {
    // TODO: Fix type casting issue
    ...(customTableProps as unknown as TableProps<TableColumns>),
    rowKey: (record) =>
      ['attendances', 'sheet', record.employee_id, record.date].join('-'),
    columns: columns,
    dataSource: forgottenDays ? forgetAttendance : attendances,
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      current: pagination.current,
      pageSize: forgottenDays ? forgetAttendance.length : pagination.pageSize,
      total: forgottenDays ? forgetAttendance.length : pagination.total,
      pageSizeOptions: forgottenDays
        ? [forgetAttendance.length.toString()]
        : ['10', '20', '50', '100', '200', '500'],
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

  const getTitle = () => {
    if (filterType === 'range' && dateRange) {
      return `Bảng tính công từ ${dateRange[0].format('DD/MM/YYYY')} đến ${dateRange[1].format('DD/MM/YYYY')}`;
    }
    return `Bảng tính công tháng ${month.format('MM-YYYY')}`;
  };

  return (
    <ComponentCard title={getTitle()}>
      <div className="flex flex-wrap gap-4">
        <RefreshButton
          refresh={() => {
            refetch();
            refetchCategories();
          }}
          isLoading={isFetching}
        />
        <Link to="/admin/attendances">
          <Button color="green" variant="solid" icon={<IconHistory />}>
            Lịch sử chấm công
          </Button>
        </Link>
        <EmployeeListModal />
        <ExportModal />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <DatePicker
          picker="month"
          format="MM/YYYY"
          placeholder="Chọn tháng"
          inputReadOnly={false}
          value={filterType === 'month' ? month : null}
          onChange={(value) => {
            const selectedMonth = value ? dayjs(value) : dayjs();
            setMonth(selectedMonth);
            setDateRange(null); // Reset date range khi chọn month
            setFilterType('month');
            setParams((prev) => ({
              ...prev,
              page: 1, // Reset về page 1 khi thay đổi filter
              'filter[date]': undefined, // Xóa filter date cũ
              'filter[date_between]': `${selectedMonth.startOf('month').format('YYYY-MM-DD')},${selectedMonth.endOf('month').format('YYYY-MM-DD')}`
            }));
          }}
        />
        <DatePicker.RangePicker
          format="MM/YYYY"
          placeholder={['Chọn ngày bắt đầu', 'Chọn ngày kết thúc']}
          inputReadOnly={false}
          value={filterType === 'range' ? dateRange : null}
          onChange={(value) => {
            if (value && value[0] && value[1]) {
              // Nếu có chọn date range thì set filter type là range
              const startDate = dayjs(value[0]);
              const endDate = dayjs(value[1]);
              setDateRange([startDate, endDate]);
              setFilterType('range');
              setParams((prev) => ({
                ...prev,
                page: 1, // Reset về page 1 khi thay đổi filter
                'filter[date_between]': `${startDate.format('YYYY-MM-DD')},${endDate.format('YYYY-MM-DD')}`
              }));
            } else {
              // Nếu clear date range thì reset về month filter
              setDateRange(null);
              setFilterType('month');
              setParams((prev) => ({
                ...prev,
                page: 1, // Reset về page 1 khi thay đổi filter
                'filter[date_between]': `${month.startOf('month').format('YYYY-MM-DD')},${month.endOf('month').format('YYYY-MM-DD')}`
              }));
            }
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
              page: 1, // Reset về page 1 khi thay đổi filter
              'filter[employees.calendar_category_id]': value
            }));
          }}
          onClear={() => {
            setParams((prev) => ({
              ...prev,
              page: 1, // Reset về page 1 khi xóa filter
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
      <div>
        <label htmlFor="forgotten-days-switch">
          Hiển thị những ngày quên chấm công
        </label>
        <div>
          <Switch
            id="forgotten-days-switch"
            onChange={(checked) => {
              setForgottenDays(checked);
              if (checked) {
                setParams((prev) => ({
                  ...prev,
                  limit: 0
                }));
              } else {
                setParams((prev) => ({
                  ...prev,
                  limit: 50
                }));
              }
            }}
          />
        </div>
      </div>
      <Table<TableColumns> {...tableProps} />
    </ComponentCard>
  );
}
