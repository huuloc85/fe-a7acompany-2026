import AppSearchInput from '@/components/common/AppSearchInput';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  DatePicker,
  Pagination,
  Select,
  Spin,
  Switch,
  Table,
  TableColumnsType,
  TableProps,
  Tabs,
  Tag,
  Tooltip
} from 'antd';
import { debounce } from 'lodash';
import { useState } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import {
  FaHistory,
  FaCalculator,
  FaClock,
  FaCalendarAlt,
  FaUsers
} from 'react-icons/fa';

import {
  attendanceUpdateFields,
  useAttendanceCreateFields
} from '@/configs/attendanceForm.config';
import { AttendanceType } from '@/types/attendanceType';
import { QueryParams } from '@/types/queryParams';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { CreateModal } from '@components/ui/CRUD/CreateModal';
import { UpdateModal } from '@components/ui/CRUD/UpdateModal';
import { useCrudList } from '@hooks/useCrudList';
import { attendanceSchema } from '@schemas/attendanceSchema.schema';
import { attendanceService } from '@services/AttendanceService';
import { fetchWorkScheduleCategories } from '@services/WorkScheduleCategoryService';
import { EmployeeListModal } from '@components/attendances/EmployeeListModal';
import { fetchAttendancesCalculated } from '@services/AttendanceService';
import { ExportModal } from './ExportModal';
import { useIsMobile } from '@hooks/useIsMobile';
import AttendanceImportButton from '@components/attendances/AttendanceImportButton';
import AttendanceArchiveButton from '@components/attendances/AttendanceArchiveButton';
import { useAttendanceMonth } from '@/hooks/useAttendanceMonth';
import { OvertimeApprovalStatus } from '@/components/attendances/OvertimeApprovalStatus';
import { OvertimeApprovalActions } from '@/components/attendances/OvertimeApprovalActions';
import type { OvertimeApproval } from '@/utils/overtimeApproval';
import {
  getAttendanceWindow,
  isOutsideAttendanceWindow
} from '@/utils/attendanceWindow';

// ─── Type defs ────────────────────────────────────────────────────────────────
type HistoryTableColumns = AttendanceType;

interface RecordTableColumns {
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
  overtime_approval?: OvertimeApproval;
}

const isAdditionalShift = (hnhc: RecordTableColumns['hnhc']) =>
  hnhc === 'TC' || hnhc === 'LN';

const getDisplayAdministrativeHours = (record: RecordTableColumns) =>
  isAdditionalShift(record.hnhc) ? 0 : record.administrative_hours || 0;

const getDisplayOvertimeHours = (record: RecordTableColumns) =>
  isAdditionalShift(record.hnhc)
    ? record.total_hours || 0
    : record.overtime_hours || 0;

const getDisplayDayType = (record: RecordTableColumns) => {
  if (record.hnhc === 'TC') return 'Tăng cường ca đêm';
  if (record.hnhc === 'LN') return 'Tăng cường ca ngày';
  return record.day_type;
};

const getDayTypeTag = (record: RecordTableColumns) => {
  const displayDayType = getDisplayDayType(record);

  if (record.hnhc === 'TC') {
    return <Tag color="purple">Tăng cường ca đêm</Tag>;
  }
  if (record.hnhc === 'LN') {
    return <Tag color="gold">Tăng cường ca ngày</Tag>;
  }
  if (record.is_schedule_change) {
    return <Tag color="yellow">{displayDayType}</Tag>;
  }
  if (displayDayType === 'Ca ngày') return <Tag color="blue">Ca 1</Tag>;
  if (displayDayType === 'Ca đêm') return <Tag color="purple">Ca 2</Tag>;
  if (displayDayType === 'Nghỉ nửa ngày') {
    return <Tag color="red">Nghỉ nửa ngày</Tag>;
  }
  return <Tag color="green">Nghỉ</Tag>;
};

// ─── Shared Filter Bar ───────────────────────────────────────────────────────
interface FilterBarProps {
  onMonthChange: (value: Dayjs | null) => void;
  onRangeChange: (value: [Dayjs, Dayjs] | null) => void;
  onCategoryChange: (value: number | undefined) => void;
  onSearch: (value: string, type: 'name' | 'code') => void;
  categoryOptions?: { label: string; value: number }[];
  monthValue?: Dayjs | null;
  rangeValue?: [Dayjs, Dayjs] | null;
}

