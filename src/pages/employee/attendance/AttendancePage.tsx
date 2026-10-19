import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import { customTableProps } from '@components/custom/TableProps.custom';
import {
  AttendanceResponse,
  fetchEmpAttendances
} from '@services/AttendanceService';
import { QueryParams } from '@/types/queryParams';
import { uiStore } from '@stores/uiStore';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import {
  DatePicker,
  Empty,
  Segmented,
  Spin,
  Statistic,
  Switch,
  Table,
  TableColumnsType,
  Tag,
  Tooltip
} from 'antd';
import { TableProps } from 'antd/lib';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useAttendanceMonth } from '@/hooks/useAttendanceMonth';
import { OvertimeApprovalStatus } from '@/components/attendances/OvertimeApprovalStatus';
import type { OvertimeApproval } from '@/utils/overtimeApproval';
import {
  clampAttendanceRange,
  isCurrentAttendanceDate,
  getAttendanceWindow,
  isOutsideAttendanceWindow
} from '@/utils/attendanceWindow';
import {
  FiActivity,
  FiClock,
  FiCalendar,
  FiAlertTriangle
} from 'react-icons/fi';

// ── Types ────────────────────────────────────────────────────────────────────

interface CalculatedRow {
  employee_id: string;
  name: string;
  company: string;
  calendar_category_id: string;
  date: string;
  shift: number;
  hnhc: 'N' | 'LN' | 'D' | 'TC' | 'X' | 'NN' | null;
  day_type: string;
  is_schedule_change: boolean;
  time_in: string;
  time_out: string;
  total_hours: number | null;
  overtime_hours: number | null;
  administrative_hours: number | null;
  overtime_approval?: OvertimeApproval;
}

type ActiveTab = 'history' | 'calculate';

// ── Helpers ──────────────────────────────────────────────────────────────────

const safeDate = (v: string) => {
  if (!v) return new Date('');

  let clean = String(v);

  // Xóa các số microsecond/millisecond dư ở cuối (có đuôi .xxxxxx) mà webkit/iOS đời cũ không hiểu
  clean = clean.replace(/\.\d{1,6}(Z)?$/, '$1');

  // Safari trên iOS cũ bị lỗi "Invalid Date" đối với chuỗi ngày có dấu gạch ngang và khoảng trắng "YYYY-MM-DD HH:mm:ss"
  // nên ta chuyển dấu '-' thành '/' nếu rơi trúng định dạng đó (chứ không đụng ISO có ký tự 'T')
  if (/^\d{4}-\d{2}-\d{2}\s/.test(clean)) {
    clean = clean.replace(/-/g, '/');
  }

  return new Date(clean);
};

const fmtDate = (v: string) => {
  if (!v) return null;
  const d = safeDate(v);
  return isNaN(d.getTime())
    ? v.split('.')[0].split(' ')[0]
    : d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
};

const fmtWeekday = (v: string) => {
  if (!v) return null;
  const d = safeDate(v);
  return isNaN(d.getTime())
    ? '-'
    : d.toLocaleString('vi-VN', { weekday: 'long' });
};

const fmtTime = (v: string) => {
  if (!v) return '-';
  const clean = v.split('.')[0];
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(clean)) return clean;
  const d = safeDate(clean);
  if (isNaN(d.getTime())) {
    const match = clean.match(/\d{2}:\d{2}(:\d{2})?/);
    return match ? match[0] : clean;
  }
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const isAdditionalShift = (hnhc: CalculatedRow['hnhc']) =>
  hnhc === 'TC' || hnhc === 'LN';

const hnhcDisplayMap: Record<
  Exclude<CalculatedRow['hnhc'], null>,
  { code: string; label: string; color: string }
> = {
  N: { code: 'N', label: 'Ca ngày', color: 'processing' },
  D: { code: 'D', label: 'Ca đêm', color: 'purple' },
  TC: { code: 'TC', label: 'Tăng cường ca đêm', color: 'purple' },
  LN: { code: 'LN', label: 'Tăng cường ca ngày', color: 'gold' },
  NN: { code: 'NN', label: 'Nghỉ nửa ngày', color: 'red' },
  X: { code: 'X', label: 'Nghỉ', color: 'success' }
};

const getDisplayAdministrativeHours = (row: CalculatedRow) =>
  isAdditionalShift(row.hnhc) ? 0 : row.administrative_hours || 0;

const getDisplayOvertimeHours = (row: CalculatedRow) =>
  isAdditionalShift(row.hnhc) ? row.total_hours || 0 : row.overtime_hours || 0;

