import AppSearchInput from '@/components/common/AppSearchInput';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Drawer,
  Select,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tabs,
  TabsProps,
  Tag
} from 'antd';
import dayjs from 'dayjs';

import { CSSProperties, useEffect, useMemo, useState, useRef } from 'react';
import {
  FaCalendarCheck,
  FaUtensils,
  FaTrashAlt,
  FaFemale,
  FaMale,
  FaSearch,
  FaList
} from 'react-icons/fa';

import { workLegends } from '@/configs/legend/workLegends.config';
import { QueryParams } from '@/types/queryParams';
import { ScheduleDetailType } from '@/types/scheduleDetailType';
import { ScheduleType } from '@/types/scheduleType';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import { useAuth } from '@hooks/useAuth';
import { useCrudList } from '@hooks/useCrudList';
import { scheduleDetailService } from '@services/ScheduleDetailService';
import { fetchWorkScheduleCategories } from '@services/WorkScheduleCategoryService';
import { scheduleService } from '@services/workScheduleService';
import { canViewTotalWorkSchedules } from '@utils/authUtil';
import { countDayOfWeekInMonth } from '@utils/countDayOfWeekInMonth';
import './scheduleHover.css';

interface HnhcTableType {
  key: string;
  employee_id: string;
  employee_name: string;
  schedule_category_id: number | string;
  [dayKey: `day${number}`]: ScheduleDetailType['hnhc'];
}

interface WcTableType {
  key: string;
  employee_id: string;
  employee_name: string;
  category_schedule_id: number | string;
  [dayKey: `day${number}`]: boolean;
}

interface HNHCGroupedData {
  group_id: string | number;
  group_name: string;
  data: HnhcTableType[];
}

const normalizeText = (value?: string | null) => value?.toLowerCase().trim();

// Current employee IDs, aligned with backend AttendanceEmployeeCode mappings.
const QC_LEADER_EMPLOYEE_IDS = ['24070400', '22120701', '25060400'] as const;
const WAREHOUSE_LEADER_EMPLOYEE_IDS = ['24061901', '22022200'] as const;
const MOLD_LEADER_EMPLOYEE_IDS = [
  '22120400',
  '24110201',
  '25110800',
  '26050301'
] as const;
const PRODUCTION_LEADER_CATEGORY_NAMES = [
  'Nhóm Đi Xoay Ca - Hàng Nhật',
  'Nhóm Kỹ Thuật',
  'Nhóm Đi Xoay Ca - Hàng Chợ'
] as const;
const OUTSOURCING_LEADER_CATEGORY_NAMES = [
  'Nhóm QC Ca Ngày',
  'Nhóm Làm Việc Hành Chính'
] as const;
const EMPLOYEE_COLUMN_WIDTH = 170;
const DAY_COLUMN_WIDTH = 42;

export function ScheduleDetailDrawer({
  open,
  onClose,
  scheduleId
}: {
  open: boolean;
  onClose: () => void;
  scheduleId?: string | null;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Chi tiết lịch làm việc"
      width="100%"
      placement="right"
      styles={{ body: { padding: '16px' } }}
    >
      {scheduleId && <Detail scheduleId={scheduleId} isDrawer />}
    </Drawer>
  );
}