function FilterBar({
  onMonthChange,
  onRangeChange,
  onCategoryChange,
  onSearch,
  categoryOptions,
  monthValue,
  rangeValue
}: FilterBarProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          <FaCalendarAlt className="mr-1 inline-block text-blue-500" />
          Tháng
        </label>
        <DatePicker
          picker="month"
          disabledDate={isOutsideAttendanceWindow}
          format="DD/MM/YYYY"
          placeholder="Chọn tháng"
          inputReadOnly={false}
          value={monthValue}
          onChange={(value) => onMonthChange(value ? dayjs(value) : null)}
          className="!rounded-lg"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          <FaClock className="mr-1 inline-block text-purple-500" />
          Khoảng thời gian
        </label>
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          disabledDate={isOutsideAttendanceWindow}
          placeholder={['Từ ngày', 'Đến ngày']}
          inputReadOnly={false}
          value={rangeValue}
          onChange={(value) => {
            if (value && value[0] && value[1]) {
              onRangeChange([dayjs(value[0]), dayjs(value[1])]);
            } else {
              onRangeChange(null);
            }
          }}
          className="!rounded-lg"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          <FaUsers className="mr-1 inline-block text-emerald-500" />
          Danh mục
        </label>
        <Select
          options={categoryOptions}
          placeholder="Chọn danh mục"
          popupMatchSelectWidth={false}
          allowClear
          onSelect={(value) => onCategoryChange(value)}
          onClear={() => onCategoryChange(undefined)}
          className="!rounded-lg"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          🔍 Tìm kiếm
        </label>
        <AppSearchInput
          placeholder="Mã hoặc tên nhân viên..."
          onChange={(e) => {
            const inputValue = e.target.value;
            if (/^\d+$/.test(inputValue)) {
              onSearch(inputValue, 'code');
            } else {
              onSearch(inputValue, 'name');
            }
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 1: Lịch sử chấm công (History)
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab() {
  const isMobile = useIsMobile();
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 50,
    include: ['employees'],
    'filter[date_between]': `${getAttendanceWindow().month.format('YYYY-MM-DD')},${getAttendanceWindow().end.format('YYYY-MM-DD')}`
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
    queryFn: () => fetchWorkScheduleCategories({ limit: 0 }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000
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

  const handleChange: TableProps<HistoryTableColumns>['onChange'] = (
    pagination,
    filters,
    sorter
  ) => {
    let sortValue = undefined;
    if (!Array.isArray(sorter) && sorter.order && sorter.field) {
      sortValue = `${sorter.order === 'ascend' ? '' : '-'}${sorter.field}`;
    }

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
    value: Number(item.id)
  }));

  const columns: TableColumnsType<HistoryTableColumns> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      width: 60,
      render: (_value, _record, index) => (
        <span className="font-mono text-xs text-gray-500">
          {index + 1 + (params.limit ?? 10) * ((params.page ?? 1) - 1)}
        </span>
      )
    },
    {
      title: 'Mã nhân viên',
      key: 'employee_code',
      dataIndex: 'employee_code',
      align: 'center',
      render: (value) => (
        <Tag color="blue" className="!font-mono !text-xs">
          {value}
        </Tag>
      )
    },
    {
      title: 'Tên nhân viên',
      key: 'employee_name',
      dataIndex: ['employees', 'name'],
      render: (value) => {
        return (
          <span className="font-medium text-gray-800 dark:text-white/90">
            {value || (
              <span className="text-gray-400 italic">Chưa có thông tin</span>
            )}
          </span>
        );
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
        return (
          <span className="text-sm">
            {new Date(value).toLocaleString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        );
      }
    },
    {
      title: 'Danh mục làm việc',
      key: 'workScheduleCategory',
      render: (_value, record) => {
        const catName = categories?.workScheduleCategories.find(
          (item) => item.id === record.employees?.calendar_category_id
        )?.name;
        return catName ? (
          <Tag color="geekblue">{catName}</Tag>
        ) : (
          <span className="text-xs text-gray-400 italic">
            Chưa có thông tin
          </span>
        );
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      width: 100,
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

  const tableProps: TableProps<HistoryTableColumns> = {
    ...(customTableProps as unknown as TableProps<HistoryTableColumns>),
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
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
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
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
        <FilterBar
          onMonthChange={(value) => {
            const selectedMonth = value || getAttendanceWindow().month;
            setParams((prev) => ({
              ...prev,
              page: 1,
              'filter[date]': undefined,
              'filter[date_between]': `${selectedMonth.startOf('month').format('YYYY-MM-DD')},${selectedMonth.endOf('month').format('YYYY-MM-DD')}`
            }));
          }}
          onRangeChange={(value) => {
            setParams((prev) => ({
              ...prev,
              page: 1,
              'filter[date]': undefined,
              'filter[date_between]': value
                ? `${value[0].format('YYYY-MM-DD')},${value[1].format('YYYY-MM-DD')}`
                : undefined
            }));
          }}
          onCategoryChange={(value) => {
            setParams((prev) => ({
              ...prev,
              'filter[employees.calendar_category_id]': value
            }));
          }}
          onSearch={handleSearch}
          categoryOptions={categoryOptions}
        />
      </div>

      {/* Table */}
      {isMobile ? (
        <Spin spinning={isLoading}>
          <div className="flex flex-col gap-3">
            {attendances.map((record, index) => {
              const catName = categories?.workScheduleCategories.find(
                (item) => item.id === record.employees?.calendar_category_id
              )?.name;
              return (
                <div
                  key={['attendances', record.id, record.employee_code].join(
                    '-'
                  )}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                      {index +
                        1 +
                        (params.limit ?? 10) * ((params.page ?? 1) - 1)}
                    </span>
                    <span className="line-clamp-1 text-[15px] font-semibold text-gray-800 dark:text-white/90">
                      {record.employees?.name || (
                        <span className="text-gray-400 italic">
                          Chưa có thông tin
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="space-y-1 pl-8 text-[13px] text-gray-500">
                    <div className="flex items-center gap-2">
                      <Tag color="blue" className="!m-0 !font-mono !text-xs">
                        {record.employee_code}
                      </Tag>
                      {catName && (
                        <Tag color="geekblue" className="!m-0">
                          {catName}
                        </Tag>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">
                        Thời gian:
                      </span>{' '}
                      {record.datetime
                        ? new Date(record.datetime).toLocaleString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })
                        : '—'}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <UpdateModal
                      id={record.id}
                      service={attendanceService}
                      schema={attendanceSchema}
                      fields={attendanceUpdateFields}
                      size="small"
                    />
                    <ConfirmButton
                      id={record.id}
                      service={attendanceService}
                      size="small"
                      content={
                        <p>
                          Bạn có chắc chắn muốn xóa dữ liệu chấm công của nhân
                          viên <strong>{record.employee_code}</strong> không?
                        </p>
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Pagination
              {...customPaginationProps}
              size="small"
              current={params.page}
              pageSize={params.limit}
              total={pagination.total}
              onChange={(page, size) => {
                setParams((prev) => ({ ...prev, page, limit: size }));
              }}
            />
          </div>
        </Spin>
      ) : (
        <Table<HistoryTableColumns> {...tableProps} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 2: Bảng tính công (Records)
// ─────────────────────────────────────────────────────────────────────────────

function RecordsTab() {
  const isMobile = useIsMobile();
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 50,
    sort: 'date',
    'filter[date_between]': `${getAttendanceWindow().month.format('YYYY-MM-DD')},${getAttendanceWindow().end.format('YYYY-MM-DD')}`
  });
  const [forgottenDays, setForgottenDays] = useState<boolean>(false);
  const [month, setMonth] = useState<Dayjs>(getAttendanceWindow().month);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterType, setFilterType] = useState<'month' | 'range'>('month');

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['workScheduleCategories', { limit: 0 }],
    queryFn: () => fetchWorkScheduleCategories({ limit: 0 })
  });

  const categoryOptions = categories?.workScheduleCategories.map((item) => ({
    label: item.name,
    value: Number(item.id)
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

      const attendances = data as unknown as RecordTableColumns[];

      return {
        attendances,
        pagination: {
          total: total,
          pageSize: per_page,
          current: current_page
        }
      };
    },
    placeholderData: keepPreviousData
  });

  const { attendances, pagination } = response || {
    attendances: [],
    pagination: { total: 0, pageSize: params.limit, current: params.page }
  };

  const handleSearch = debounce((value: string, type: 'name' | 'code') => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      'filter[employee_id]': undefined,
      'filter[employees.name]': undefined
    }));
    if (!value) {
      return;
    }
    if (type == 'name') {
      setParams((prev) => ({
        ...prev,
        page: 1,
        'filter[employees.name]': value ? value : undefined
      }));
    } else if (type == 'code') {
      setParams((prev) => ({
        ...prev,
        page: 1,
        'filter[employee_id]': value ? value : undefined
      }));
    }
  }, 300);

  const handleChange: TableProps<RecordTableColumns>['onChange'] = (
    pagination,
    filters,
    sorter
  ) => {
    let sortValue = undefined;
    if (!Array.isArray(sorter) && sorter.order && sorter.field) {
      sortValue = `${sorter.order === 'ascend' ? '' : '-'}${sorter.field}`;
    }

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

  const columns: TableColumnsType<RecordTableColumns> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      width: 60,
      render: (_value, _record, index) => (
        <span className="font-mono text-xs text-gray-500">
          {index + 1 + (params.limit ?? 50) * ((params.page ?? 1) - 1)}
        </span>
      )
    },
    {
      title: 'Mã nhân viên',
      dataIndex: 'employee_id',
      align: 'center',
      render: (value) => (
        <Tag color="blue" className="!font-mono !text-xs">
          {value}
        </Tag>
      )
    },
    {
      title: 'Tên nhân viên',
      key: 'name',
      render: (_value, record) => {
        return (
          <span className="font-medium text-gray-800 dark:text-white/90">
            {record.name || (
              <span className="text-gray-400 italic">Chưa có thông tin</span>
            )}
          </span>
        );
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
        return (
          <span className="text-sm">
            {new Date(value).toLocaleString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}
          </span>
        );
      }
    },
    {
      title: 'Ngày trong tuần',
      dataIndex: 'date',
      key: 'date',
      align: 'center',
      render: (value) => {
        if (!value) return null;
        const weekday = new Date(value).toLocaleString('vi-VN', {
          weekday: 'long'
        });
        const isSunday = new Date(value).getDay() === 0;
        return (
          <span className={isSunday ? 'font-medium text-red-500' : ''}>
            {weekday}
          </span>
        );
      }
    },
    {
      title: 'Giờ vào',
      dataIndex: 'time_in',
      key: 'time_in',
      align: 'center',
      render: (value) => {
        if (!value) return <span className="text-gray-300">—</span>;
        return (
          <Tag color="green" className="!text-xs">
            {new Date(value).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </Tag>
        );
      }
    },
    {
      title: 'Giờ ra',
      dataIndex: 'time_out',
      key: 'time_out',
      align: 'center',
      render: (value) => {
        if (!value) return <span className="text-gray-300">—</span>;
        return (
          <Tag color="orange" className="!text-xs">
            {new Date(value).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </Tag>
        );
      }
    },
    {
      title: 'Loại ngày',
      dataIndex: 'day_type',
      key: 'day_type',
      align: 'center',
      render: (_value, record) => getDayTypeTag(record)
    },
    {
      title: (
        <Tooltip title="Tổng giờ làm việc">
          <span>Tổng giờ (h)</span>
        </Tooltip>
      ),
      dataIndex: 'total_hours',
      key: 'total_hours',
      align: 'center',
      render: (value, record) => {
        if (!record.shift) return <span className="text-gray-300">—</span>;
        return value ? (
          <span className="font-semibold text-blue-600">{value}</span>
        ) : (
          <Tag color="red">Chấm công chưa đủ</Tag>
        );
      }
    },
    {
      title: (
        <Tooltip title="Giờ chính, không bao gồm ngày tăng cường">
          <span>Giờ chính (h)</span>
        </Tooltip>
      ),
      dataIndex: 'administrative_hours',
      key: 'administrative_hours',
      align: 'center',
      render: (_value, record) => {
        if (!record.shift) return <span className="text-gray-300">—</span>;
        const displayHours = getDisplayAdministrativeHours(record);
        return displayHours ? (
          <span className="font-semibold text-emerald-600">{displayHours}</span>
        ) : isAdditionalShift(record.hnhc) ? (
          <span className="text-gray-300">—</span>
        ) : (
          <Tag color="red">Chấm công chưa đủ</Tag>
        );
      }
    },
    {
      title: (
        <Tooltip title="Giờ tăng ca">
          <span>Tăng ca (h)</span>
        </Tooltip>
      ),
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      align: 'center',
      width: 320,
      render: (_value, record) => {
        const displayHours = getDisplayOvertimeHours(record);
        return (
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="font-semibold text-amber-600">
              {displayHours || '—'}
            </span>
            <OvertimeApprovalStatus
              date={record.date}
              hours={displayHours}
              approval={record.overtime_approval}
              compact
            />
            <OvertimeApprovalActions record={record} />
          </div>
        );
      }
    }
  ];

  const forgetAttendance = attendances.filter((item) => {
    if (
      item.shift > 0 &&
      (!item.time_in ||
        !item.time_out ||
        item.time_in === '' ||
        item.time_out === '')
    ) {
      return true;
    }
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

  const tableProps: TableProps<RecordTableColumns> = {
    ...(customTableProps as unknown as TableProps<RecordTableColumns>),
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

  const getSubtitle = () => {
    if (filterType === 'range' && dateRange) {
      return `Từ ${dateRange[0].format('DD/MM/YYYY')} đến ${dateRange[1].format('DD/MM/YYYY')}`;
    }
    return `Tháng ${month.format('MM/YYYY')}`;
  };

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
        <RefreshButton
          refresh={() => {
            refetch();
            refetchCategories();
          }}
          isLoading={isFetching}
        />
        <EmployeeListModal />
        <ExportModal />
        <AttendanceArchiveButton />
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
          <span className="text-xs text-gray-500">📅 {getSubtitle()}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
        <p className="mb-3 text-sm text-gray-500">
          Chỉ xem 3 tháng gần nhất:{' '}
          {getAttendanceWindow().start.format('MM/YYYY')} –{' '}
          {getAttendanceWindow().end.format('MM/YYYY')}. Dữ liệu cũ xem ở Tra
          cứu công lưu trữ.
        </p>
        <FilterBar
          monthValue={filterType === 'month' ? month : null}
          rangeValue={filterType === 'range' ? dateRange : null}
          onMonthChange={(value) => {
            const selectedMonth = value
              ? dayjs(value)
              : getAttendanceWindow().month;
            setMonth(selectedMonth);
            setDateRange(null);
            setFilterType('month');
            setParams((prev) => ({
              ...prev,
              page: 1,
              'filter[date]': undefined,
              'filter[date_between]': `${selectedMonth.startOf('month').format('YYYY-MM-DD')},${selectedMonth.endOf('month').format('YYYY-MM-DD')}`
            }));
          }}
          onRangeChange={(value) => {
            if (value) {
              setDateRange(value);
              setFilterType('range');
              setParams((prev) => ({
                ...prev,
                page: 1,
                'filter[date_between]': `${value[0].format('YYYY-MM-DD')},${value[1].format('YYYY-MM-DD')}`
              }));
            } else {
              setDateRange(null);
              setFilterType('month');
              setParams((prev) => ({
                ...prev,
                page: 1,
                'filter[date_between]': `${month.startOf('month').format('YYYY-MM-DD')},${month.endOf('month').format('YYYY-MM-DD')}`
              }));
            }
          }}
          onCategoryChange={(value) => {
            setParams((prev) => ({
              ...prev,
              page: 1,
              'filter[employees.calendar_category_id]': value
            }));
          }}
          onSearch={handleSearch}
          categoryOptions={categoryOptions}
        />
      </div>

      {/* Forgotten Days Toggle */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 dark:border-amber-900/50 dark:from-amber-900/20 dark:to-orange-900/20">
        <Switch
          id="forgotten-days-switch"
          size="small"
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
        <label
          htmlFor="forgotten-days-switch"
          className="cursor-pointer text-sm font-medium text-amber-800 dark:text-amber-200"
        >
          ⚠️ Hiển thị những ngày quên chấm công
        </label>
        {forgottenDays && (
          <Tag color="warning" className="ml-auto !text-xs">
            {forgetAttendance.length} ngày quên
          </Tag>
        )}
      </div>

      {/* Table */}
      {isMobile ? (
        <Spin spinning={isLoading}>
          <div className="flex flex-col gap-3">
            {(forgottenDays ? forgetAttendance : attendances).map(
              (record, index) => {
                const isSunday = record.date
                  ? new Date(record.date).getDay() === 0
                  : false;
                return (
                  <div
                    key={[
                      'attendances',
                      'sheet',
                      record.employee_id,
                      record.date
                    ].join('-')}
                    className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                        {index +
                          1 +
                          (params.limit ?? 50) * ((params.page ?? 1) - 1)}
                      </span>
                      <span className="line-clamp-1 text-[15px] font-semibold text-gray-800 dark:text-white/90">
                        {record.name || (
                          <span className="text-gray-400 italic">
                            Chưa có thông tin
                          </span>
                        )}
                      </span>
                      <Tag
                        color="blue"
                        className="!m-0 ml-auto !font-mono !text-xs"
                      >
                        {record.employee_id}
                      </Tag>
                    </div>
                    <div className="space-y-1 pl-8 text-[13px] text-gray-500">
                      <div className="flex items-center gap-2">
                        <span
                          className={isSunday ? 'font-medium text-red-500' : ''}
                        >
                          {record.date
                            ? new Date(record.date).toLocaleDateString(
                                'vi-VN',
                                {
                                  weekday: 'long',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                }
                              )
                            : '—'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          Vào:{' '}
                          {record.time_in ? (
                            <Tag color="green" className="!m-0 !text-xs">
                              {new Date(record.time_in).toLocaleTimeString(
                                'vi-VN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                }
                              )}
                            </Tag>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </span>
                        <span>
                          Ra:{' '}
                          {record.time_out ? (
                            <Tag color="orange" className="!m-0 !text-xs">
                              {new Date(record.time_out).toLocaleTimeString(
                                'vi-VN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                }
                              )}
                            </Tag>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {getDayTypeTag(record)}
                        {record.total_hours ? (
                          <span>
                            Tổng:{' '}
                            <strong className="text-blue-600">
                              {record.total_hours}h
                            </strong>
                          </span>
                        ) : record.shift ? (
                          <Tag color="red" className="!text-xs">
                            Chấm công chưa đủ
                          </Tag>
                        ) : null}
                        {getDisplayAdministrativeHours(record) ? (
                          <span>
                            Chính:{' '}
                            <strong className="text-emerald-600">
                              {getDisplayAdministrativeHours(record)}h
                            </strong>
                          </span>
                        ) : null}
                        {getDisplayOvertimeHours(record) ? (
                          <span>
                            TC:{' '}
                            <strong className="text-amber-600">
                              {getDisplayOvertimeHours(record)}h
                            </strong>
                          </span>
                        ) : null}
                        <OvertimeApprovalStatus
                          date={record.date}
                          hours={getDisplayOvertimeHours(record)}
                          approval={record.overtime_approval}
                        />
                        <OvertimeApprovalActions record={record} />
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Pagination
              {...customPaginationProps}
              size="small"
              current={pagination.current}
              pageSize={
                forgottenDays ? forgetAttendance.length : pagination.pageSize
              }
              total={forgottenDays ? forgetAttendance.length : pagination.total}
              onChange={(page, size) => {
                setParams((prev) => ({ ...prev, page, limit: size }));
              }}
            />
          </div>
        </Spin>
      ) : (
        <Table<RecordTableColumns>
          {...tableProps}
          className="[&_.ant-table-tbody>.ant-table-row>td]:!h-24 [&_.ant-table-tbody>.ant-table-row>td]:!px-3 [&_.ant-table-tbody>.ant-table-row>td]:!py-2 [&_.ant-table-tbody>.ant-table-row>td]:!align-middle [&_.ant-table-tbody>.ant-table-row>th]:!h-24 [&_.ant-table-tbody>.ant-table-row>th]:!align-middle [&_.ant-tag]:!mr-0"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page: Merged with Tabs
// ─────────────────────────────────────────────────────────────────────────────

export default function AttendancesPage() {
  const monthKey = useAttendanceMonth();
  return (
    <ComponentCard title="Quản lý chấm công">
      <div className="mb-4">
        <AttendanceImportButton />
      </div>
      <Tabs
        key={monthKey}
        defaultActiveKey="records"
        type="card"
        size="large"
        animated
        items={[
          {
            key: 'records',
            label: (
              <span className="flex items-center gap-2 text-sm font-medium">
                <FaCalculator className="text-blue-500" />
                Bảng tính công
              </span>
            ),
            children: <RecordsTab />
          },
          {
            key: 'history',
            label: (
              <span className="flex items-center gap-2 text-sm font-medium">
                <FaHistory className="text-emerald-500" />
                Lịch sử chấm công
              </span>
            ),
            children: <HistoryTab />
          }
        ]}
      />
    </ComponentCard>
  );
}