const getDisplayDayType = (row: Pick<CalculatedRow, 'hnhc' | 'day_type'>) => {
  if (row.hnhc === 'TC' || row.hnhc === 'LN') {
    return hnhcDisplayMap[row.hnhc].label;
  }
  return row.day_type;
};

// ── Summary Stats ────────────────────────────────────────────────────────────

function SummaryStats({
  data,
  isMobile
}: {
  data: CalculatedRow[];
  isMobile: boolean;
}) {
  const stats = useMemo(() => {
    const workDays = data.filter((d) => d.shift > 0).length;
    const totalHours = data.reduce((s, d) => s + (d.total_hours || 0), 0);
    const otHours = data.reduce((s, d) => s + getDisplayOvertimeHours(d), 0);
    const adminHours = data.reduce(
      (s, d) => s + getDisplayAdministrativeHours(d),
      0
    );
    const missingDays = data.filter(
      (d) =>
        !isCurrentAttendanceDate(d.date) &&
        d.shift > 0 &&
        (!d.time_in || !d.time_out || d.time_in === '' || d.time_out === '')
    ).length;
    return { workDays, totalHours, otHours, adminHours, missingDays };
  }, [data]);

  if (isMobile) {
    return (
      <div
        className="grid grid-cols-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          overflow: 'hidden'
        }}
      >
        <div
          className="col-span-2 border-r border-b border-gray-200 py-2.5 text-center"
          style={{
            width: '33.33%',
            borderRight: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            padding: '10px 0',
            textAlign: 'center'
          }}
        >
          <div
            className="text-[11px] text-gray-400"
            style={{ fontSize: '11px', color: '#9ca3af' }}
          >
            Đi làm
          </div>
          <div
            className="text-base leading-tight font-bold text-gray-800"
            style={{ fontSize: '16px', fontWeight: 'bold' }}
          >
            {stats.workDays}{' '}
            <span
              className="text-[11px] font-normal text-gray-400"
              style={{
                fontSize: '11px',
                fontWeight: 'normal',
                color: '#9ca3af'
              }}
            >
              ngày
            </span>
          </div>
        </div>
        <div
          className="col-span-2 border-r border-b border-gray-200 py-2.5 text-center"
          style={{
            width: '33.33%',
            borderRight: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            padding: '10px 0',
            textAlign: 'center'
          }}
        >
          <div
            className="text-[11px] text-gray-400"
            style={{ fontSize: '11px', color: '#9ca3af' }}
          >
            Tổng giờ
          </div>
          <div
            className="text-base leading-tight font-bold text-gray-800"
            style={{ fontSize: '16px', fontWeight: 'bold' }}
          >
            {Math.round(stats.totalHours * 10) / 10}{' '}
            <span
              className="text-[11px] font-normal text-gray-400"
              style={{
                fontSize: '11px',
                fontWeight: 'normal',
                color: '#9ca3af'
              }}
            >
              giờ
            </span>
          </div>
        </div>
        <div
          className="col-span-2 border-b border-gray-200 py-2.5 text-center"
          style={{
            width: '33.33%',
            borderBottom: '1px solid #e5e7eb',
            padding: '10px 0',
            textAlign: 'center'
          }}
        >
          <div
            className="text-[11px] text-gray-400"
            style={{ fontSize: '11px', color: '#9ca3af' }}
          >
            Giờ chính
          </div>
          <div
            className="text-base leading-tight font-bold text-gray-800"
            style={{ fontSize: '16px', fontWeight: 'bold' }}
          >
            {Math.round(stats.adminHours * 10) / 10}{' '}
            <span
              className="text-[11px] font-normal text-gray-400"
              style={{
                fontSize: '11px',
                fontWeight: 'normal',
                color: '#9ca3af'
              }}
            >
              giờ
            </span>
          </div>
        </div>
        <div
          className="col-span-3 border-r border-gray-200 py-2.5 text-center"
          style={{
            width: '50%',
            borderRight: '1px solid #e5e7eb',
            padding: '10px 0',
            textAlign: 'center'
          }}
        >
          <div
            className="text-[11px] text-gray-400"
            style={{ fontSize: '11px', color: '#9ca3af' }}
          >
            Tăng ca
          </div>
          <div
            className="text-base leading-tight font-bold text-gray-800"
            style={{ fontSize: '16px', fontWeight: 'bold' }}
          >
            {Math.round(stats.otHours * 10) / 10}{' '}
            <span
              className="text-[11px] font-normal text-gray-400"
              style={{
                fontSize: '11px',
                fontWeight: 'normal',
                color: '#9ca3af'
              }}
            >
              giờ
            </span>
          </div>
        </div>
        <div
          className={`col-span-3 py-2.5 text-center ${stats.missingDays > 0 ? 'bg-red-50' : ''}`}
          style={{
            width: '50%',
            padding: '10px 0',
            textAlign: 'center',
            backgroundColor: stats.missingDays > 0 ? '#fef2f2' : 'transparent'
          }}
        >
          <div
            className="text-[11px] text-gray-400"
            style={{ fontSize: '11px', color: '#9ca3af' }}
          >
            Quên chấm công
          </div>
          <div
            className={`text-base leading-tight font-bold ${stats.missingDays > 0 ? 'text-red-600' : 'text-gray-800'}`}
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: stats.missingDays > 0 ? '#dc2626' : '#1f2937'
            }}
          >
            {stats.missingDays}{' '}
            <span
              className="text-[11px] font-normal text-gray-400"
              style={{
                fontSize: '11px',
                fontWeight: 'normal',
                color: '#9ca3af'
              }}
            >
              ngày
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/50 px-4 py-3 dark:border-blue-900 dark:from-blue-950/30 dark:to-blue-900/20">
        <Statistic
          title={
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Ngày đi làm
            </span>
          }
          value={stats.workDays}
          suffix="ngày"
          valueStyle={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#2563eb'
          }}
        />
      </div>
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-3 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-emerald-900/20">
        <Statistic
          title={
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Tổng giờ làm
            </span>
          }
          value={Math.round(stats.totalHours * 100) / 100}
          suffix="h"
          valueStyle={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#059669'
          }}
        />
      </div>
      <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-violet-100/50 px-4 py-3 dark:border-violet-900 dark:from-violet-950/30 dark:to-violet-900/20">
        <Statistic
          title={
            <span className="text-xs text-violet-600 dark:text-violet-400">
              Giờ chính
            </span>
          }
          value={Math.round(stats.adminHours * 100) / 100}
          suffix="h"
          valueStyle={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#7c3aed'
          }}
        />
      </div>
      <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/50 px-4 py-3 dark:border-amber-900 dark:from-amber-950/30 dark:to-amber-900/20">
        <Statistic
          title={
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Giờ tăng ca
            </span>
          }
          value={Math.round(stats.otHours * 100) / 100}
          suffix="h"
          valueStyle={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#d97706'
          }}
        />
      </div>
      <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-rose-100/50 px-4 py-3 dark:border-rose-900 dark:from-rose-950/30 dark:to-rose-900/20">
        <Statistic
          title={
            <span className="text-xs text-rose-600 dark:text-rose-400">
              Quên chấm công
            </span>
          }
          value={stats.missingDays}
          suffix="ngày"
          valueStyle={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: stats.missingDays > 0 ? '#e11d48' : '#6b7280'
          }}
        />
      </div>
    </div>
  );
}