export default function Detail({
  scheduleId,
  isDrawer
}: {
  scheduleId?: string | null;
  isDrawer?: boolean;
}) {
  const { user } = useAuth();
  const isLimitedTotalWorkScheduleViewer = canViewTotalWorkSchedules(user);
  const routeParams = useParams({ strict: false });
  const id = (scheduleId ||
    (routeParams as Record<string, string>)?.id) as string;

  const [params, setParams] = useState<QueryParams>();
  const [maxDay, setMaxDay] = useState<number>(0);
  const [totalSaturdays, setTotalSaturdays] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs | null>(null);
  const mainContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = mainContentRef.current;
    if (!root) return;

    let activeCell: HTMLTableCellElement | null = null;
    let highlightedCells: HTMLTableCellElement[] = [];
    const clearHighlight = () => {
      highlightedCells.forEach((cell) =>
        cell.classList.remove('schedule-hover-axis')
      );
      highlightedCells = [];
      activeCell = null;
    };
    const highlight = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const target = event.target;
      const cell =
        target instanceof Element
          ? target.closest<HTMLTableCellElement>('td, th')
          : null;
      const table = cell?.closest('.work-schedule-sticky-table');
      if (!cell || !table || !root.contains(table)) {
        clearHighlight();
        return;
      }
      if (cell === activeCell) return;
      clearHighlight();
      activeCell = cell;
      // Include the sticky header's separate table and the fixed employee column.
      table
        .querySelectorAll<HTMLTableCellElement>('td, th')
        .forEach((candidate) => {
          if (candidate.cellIndex === cell.cellIndex) {
            candidate.classList.add('schedule-hover-axis');
            highlightedCells.push(candidate);
          }
        });
    };
    root.addEventListener('pointerover', highlight);
    root.addEventListener('pointerleave', clearHighlight);
    root.addEventListener('pointercancel', clearHighlight);
    return () => {
      clearHighlight();
      root.removeEventListener('pointerover', highlight);
      root.removeEventListener('pointerleave', clearHighlight);
      root.removeEventListener('pointercancel', clearHighlight);
    };
  }, []);

  const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['schedule', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await scheduleService.get(id as string);
      return response as ScheduleType;
    },
    enabled: !!id
  });

  const { data: scheduleDetails, queryResult } = useCrudList({
    service: scheduleDetailService,
    queryKey: 'scheduleDetails',
    initialFilters: {
      limit: 0,
      include: ['employees', 'schedules', 'employees.calendarCategory'],
      sort: 'date',
      'filter[schedule_id]': id || '',
      'fields[employees]': 'id,name,calendar_category_id',
      ...params
    },
    enabled: !!id
  });

  const { data: categories } = useQuery({
    queryKey: ['workScheduleCategories', { limit: 0 }],
    queryFn: () => fetchWorkScheduleCategories({ limit: 0 })
  });

  const workScheduleAccess = useMemo(() => {
    const roleName = normalizeText(user?.role.name);
    const roleId = user?.role.id?.toString();

    const allowedEmployeeIds = new Set<string>();
    const allowedCategoryNames = new Set<string>();

    if (roleName === 'tổ trưởng qc' || roleId === '23') {
      QC_LEADER_EMPLOYEE_IDS.forEach((employeeId) =>
        allowedEmployeeIds.add(employeeId)
      );
    }

    if (roleName === 'tổ trưởng kho' || roleId === '24') {
      WAREHOUSE_LEADER_EMPLOYEE_IDS.forEach((employeeId) =>
        allowedEmployeeIds.add(employeeId)
      );
    }

    if (roleName === 'tổ trưởng khuôn' || roleId === '25') {
      MOLD_LEADER_EMPLOYEE_IDS.forEach((employeeId) =>
        allowedEmployeeIds.add(employeeId)
      );
    }

    if (roleName === 'tổ trưởng sản xuất' || roleName === 'tổ phó sản xuất') {
      PRODUCTION_LEADER_CATEGORY_NAMES.forEach((categoryName) =>
        allowedCategoryNames.add(normalizeText(categoryName) || '')
      );
    }

    if (roleName === 'tổ trưởng ngoại quan') {
      OUTSOURCING_LEADER_CATEGORY_NAMES.forEach((categoryName) =>
        allowedCategoryNames.add(normalizeText(categoryName) || '')
      );
    }

    return {
      allowedEmployeeIds,
      allowedCategoryNames,
      hasRestriction:
        allowedEmployeeIds.size > 0 || allowedCategoryNames.size > 0
    };
  }, [user?.role.id, user?.role.name]);

  const categoryOptions = categories?.workScheduleCategories
    .filter((item) => {
      if (workScheduleAccess.allowedCategoryNames.size === 0) return true;
      return workScheduleAccess.allowedCategoryNames.has(
        normalizeText(item.name) || ''
      );
    })
    .map((item) => ({
      label: item.name,
      value: item.id
    }));

  const visibleScheduleDetails = useMemo(() => {
    if (!workScheduleAccess.hasRestriction) return scheduleDetails;

    return scheduleDetails.filter((item) => {
      const employeeId = item.employee_id?.toString();
      const categoryName = normalizeText(
        item.employees?.calendar_category?.name
      );

      return (
        workScheduleAccess.allowedEmployeeIds.has(employeeId) ||
        workScheduleAccess.allowedCategoryNames.has(categoryName || '')
      );
    });
  }, [scheduleDetails, workScheduleAccess]);

  const employees = visibleScheduleDetails.reduce(
    (acc: { [key: string]: typeof visibleScheduleDetails }, item) => {
      const employee_id = item.employee_id;
      if (!acc[employee_id]) {
        acc[employee_id] = [];
      }
      acc[employee_id].push(item);
      return acc;
    },
    {}
  );

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string, type: 'name' | 'code') => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setParams((prev) => ({
        ...prev,
        'filter[employees.id]': type === 'code' && value ? value : undefined,
        'filter[employees.name]': type === 'name' && value ? value : undefined
      }));
    }, 400);
  };

  useEffect(() => {
    const currentDate = dayjs(schedule?.date).startOf('month');
    setCurrentDate(currentDate);
  }, [schedule]);

  useEffect(() => {
    setMaxDay(dayjs(currentDate).daysInMonth());
    setTotalSaturdays(countDayOfWeekInMonth(currentDate, 6));
  }, [currentDate]);

  const hnhcData = useMemo(() => {
    if (!employees || Object.keys(employees).length === 0) {
      return [];
    }
    const grouped: { [group_id: string]: HNHCGroupedData } = {};

    Object.entries(employees).forEach(([employee_id, records]) => {
      const group_id = records[0]?.employees?.calendar_category_id || '';
      const group_name = records[0]?.employees?.calendar_category?.name || '';

      const row: HnhcTableType = {
        key: employee_id,
        employee_id: employee_id,
        employee_name: records[0]?.employees?.name || '',
        schedule_category_id: group_id
      };

      records.forEach((item) => {
        if (!item.hnhc) {
          return;
        }
        const day = dayjs(item.date).get('date');
        row[`day${day}`] = item.hnhc;
      });

      if (Object.keys(row).length <= 4) {
        return;
      }

      if (!grouped[group_id]) {
        grouped[group_id] = {
          group_id,
          group_name,
          data: []
        };
      }

      grouped[group_id].data.push(row);
    });

    const data = Object.values(grouped);
    return data;
  }, [employees]);

  const allEmployees = useMemo(() => {
    if (!scheduleDetails) return {};
    return scheduleDetails.reduce(
      (acc: { [key: string]: typeof scheduleDetails }, item) => {
        const employee_id = item.employee_id;
        if (!acc[employee_id]) {
          acc[employee_id] = [];
        }
        acc[employee_id].push(item);
        return acc;
      },
      {}
    );
  }, [scheduleDetails]);

  const columnsDefault = [
    {
      title: 'Nhân viên',
      key: 'employee',
      fixed: 'left',
      width: EMPLOYEE_COLUMN_WIDTH,
      render: (
        _: unknown,
        record: { employee_id: string; employee_name: string }
      ) => (
        <div className="flex w-full flex-col gap-1">
          <span className="text-[13px] leading-snug font-medium text-gray-800 dark:text-white/90">
            {record.employee_name || (
              <span className="text-gray-400 italic">Chưa có</span>
            )}
          </span>
          <div>
            <Tag color="blue" className="!m-0 !font-mono !text-[10px]">
              {record.employee_id}
            </Tag>
          </div>
        </div>
      )
    }
  ];

  const todayColumnClass =
    '!border-l-2 !border-r-2 !border-blue-400 !bg-blue-100/70 dark:!bg-blue-900/40';
  const todayColumnStyle: CSSProperties = {
    backgroundColor: '#dbeafe',
    borderLeft: '2px solid #60a5fa',
    borderRight: '2px solid #60a5fa'
  };
  const getDayColumnProps = (isToday: boolean) => {
    const dayColumnStyle: CSSProperties = {
      minWidth: DAY_COLUMN_WIDTH,
      width: DAY_COLUMN_WIDTH,
      maxWidth: DAY_COLUMN_WIDTH,
      boxSizing: 'border-box',
      paddingInline: 4,
      ...(isToday ? todayColumnStyle : {})
    };

    return {
      width: DAY_COLUMN_WIDTH,
      className: isToday ? todayColumnClass : undefined,
      onHeaderCell: () => ({
        className: isToday ? todayColumnClass : undefined,
        style: dayColumnStyle
      }),
      onCell: () => ({
        className: isToday ? todayColumnClass : undefined,
        style: dayColumnStyle
      })
    };
  };

  const columnsHNHC: TableColumnsType<HnhcTableType> = [
    ...(columnsDefault as TableColumnsType<HnhcTableType>),
    ...Array.from({ length: maxDay }).map((_, index) => {
      const day = dayjs(currentDate).startOf('month').add(index, 'day');
      const isToday = day.isSame(dayjs(), 'day');

      return {
        title: () => (
          <div
            className={`flex flex-col items-center justify-center ${isToday ? 'text-[13px] font-black tracking-wide text-blue-700 dark:text-blue-300' : ''}`}
          >
            <span className="text-center">
              {day.get('date').toString().padStart(2, '0')}
            </span>
            <span
              className={`text-center ${isToday ? 'text-[11px] uppercase' : 'text-[10px]'}`}
            >
              {day.format('ddd')}
            </span>
          </div>
        ),
        dataIndex: 'day' + (index + 1),
        key: 'day' + (index + 1),
        align: 'center' as const,
        ...getDayColumnProps(isToday),
        render: (value: string) => {
          if (!value) return null;
          return (
            <div className="flex w-full items-center justify-center">
              {workLegends[value as keyof typeof workLegends]?.icon || value}
            </div>
          );
        }
      };
    })
  ];
  const columnsWC: TableProps<WcTableType>['columns'] = [
    ...(columnsDefault as TableColumnsType<WcTableType>),
    ...Array.from({ length: maxDay }).map((_, index) => {
      const day = dayjs(currentDate).startOf('month').add(index, 'day');
      const isToday = day.isSame(dayjs(), 'day');

      return {
        title: () => (
          <div
            className={`flex flex-col items-center justify-center ${isToday ? 'text-[13px] font-black tracking-wide text-blue-700 dark:text-blue-300' : ''}`}
          >
            <span className="text-center">
              {day.get('date').toString().padStart(2, '0')}
            </span>
            <span
              className={`text-center ${isToday ? 'text-[11px] uppercase' : 'text-[10px]'}`}
            >
              {day.format('ddd')}
            </span>
          </div>
        ),
        dataIndex: 'day' + (index + 1),
        key: 'day' + (index + 1),
        align: 'center' as const,
        ...getDayColumnProps(isToday),
        render: (value: boolean) => {
          if (!value) return null;
          return (
            <div className="flex w-full items-center justify-center">
              {value && workLegends['VS'].icon}
            </div>
          );
        }
      };
    })
  ];
  const columnsTrashWC: TableProps<WcTableType>['columns'] = [
    ...(columnsDefault as TableColumnsType<WcTableType>),
    ...Array.from({ length: totalSaturdays }).map((_, index) => {
      const day = dayjs(currentDate).startOf('month').add(index, 'week').day(6);
      const isToday = day.isSame(dayjs(), 'day');

      return {
        title: () => (
          <div
            className={`flex flex-col items-center justify-center ${isToday ? 'text-[13px] font-black tracking-wide text-blue-700 dark:text-blue-300' : ''}`}
          >
            <span className="text-center">
              {day.get('date').toString().padStart(2, '0')}
            </span>
            <span
              className={`text-center ${isToday ? 'text-[11px] uppercase' : 'text-[10px]'}`}
            >
              {day.format('ddd')}
            </span>
          </div>
        ),
        dataIndex: 'day' + day.date(),
        key: 'day' + day.date(),
        align: 'center' as const,
        ...getDayColumnProps(isToday),
        render: (value: boolean) => {
          if (!value) return null;
          return (
            <div className="flex w-full items-center justify-center">
              {value && (workLegends['VS'].icon || value)}
            </div>
          );
        }
      };
    })
  ];
  const getTableScroll = (dayCount: number): TableProps<unknown>['scroll'] => ({
    x: EMPLOYEE_COLUMN_WIDTH + dayCount * DAY_COLUMN_WIDTH,
    scrollToFirstRowOnChange: false
  });
  const monthTableScroll = getTableScroll(maxDay);
  const saturdayTableScroll = getTableScroll(totalSaturdays);
  const [stickyHeaderOffset, setStickyHeaderOffset] = useState(0);
  const tableSticky: TableProps<unknown>['sticky'] = {
    offsetHeader: stickyHeaderOffset
  };
  const scheduleTableClassName =
    'smooth-sticky-table work-schedule-sticky-table [&_.ant-table-cell-fix-left]:!max-w-none [&_.ant-table-cell-fix-left]:!whitespace-normal';
  const scheduleTableStyle = {
    '--work-schedule-sticky-top': `${stickyHeaderOffset}px`
  } as CSSProperties;

  const { eatRoomData, wcMenData, wcWomenData, wcTrashData } = useMemo(() => {
    const sourceEmployees =
      user?.role.id?.toString() === '25' ? allEmployees : employees;
    if (Object.keys(sourceEmployees).length === 0) {
      return {
        eatRoomData: [],
        wcMenData: [],
        wcWomenData: [],
        wcTrashData: []
      };
    }

    const eatRoomData: WcTableType[] = [];
    const wcMenData: WcTableType[] = [];
    const wcWomenData: WcTableType[] = [];
    const wcTrashData: WcTableType[] = [];
    Object.entries(sourceEmployees).forEach(([employee_id, records]) => {
      const eatRoomRow: WcTableType = {
        key: employee_id,
        employee_id: employee_id,
        employee_name: records[0]?.employees?.name || '',
        category_schedule_id: records[0]?.employees?.calendar_category_id || ''
      };
      const wcMenRow: WcTableType = {
        key: employee_id,
        employee_id: employee_id,
        employee_name: records[0]?.employees?.name || '',
        category_schedule_id: records[0]?.employees?.calendar_category_id || ''
      };
      const wcWomenRow: WcTableType = {
        key: employee_id,
        employee_id: employee_id,
        employee_name: records[0]?.employees?.name || '',
        category_schedule_id: records[0]?.employees?.calendar_category_id || ''
      };
      const wcTrashRow: WcTableType = {
        key: employee_id,
        employee_id: employee_id,
        employee_name: records[0]?.employees?.name || '',
        category_schedule_id: records[0]?.employees?.calendar_category_id || ''
      };

      records.forEach((item) => {
        const day = dayjs(item.date).get('date');
        if (item.is_eat_room) {
          eatRoomRow[`day${day}`] = item.is_eat_room;
        }
        if (item.is_wc_clean_men) {
          wcMenRow[`day${day}`] = item.is_wc_clean_men;
        }
        if (item.is_wc_clean_women) {
          wcWomenRow[`day${day}`] = item.is_wc_clean_women;
        }
        if (item.is_wc_trash) {
          wcTrashRow[`day${day}`] = item.is_wc_trash;
        }
      });

      if (Object.keys(eatRoomRow).length > 4) {
        eatRoomData.push(eatRoomRow);
      }
      if (Object.keys(wcMenRow).length > 4) {
        wcMenData.push(wcMenRow);
      }
      if (Object.keys(wcWomenRow).length > 4) {
        wcWomenData.push(wcWomenRow);
      }
      if (Object.keys(wcTrashRow).length > 4) {
        wcTrashData.push(wcTrashRow);
      }
    });
    const sortFn = (a: WcTableType, b: WcTableType) => {
      for (let i = 1; i <= maxDay; i++) {
        if (a[`day${i}`] && !b[`day${i}`]) return -1;
        if (!a[`day${i}`] && b[`day${i}`]) return 1;
      }
      return 0;
    };
    eatRoomData.sort(sortFn);
    wcMenData.sort(sortFn);
    wcWomenData.sort(sortFn);
    wcTrashData.sort(sortFn);
    return {
      eatRoomData,
      wcMenData,
      wcWomenData,
      wcTrashData
    };
  }, [employees, allEmployees, maxDay, user?.role.id]);

  useEffect(() => {
    // Drawer body scrolls below its own header, independently of the page header.
    if (isDrawer) {
      setStickyHeaderOffset(0);
      return;
    }
    const header = document.querySelector<HTMLElement>(
      '.glass-app-shell header'
    );
    if (!header) return;
    const updateOffset = () =>
      setStickyHeaderOffset(header.getBoundingClientRect().height);
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isDrawer]);

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaCalendarCheck className="text-blue-500" />
          Hàng Nhật - Hàng Chợ
        </span>
      ),
      children: (
        <>
          {hnhcData?.map((category) => (
            <div key={category.group_id} className="mb-4">
              <div className="flex items-center justify-center rounded-t-lg bg-gradient-to-r from-cyan-400 to-cyan-500 py-2">
                <span className="text-md font-bold text-white">
                  {category.group_name}
                </span>
              </div>

              <Table<HnhcTableType>
                columns={columnsHNHC}
                dataSource={category.data}
                rowKey={(record) =>
                  [
                    'scheduleHNHC',
                    record.schedule_category_id,
                    record.employee_id
                  ].join('-')
                }
                bordered
                className={scheduleTableClassName}
                style={scheduleTableStyle}
                scroll={monthTableScroll}
                sticky={tableSticky}
                tableLayout="fixed"
                pagination={false}
                size="small"
              />
            </div>
          ))}
        </>
      )
    },
    {
      key: '2',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaUtensils className="text-amber-500" />
          Trực phòng ăn
        </span>
      ),
      children: (
        <Table<WcTableType>
          columns={columnsWC}
          dataSource={eatRoomData}
          rowKey={(record) =>
            [
              'scheduleEatRoom',
              record.category_schedule_id,
              record.employee_id
            ].join('-')
          }
          bordered
          className={scheduleTableClassName}
          style={scheduleTableStyle}
          scroll={monthTableScroll}
          sticky={tableSticky}
          tableLayout="fixed"
          pagination={false}
          size="small"
        />
      )
    },
    {
      key: '3',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaTrashAlt className="text-emerald-500" />
          Đổ rác WC
        </span>
      ),
      children: (
        <Table<WcTableType>
          columns={columnsTrashWC}
          dataSource={wcTrashData}
          rowKey={(record) =>
            [
              'scheduleEatRoom',
              record.category_schedule_id,
              record.employee_id
            ].join('-')
          }
          bordered
          className={scheduleTableClassName}
          style={scheduleTableStyle}
          scroll={saturdayTableScroll}
          sticky={tableSticky}
          tableLayout="fixed"
          pagination={false}
          size="small"
        />
      )
    },
    {
      key: '4',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaFemale className="text-pink-500" />
          Trực WC nữ
        </span>
      ),
      children: (
        <Table<WcTableType>
          columns={columnsWC}
          dataSource={wcWomenData}
          rowKey={(record) =>
            [
              'scheduleWCWomen',
              record.category_schedule_id,
              record.employee_id
            ].join('-')
          }
          bordered
          className={scheduleTableClassName}
          style={scheduleTableStyle}
          scroll={monthTableScroll}
          sticky={tableSticky}
          tableLayout="fixed"
          pagination={false}
          size="small"
        />
      )
    },
    {
      key: '5',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaMale className="text-blue-500" />
          Trực WC nam
        </span>
      ),
      children: (
        <Table<WcTableType>
          columns={columnsWC}
          dataSource={wcMenData}
          rowKey={(record) =>
            [
              'scheduleWCMen',
              record.category_schedule_id,
              record.employee_id
            ].join('-')
          }
          bordered
          className={scheduleTableClassName}
          style={scheduleTableStyle}
          scroll={monthTableScroll}
          sticky={tableSticky}
          tableLayout="fixed"
          pagination={false}
          size="small"
        />
      )
    }
  ].filter((item) => {
    const roleId = user?.role.id?.toString();

    // Tab 4 (Trực WC nữ): Hide for role_id 25 only
    if (item.key === '4') {
      return roleId !== '25';
    }

    // All other tabs: Visible to all
    return true;
  });

  const visibleWorkLegends = Object.entries(workLegends).filter(
    ([key]) => !isLimitedTotalWorkScheduleViewer || key === 'VS'
  );

  const mainContent = (
    <div
      ref={mainContentRef}
      className={`work-schedule-detail ${isDrawer ? 'flex flex-col gap-6' : 'space-y-5'}`}
    >
      {/* ── Legends ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
        {visibleWorkLegends.map(([key, legend]) => (
          <div
            key={key}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            {legend.icon}
            <span className="text-gray-600 dark:text-gray-400">
              {legend.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              <FaList className="mr-1 inline-block text-gray-400" />
              Nhóm danh mục
            </label>
            <Select
              options={categoryOptions}
              placeholder="Chọn danh mục..."
              className="w-full"
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
          </div>

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

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Spin tip="Đang tải..." spinning={queryResult.isLoading}>
        {queryResult.isError ? (
          <div className="flex items-center justify-center rounded-xl border border-red-100 bg-red-50 p-8 dark:border-red-900/50 dark:bg-red-900/20">
            <span className="text-red-500">Không tìm thấy lịch làm việc</span>
          </div>
        ) : (
          <Tabs items={items} size="large" type="card" animated={false} />
        )}
      </Spin>
    </div>
  );

  return (
    <>
      {!isDrawer && <BackButton />}
      {isDrawer ? (
        mainContent
      ) : (
        <ComponentCard
          className="!overflow-visible"
          title={
            isLoadingSchedule
              ? 'Chi tiết lịch làm việc'
              : `Chi tiết lịch làm việc tháng ${currentDate?.format('MM-YYYY')}`
          }
        >
          {mainContent}
        </ComponentCard>
      )}
    </>
  );
}