// ── Mobile Card for Calculate ───────────────────────────────────────────────

function MobileCalculateRow({ item }: { item: CalculatedRow }) {
  const dayType = getDisplayDayType(item);
  const displayOvertimeHours = getDisplayOvertimeHours(item);
  const isMissing =
    !isCurrentAttendanceDate(item.date) &&
    item.shift > 0 &&
    (!item.time_in ||
      !item.time_out ||
      item.time_in === '' ||
      item.time_out === '');

  return (
    <div
      className={`rounded-xl border bg-white p-3.5 shadow-sm ${
        isMissing ? 'border-red-200' : 'border-gray-100'
      }`}
      style={{
        padding: '14px',
        borderRadius: '12px',
        border: `1px solid ${isMissing ? '#fecaca' : '#f3f4f6'}`,
        marginBottom: '12px',
        backgroundColor: '#fff'
      }}
    >
      {/* Header: Date + Total */}
      <div
        className="flex items-center justify-between"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <span
            className="text-sm font-semibold text-gray-800"
            style={{ fontSize: '14px', fontWeight: 600 }}
          >
            {dayjs(item.date).format('DD/MM')}
          </span>
          <span
            className="ml-1.5 text-[13px] text-gray-400 capitalize"
            style={{
              marginLeft: '6px',
              fontSize: '13px',
              color: '#9ca3af',
              textTransform: 'capitalize'
            }}
          >
            {dayjs(item.date).format('dddd')}
          </span>
          {dayType ? (
            <span className="ml-1.5 text-[12px] font-medium text-amber-600">
              {dayType}
            </span>
          ) : null}
        </div>
        {item.shift > 0 ? (
          <div className="text-right" style={{ textAlign: 'right' }}>
            <span className="text-xl font-bold text-gray-800 tabular-nums">
              {item.total_hours ?? 0}
            </span>
            <span
              className="ml-0.5 text-sm text-gray-400"
              style={{ marginLeft: '2px', fontSize: '14px' }}
            >
              giờ
            </span>
            {displayOvertimeHours > 0 && (
              <span
                className="ml-1.5 text-sm text-amber-500 tabular-nums"
                style={{
                  marginLeft: '6px',
                  fontSize: '14px',
                  color: '#f59e0b'
                }}
              >
                +{displayOvertimeHours}h TC
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-300 italic">Nghỉ</span>
        )}
      </div>
      {/* Time in / out */}
      {item.shift > 0 && (
        <div
          className="mt-2.5 flex gap-2"
          style={{ marginTop: '10px', display: 'flex', gap: '8px' }}
        >
          <div
            className="flex-1 rounded-lg bg-gray-50 px-3 py-2"
            style={{
              flex: 1,
              backgroundColor: '#f9fafb',
              padding: '8px 12px',
              borderRadius: '8px',
              marginRight: '4px'
            }}
          >
            <div
              className="text-[11px] text-gray-400"
              style={{ fontSize: '11px', color: '#9ca3af' }}
            >
              Vào
            </div>
            <div
              className={`text-sm font-semibold tabular-nums ${item.time_in ? 'text-teal-600' : 'text-red-400'}`}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: item.time_in
                  ? '#0d9488'
                  : isMissing
                    ? '#f87171'
                    : '#9ca3af'
              }}
            >
              {item.time_in ? fmtTime(item.time_in) : '--:--:--'}
            </div>
          </div>
          <div
            className="flex-1 rounded-lg bg-gray-50 px-3 py-2"
            style={{
              flex: 1,
              backgroundColor: '#f9fafb',
              padding: '8px 12px',
              borderRadius: '8px',
              marginLeft: '4px'
            }}
          >
            <div
              className="text-[11px] text-gray-400"
              style={{ fontSize: '11px', color: '#9ca3af' }}
            >
              Ra
            </div>
            <div
              className={`text-sm font-semibold tabular-nums ${item.time_out ? 'text-slate-600' : 'text-red-400'}`}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: item.time_out
                  ? '#475569'
                  : isMissing
                    ? '#f87171'
                    : '#9ca3af'
              }}
            >
              {item.time_out ? fmtTime(item.time_out) : '--:--:--'}
            </div>
          </div>
        </div>
      )}
      <OvertimeApprovalStatus
        date={item.date}
        hours={displayOvertimeHours}
        approval={item.overtime_approval}
      />
      {isMissing && (
        <div className="mt-2 text-xs text-red-400">⚠ Chưa đủ chấm công</div>
      )}
    </div>
  );
}

// ── Mobile Card for History ────────────────────────────────────────────────
const hnhcLabels: Record<string, { label: string; color: string }> = {
  N: { label: 'Ca ngày', color: 'text-orange-500' },
  NN: { label: 'Nghỉ nửa ngày', color: 'text-red-500' },
  D: { label: 'Ca đêm', color: 'text-indigo-600' },
  X: { label: 'Nghỉ', color: 'text-gray-400' },
  TC: { label: hnhcDisplayMap.TC.label, color: 'text-purple-600' },
  LN: { label: hnhcDisplayMap.LN.label, color: 'text-amber-600' }
};

function MobileHistoryRow({ item }: { item: AttendanceResponse }) {
  const sameDateEntries = item.dates?.filter((d) => d.date === item.date) ?? [];
  const shift = item.hnhc ? hnhcLabels[item.hnhc] : null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
      {/* Header: Date + shift type */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-gray-800">
            {dayjs(item.date).format('DD/MM')}
          </span>
          <span className="text-[13px] text-gray-400 capitalize">
            {dayjs(item.date).format('dddd')}
          </span>
        </div>
        {shift && (
          <span className={`text-[13px] font-medium ${shift.color}`}>
            {shift.label}
          </span>
        )}
      </div>
      {/* Scan times */}
      {sameDateEntries.length > 0 && (
        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
          {sameDateEntries.map((d, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-1 ${
                i > 0 ? 'border-t border-gray-100' : ''
              }`}
            >
              <span className="text-xs text-gray-400">Lần {i + 1}</span>
              <span className="text-sm font-semibold text-teal-600 tabular-nums">
                {fmtTime(d.datetime)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Main Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export const AttendancePage = () => {
  const monthKey = useAttendanceMonth();
  return <AttendancePageContent key={monthKey} />;
};

const AttendancePageContent = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculate');
  const [month, setMonth] = useState<Dayjs>(getAttendanceWindow().month);
  const [forgottenDays, setForgottenDays] = useState<boolean>(false);
  const [cycleMode, setCycleMode] = useState<'month' | 'payroll'>('month');

  // Payroll cycle helper: 16th previous month → 15th selected month
  const getPayrollRange = (d: Dayjs) => {
    return clampAttendanceRange(d.subtract(1, 'month').date(16), d.date(15));
  };

  const getMonthRange = (d: Dayjs) => {
    const today = dayjs();
    const end = d.isSame(today, 'month')
      ? today.format('YYYY-MM-DD')
      : d.endOf('month').format('YYYY-MM-DD');
    return `${d.startOf('month').format('YYYY-MM-DD')},${end}`;
  };

  const getDateRange = (d: Dayjs, mode: 'month' | 'payroll') =>
    mode === 'payroll' ? getPayrollRange(d) : getMonthRange(d);

  const [historyParams, setHistoryParams] = useState<QueryParams>({
    limit: 0,
    'filter[date_between]': getMonthRange(getAttendanceWindow().month)
  });

  const { isMobile } = useStore(uiStore);

  const calculateDateRange = getDateRange(month, cycleMode);

  // ── Calculate data (include_calculation=1, no pagination) ────────────────
  const { data: calcResponse, isLoading: calcLoading } = useQuery({
    queryKey: ['emp-attendance', 'calculate', calculateDateRange],
    queryFn: async () => {
      return await fetchEmpAttendances({
        include_calculation: 1,
        limit: 0,
        'filter[date_between]': calculateDateRange
      });
    },
    enabled: activeTab === 'calculate',
    placeholderData: keepPreviousData
  });

  // ── History (raw) data ──────────────────────────────────────────────────
  const { data: historyResponse, isLoading: historyLoading } = useQuery({
    queryKey: ['emp-attendance', 'history', historyParams],
    queryFn: async () => {
      return await fetchEmpAttendances(historyParams);
    },
    enabled: activeTab === 'history',
    placeholderData: keepPreviousData
  });

  // ── Derived data ────────────────────────────────────────────────────────
  const calcData = useMemo(
    () => (calcResponse?.data || []) as unknown as CalculatedRow[],
    [calcResponse?.data]
  );
  const filteredCalcData = useMemo(() => {
    if (!forgottenDays) return calcData;
    return calcData.filter(
      (a) =>
        !isCurrentAttendanceDate(a.date) &&
        a.shift > 0 &&
        (!a.time_in || !a.time_out || a.time_in === '' || a.time_out === '')
    );
  }, [calcData, forgottenDays]);

  const historyData = (historyResponse?.data || []) as AttendanceResponse[];

  // ── Calculate columns ─────────────────────────────────────────────────
  const calcColumns: TableColumnsType<CalculatedRow> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      width: 50,
      render: (_v, _r, i) => i + 1
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => fmtDate(v)
    },
    {
      title: 'Thứ',
      dataIndex: 'date',
      key: 'weekday',
      width: 120,
      render: (v) => (
        <span className="text-gray-500 capitalize">{fmtWeekday(v)}</span>
      )
    },
    {
      title: 'Giờ vào',
      dataIndex: 'time_in',
      key: 'time_in',
      width: 100,
      render: (v) => (
        <span className={v ? 'text-emerald-600' : 'text-gray-300'}>
          {fmtTime(v)}
        </span>
      )
    },
    {
      title: 'Giờ ra',
      dataIndex: 'time_out',
      key: 'time_out',
      width: 100,
      render: (v) => (
        <span className={v ? 'text-rose-600' : 'text-gray-300'}>
          {fmtTime(v)}
        </span>
      )
    },
    {
      title: 'Loại ngày',
      dataIndex: 'day_type',
      key: 'day_type',
      width: 110,
      align: 'center',
      filters: [
        { text: 'Ca ngày', value: 'Ca ngày' },
        { text: 'Ca đêm', value: 'Ca đêm' },
        { text: 'Tăng cường ca ngày', value: 'Tăng cường ca ngày' },
        { text: 'Tăng cường ca đêm', value: 'Tăng cường ca đêm' },
        { text: 'Nghỉ nửa ngày', value: 'Nghỉ nửa ngày' },
        { text: 'Nghỉ', value: '' }
      ],
      onFilter: (value, record) => {
        const displayDayType = getDisplayDayType(record);
        if (value === '') return !displayDayType || displayDayType === '';
        return displayDayType === value;
      },
      render: (_v, record) => {
        const displayDayType = getDisplayDayType(record);
        if (record.hnhc === 'TC')
          return (
            <Tag color="purple" className="!m-0">
              Tăng cường ca đêm
            </Tag>
          );
        if (record.hnhc === 'LN')
          return (
            <Tag color="gold" className="!m-0">
              Tăng cường ca ngày
            </Tag>
          );
        if (record.is_schedule_change)
          return (
            <Tag color="warning" className="!m-0">
              {displayDayType}
            </Tag>
          );
        if (displayDayType === 'Ca ngày')
          return (
            <Tag color="processing" className="!m-0">
              Ca ngày
            </Tag>
          );
        if (displayDayType === 'Ca đêm')
          return (
            <Tag color="purple" className="!m-0">
              Ca đêm
            </Tag>
          );
        if (displayDayType === 'Nghỉ nửa ngày')
          return (
            <Tag color="red" className="!m-0">
              Nghỉ nửa ngày
            </Tag>
          );
        return (
          <Tag color="success" className="!m-0">
            Nghỉ
          </Tag>
        );
      }
    },
    {
      title: 'Tổng giờ',
      dataIndex: 'total_hours',
      key: 'total_hours',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.total_hours || 0) - (b.total_hours || 0),
      render: (v, record) => {
        if (!record.shift) return <span className="text-gray-300">-</span>;
        return v ? (
          <span className="font-semibold">{v}h</span>
        ) : isCurrentAttendanceDate(record.date) ? (
          <span className="text-gray-400">—</span>
        ) : (
          <Tooltip title="Chấm công chưa đủ">
            <Tag color="error" className="!m-0 cursor-help">
              Thiếu
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Giờ chính',
      dataIndex: 'administrative_hours',
      key: 'administrative_hours',
      width: 100,
      align: 'center',
      render: (_v, record) => {
        if (!record.shift) return <span className="text-gray-300">-</span>;
        const displayHours = getDisplayAdministrativeHours(record);
        return displayHours ? (
          <span className="font-medium text-violet-600">{displayHours}h</span>
        ) : isAdditionalShift(record.hnhc) ||
          isCurrentAttendanceDate(record.date) ? (
          <span className="text-gray-300">-</span>
        ) : (
          <Tooltip title="Chấm công chưa đủ">
            <Tag color="error" className="!m-0 cursor-help">
              Thiếu
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Tăng ca',
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      width: 220,
      align: 'center',
      sorter: (a, b) => getDisplayOvertimeHours(a) - getDisplayOvertimeHours(b),
      render: (_v, record) => {
        const displayHours = getDisplayOvertimeHours(record);
        return (
          <div>
            <span className="font-semibold text-amber-600">
              {displayHours || '—'}h
            </span>
            <OvertimeApprovalStatus
              date={record.date}
              hours={displayHours}
              approval={record.overtime_approval}
            />
          </div>
        );
      }
    }
  ];

  // ── History columns ────────────────────────────────────────────────────
  const historyColumns: TableColumnsType<AttendanceResponse> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      width: 50,
      render: (_v, _r, i) => i + 1
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => fmtDate(v)
    },
    {
      title: 'Thứ',
      dataIndex: 'date',
      key: 'weekday',
      width: 120,
      render: (v) => (
        <span className="text-gray-500 capitalize">{fmtWeekday(v)}</span>
      )
    },
    {
      title: 'Ca làm việc',
      dataIndex: 'hnhc',
      key: 'hnhc',
      width: 180,
      align: 'center',
      render: (v: CalculatedRow['hnhc']) => {
        if (!v) {
          return <span className="text-gray-300">-</span>;
        }

        const display = hnhcDisplayMap[v];

        return display ? (
          <Tag color={display.color} className="!m-0">
            <span className="font-semibold">{display.code}</span>
            <span className="ml-1">{display.label}</span>
          </Tag>
        ) : (
          <span className="text-gray-300">-</span>
        );
      }
    },
    {
      title: 'Số lần quẹt',
      key: 'scan_count',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const sameDateEntries =
          record.dates?.filter((d) => d.date === record.date) ?? [];
        return (
          <span className="inline-flex min-w-8 justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
            {sameDateEntries.length}
          </span>
        );
      }
    },
    {
      title: 'Thời gian quẹt',
      key: 'scan_times',
      render: (_, record) => {
        const sameDateEntries =
          record.dates?.filter((d) => d.date === record.date) ?? [];
        return sameDateEntries.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {sameDateEntries.map((d, idx) => (
              <Tag
                key={idx}
                color="cyan"
                className="!m-0 !rounded-full !px-2 !text-xs"
              >
                {fmtTime(d.datetime)}
              </Tag>
            ))}
          </div>
        ) : (
          <span className="text-gray-300">Không có dữ liệu</span>
        );
      }
    }
  ];

  // ── Table props ────────────────────────────────────────────────────────
  const calcTableProps: TableProps<CalculatedRow> = {
    ...(customTableProps as unknown as TableProps<CalculatedRow>),
    rowKey: (r) => `calc-${r.employee_id}-${r.date}`,
    columns: calcColumns,
    dataSource: filteredCalcData,
    loading: calcLoading,
    pagination: false,
    rowClassName: (record) => {
      if (
        !isCurrentAttendanceDate(record.date) &&
        record.shift > 0 &&
        (!record.time_in ||
          !record.time_out ||
          record.time_in === '' ||
          record.time_out === '')
      ) {
        return '!bg-rose-50/60';
      }
      return '';
    }
  };

  const historyTableProps: TableProps<AttendanceResponse> = {
    ...(customTableProps as unknown as TableProps<AttendanceResponse>),
    rowKey: (r) => `hist-${r.employee_id}-${r.date}`,
    columns: historyColumns,
    dataSource: historyData,
    loading: historyLoading,
    pagination: false
  };

  // ── Month change handler ───────────────────────────────────────────────
  const handleMonthChange = (date: Dayjs | null) => {
    const d = date || getAttendanceWindow().month;
    setMonth(d);
    setHistoryParams((prev) => ({
      ...prev,
      'filter[date_between]': getDateRange(d, cycleMode)
    }));
  };

  const handleCycleModeChange = (mode: 'month' | 'payroll') => {
    setCycleMode(mode);
    setHistoryParams((prev) => ({
      ...prev,
      'filter[date_between]': getDateRange(month, mode)
    }));
  };

  // Label for current range
  const rangeLabel = useMemo(() => {
    if (cycleMode === 'payroll') {
      return clampAttendanceRange(
        month.subtract(1, 'month').date(16),
        month.date(15)
      )
        .split(',')
        .map((date) => dayjs(date).format('DD/MM'))
        .join(' → ');
    }
    return month.format('MM/YYYY');
  }, [month, cycleMode]);

  return (
    <>
      <BackButton to="/" />
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FiCalendar className="text-blue-500" />
            <span>Chấm công của tôi</span>
          </div>
        }
      >
        {/* ── Header Block: Filters + Controls ─────────────────────────── */}
        <p className="text-sm text-gray-500">
          Chỉ xem 3 tháng gần nhất:{' '}
          {getAttendanceWindow().start.format('MM/YYYY')} –{' '}
          {getAttendanceWindow().end.format('MM/YYYY')}. Kỳ 16→15 chỉ lấy phần
          nằm trong khoảng này.
        </p>
        <div data-tour="attendance-filters">
          {isMobile ? (
            <div className="space-y-2">
              {/* Row 1: Month picker + forgotten switch */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <DatePicker
                    id="att-month-picker"
                    disabledDate={isOutsideAttendanceWindow}
                    placeholder="Chọn tháng"
                    value={month}
                    picker="month"
                    format="MM/YYYY"
                    inputReadOnly={false}
                    onChange={handleMonthChange}
                    allowClear={false}
                    style={{ width: 110 }}
                    size="small"
                  />
                  <Segmented
                    size="small"
                    value={cycleMode}
                    onChange={(v) =>
                      handleCycleModeChange(v as 'month' | 'payroll')
                    }
                    options={[
                      { value: 'month', label: 'Theo tháng' },
                      { value: 'payroll', label: 'Theo kỳ công' }
                    ]}
                  />
                </div>
                {cycleMode === 'payroll' && (
                  <div className="order-last w-full text-xs text-gray-500">
                    Kỳ công: {rangeLabel}
                  </div>
                )}
                {activeTab === 'calculate' && (
                  <label
                    data-tour="attendance-forgotten"
                    htmlFor="att-forgotten-switch"
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 select-none"
                  >
                    <Switch
                      id="att-forgotten-switch"
                      aria-label="Lọc ngày quên chấm công"
                      size="small"
                      checked={forgottenDays}
                      onChange={setForgottenDays}
                    />
                    <FiAlertTriangle
                      size={13}
                      className={
                        forgottenDays ? 'text-rose-500' : 'text-gray-400'
                      }
                    />
                  </label>
                )}
              </div>
              {/* Row 2: Tabs full width */}
              <Segmented
                block
                value={activeTab}
                onChange={(v) => setActiveTab(v as ActiveTab)}
                options={[
                  {
                    value: 'calculate',
                    label: (
                      <div className="flex items-center justify-center gap-1.5">
                        <FiActivity size={14} />
                        <span>Bảng tính công</span>
                      </div>
                    )
                  },
                  {
                    value: 'history',
                    label: (
                      <div className="flex items-center justify-center gap-1.5">
                        <FiClock size={14} />
                        <span>Lịch sử quẹt</span>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/30">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <label
                    htmlFor="att-month-picker"
                    className="text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Tháng:
                  </label>
                  <DatePicker
                    id="att-month-picker"
                    disabledDate={isOutsideAttendanceWindow}
                    placeholder="Chọn tháng"
                    value={month}
                    picker="month"
                    format="MM/YYYY"
                    inputReadOnly={false}
                    onChange={handleMonthChange}
                    allowClear={false}
                    style={{ width: 140 }}
                  />
                  <Segmented
                    size="small"
                    value={cycleMode}
                    onChange={(v) =>
                      handleCycleModeChange(v as 'month' | 'payroll')
                    }
                    options={[
                      { value: 'month', label: 'Theo tháng' },
                      { value: 'payroll', label: 'Theo kỳ công' }
                    ]}
                  />
                  {cycleMode === 'payroll' && (
                    <span className="text-xs text-gray-400">
                      Kỳ công: {rangeLabel}
                    </span>
                  )}
                </div>
                <Segmented
                  value={activeTab}
                  onChange={(v) => setActiveTab(v as ActiveTab)}
                  options={[
                    {
                      value: 'calculate',
                      label: (
                        <div className="flex items-center gap-1.5 px-1">
                          <FiActivity />
                          <span>Bảng tính công</span>
                        </div>
                      )
                    },
                    {
                      value: 'history',
                      label: (
                        <div className="flex items-center gap-1.5 px-1">
                          <FiClock />
                          <span>Lịch sử quẹt</span>
                        </div>
                      )
                    }
                  ]}
                />
                {activeTab === 'calculate' && (
                  <div
                    data-tour="attendance-forgotten"
                    className="ml-auto flex items-center gap-2"
                  >
                    <Switch
                      id="att-forgotten-switch-desktop"
                      aria-label="Lọc ngày quên chấm công"
                      size="small"
                      checked={forgottenDays}
                      onChange={setForgottenDays}
                    />
                    <label
                      htmlFor="att-forgotten-switch-desktop"
                      className="flex cursor-pointer items-center gap-1 text-sm text-gray-500 select-none"
                    >
                      <FiAlertTriangle
                        className={
                          forgottenDays ? 'text-rose-500' : 'text-gray-400'
                        }
                      />
                      Quên chấm công
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* ── Summary Stats (calculate tab only) ──────────────────────── */}
        {activeTab === 'calculate' && !calcLoading && calcData.length > 0 && (
          <div data-tour="attendance-summary">
            <SummaryStats data={calcData} isMobile={isMobile} />
          </div>
        )}

        {/* ── Data Area ───────────────────────────────────────────────── */}
        {activeTab === 'calculate' ? (
          isMobile ? (
            <Spin spinning={calcLoading}>
              {filteredCalcData.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {filteredCalcData.map((item) => (
                    <MobileCalculateRow
                      key={`m-calc-${item.employee_id}-${item.date}`}
                      item={item}
                    />
                  ))}
                </div>
              ) : (
                <Empty description="Không có dữ liệu" />
              )}
            </Spin>
          ) : (
            <Table {...calcTableProps} />
          )
        ) : isMobile ? (
          <Spin spinning={historyLoading}>
            {historyData.length > 0 ? (
              <div className="flex flex-col gap-2">
                {historyData.map((item) => (
                  <MobileHistoryRow
                    key={`m-hist-${item.employee_id}-${item.date}`}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <Empty description="Không có dữ liệu" />
            )}
          </Spin>
        ) : (
          <Table {...historyTableProps} />
        )}
      </ComponentCard>
    </>
  );
};
