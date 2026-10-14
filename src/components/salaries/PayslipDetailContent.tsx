import { SalaryDetailTableType } from '@/types/salaryType';
import { PayrollSnapshotPayslip } from './PayrollSnapshot';
import { convertNumberToWords } from '@utils/number2Word';
import { Alert, Spin, Tag, Statistic } from 'antd';
import dayjs from 'dayjs';
import { FaUser, FaCalendarAlt, FaBriefcase, FaClock } from 'react-icons/fa';
import {
  SalaryTable,
  SalaryTableType
} from '@components/salaries/PayslipBreakdownTable';
import { usePayslipTemplate } from '@components/salaries/payslipTemplate';
import { useQuery } from '@tanstack/react-query';
import { fetchEmpAttendances } from '@services/AttendanceService';
import { useMemo } from 'react';

const formatHours = (value: number) =>
  (Math.round(value * 100) / 100).toLocaleString('vi-VN', {
    maximumFractionDigits: 2
  });

const accentStyles = {
  blue: {
    header:
      'border-blue-100 from-blue-50 to-indigo-50 dark:border-blue-900 dark:from-blue-950/30 dark:to-indigo-950/20',
    icon: 'text-blue-500',
    net: 'border-blue-200 from-blue-50 to-indigo-50 dark:border-blue-900 dark:from-blue-950/30 dark:to-indigo-950/20',
    divide: 'divide-blue-100 dark:divide-blue-800',
    tag: 'blue'
  },
  emerald: {
    header:
      'border-emerald-100 from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/20',
    icon: 'text-emerald-500',
    net: 'border-emerald-200 from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/20',
    divide: 'divide-emerald-100 dark:divide-emerald-800',
    tag: 'green'
  },
  slate: {
    header:
      'border-slate-200 from-slate-50 to-gray-50 dark:border-slate-700 dark:from-slate-900/60 dark:to-gray-900/40',
    icon: 'text-slate-500',
    net: 'border-slate-200 from-slate-50 to-gray-50 dark:border-slate-700 dark:from-slate-900/60 dark:to-gray-900/40',
    divide: 'divide-slate-200 dark:divide-slate-700',
    tag: 'default'
  },
  rose: {
    header:
      'border-rose-100 from-rose-50 to-pink-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-pink-950/20',
    icon: 'text-rose-500',
    net: 'border-rose-200 from-rose-50 to-pink-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-pink-950/20',
    divide: 'divide-rose-100 dark:divide-rose-800',
    tag: 'magenta'
  }
} as const;

function AttendanceComparisonWidget({
  startDate,
  endDate
}: {
  startDate: string;
  endDate: string;
}) {
  const { data: calcResponse, isLoading } = useQuery({
    queryKey: ['emp-attendance-comparison', startDate, endDate],
    queryFn: async () => {
      return await fetchEmpAttendances({
        include_calculation: 1,
        limit: 0,
        'filter[date_between]': `${startDate},${endDate}`
      });
    },
    enabled: !!startDate && !!endDate
  });

  const stats = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (calcResponse?.data || []) as any[];
    const workDays = data.filter(
      (d) =>
        d.shift > 0 &&
        !!d.time_in &&
        !!d.time_out &&
        d.time_in !== '' &&
        d.time_out !== ''
    ).length;
    const adminHours = data.reduce(
      (s, d) =>
        s +
        (d.hnhc === 'TC' || d.hnhc === 'LN' ? 0 : d.administrative_hours || 0),
      0
    );
    const otHours = data.reduce(
      (s, d) =>
        s +
        (d.hnhc === 'TC' || d.hnhc === 'LN'
          ? d.total_hours || 0
          : d.overtime_hours || 0),
      0
    );
    const totalHours = adminHours + otHours;
    return { workDays, totalHours, otHours, adminHours };
  }, [calcResponse]);

  if (!startDate || !endDate) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
      <h3 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <FaClock />
        Tổng kết chấm công theo lương
        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
          (Từ {dayjs(startDate).format('DD/MM/YYYY')} đến{' '}
          {dayjs(endDate).format('DD/MM/YYYY')})
        </span>
      </h3>
      {isLoading ? (
        <div className="flex w-full justify-center p-4">
          <Spin />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900/30 dark:bg-blue-900/10">
              <Statistic
                title={
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Ngày đi làm
                  </span>
                }
                value={stats.workDays}
                suffix={<span className="text-[11px]">&nbsp;ngày</span>}
                valueStyle={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#2563eb'
                }}
              />
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-900/10">
              <Statistic
                title={
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Tổng giờ làm = giờ chính + tăng ca
                  </span>
                }
                value={formatHours(stats.totalHours)}
                suffix={<span className="text-[11px]">&nbsp;h</span>}
                valueStyle={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#059669'
                }}
              />
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 dark:border-purple-900/30 dark:bg-purple-900/10">
              <Statistic
                title={
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Giờ chính
                  </span>
                }
                value={formatHours(stats.adminHours)}
                suffix={<span className="text-[11px]">&nbsp;h</span>}
                valueStyle={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#7c3aed'
                }}
              />
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-900/10">
              <Statistic
                title={
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Tăng ca
                  </span>
                }
                value={formatHours(stats.otHours)}
                suffix={<span className="text-[11px]">&nbsp;h</span>}
                valueStyle={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#d97706'
                }}
              />
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
            <strong>Lưu ý:</strong> Không lấy <strong>“Số giờ chính”</strong> để
            so với <strong>“Tổng giờ làm”</strong> vì tổng giờ đã bao gồm{' '}
            <strong>Giờ chính</strong> và <strong>Tăng ca</strong>. Số công chỉ
            tính theo các ngày đã chấm công đầy đủ, vui lòng kiểm tra chấm công
            trước khi khiếu nại.
          </div>
        </>
      )}
    </div>
  );
}

interface PayslipDetailContentProps {
  salaryDetails: SalaryDetailTableType | null | undefined;
  isLoading: boolean;
  error: unknown;
  showAttendanceComparison?: boolean;
}

export const PayslipDetailContent = ({
  salaryDetails,
  isLoading,
  error,
  showAttendanceComparison = true
}: PayslipDetailContentProps) => {
  const template = usePayslipTemplate();
  const accent = accentStyles[template.accent];
  const sectionGap = template.compact ? 'space-y-3' : 'space-y-5';
  const sectionPadding = template.compact ? 'p-3' : 'p-4';
  const { employee, salary_manager } = salaryDetails || {};

  const incomeData: SalaryTableType[] = [
    {
      key: 'day_shift_trial',
      description: 'Lương ca ngày (thử việc)',
      hours: salaryDetails?.number_of_work_days_trial || 0,
      amount: salaryDetails?.day_shift_salary_trial || 0,
      note: salaryDetails?.day_shift_salary_trial_notice || null
    },
    {
      key: 'night_shift_trial',
      description: 'Lương ca đêm (thử việc)',
      hours: salaryDetails?.number_of_work_nights_trial || 0,
      amount: salaryDetails?.night_shift_salary_trial || 0,
      note: salaryDetails?.night_shift_salary_trial_notice || null
    },
    {
      key: 'overtime_trial',
      description: 'Lương tăng ca (thử việc)',
      hours: salaryDetails?.overtime_hours_trial || 0,
      amount: salaryDetails?.overtime_salary_trial || 0,
      note: salaryDetails?.overtime_salary_trial_notice || null
    },
    {
      key: 'allowance_apprentice',
      description: 'Phụ cấp học việc',
      hours: salaryDetails?.number_of_work || 0,
      amount: salaryDetails?.allowance_apprentice_detail || 0,
      note: salaryDetails?.allowance_apprentice_detail_notice || null
    },
    {
      key: 'core_hours',
      description: 'Lương căn bản',
      hours: salaryDetails?.core_hours || 0,
      amount: salaryDetails?.official_salary || 0,
      note: salaryDetails?.official_salary_notice || null
    },
    {
      key: 'allowance_diligence',
      description: 'Chuyên cần',
      hours: 0,
      amount: salaryDetails?.allowance_diligence_detail || 0,
      note: salaryDetails?.allowance_diligence_detail_notice || null
    },
    {
      key: 'allowance_professional_detail',
      description: 'Chuyên môn',
      hours: 0,
      amount: salaryDetails?.allowance_professional_detail || 0,
      note: salaryDetails?.allowance_professional_detail_notice || null
    },
    {
      key: 'allowance_responsibility',
      description: 'Trách nhiệm',
      hours: 0,
      amount: salaryDetails?.allowance_responsibility_detail || 0,
      note: salaryDetails?.allowance_responsibility_detail_notice || null
    },
    {
      key: 'overtime_detail',
      description: 'Lương tăng ca',
      hours: salaryDetails?.overtime_hours_detail || 0,
      amount: salaryDetails?.overtime_salary || 0,
      note: salaryDetails?.overtime_salary_notice || null
    },
    {
      key: 'reinforcement_salary',
      description: 'Lương tăng cường',
      hours: salaryDetails?.reinforcement_hours_detail || 0,
      amount: salaryDetails?.reinforcement_salary || 0,
      note: salaryDetails?.reinforcement_salary_notice || null
    },
    {
      key: 'allowance_rice',
      description: 'Phụ cấp cơm ca ngày',
      hours: salaryDetails?.number_of_work_days || 0,
      amount: salaryDetails?.allowance_rice_detail || 0,
      note: salaryDetails?.allowance_rice_detail_notice || null
    },
    {
      key: 'allowance_shift_night',
      description: 'Phụ cấp ca đêm',
      hours: salaryDetails?.number_of_work_nights || 0,
      amount: salaryDetails?.allowance_shift_night || 0,
      note: salaryDetails?.allowance_shift_night_notice || null
    },
    {
      key: 'allowance_overtime',
      description: 'Phụ cấp tăng ca',
      hours: salaryDetails?.overtime_day_count_detail || 0,
      amount: salaryDetails?.allowance_overtime_detail || 0,
      note: salaryDetails?.allowance_overtime_detail_notice || null
    },
    {
      key: 'holidays_money',
      description: 'Tiền lễ tết',
      hours: salaryDetails?.holidays_count_detail || 0,
      amount: salaryDetails?.holidays_money || 0,
      note: salaryDetails?.holidays_money_notice || null
    },
    {
      key: 'paid_holidays_money',
      description: 'Tiền phép năm',
      hours: salaryDetails?.paid_holidays_count_detail || 0,
      amount: salaryDetails?.paid_holidays_money || 0,
      note: salaryDetails?.paid_holidays_money_notice || null
    },
    {
      key: 'gcn_business_travel_salary',
      description: 'Lương đi công tác GCN',
      hours: salaryDetails?.business_travel_hours || 0,
      amount: salaryDetails?.gcn_business_travel_salary || 0,
      note: salaryDetails?.gcn_business_travel_salary_notice || null
    },
    {
      key: 'allowance_gcn_business_fuel',
      description: 'Phụ cấp xăng đi GCN',
      hours: salaryDetails?.number_of_business_trips || 0,
      amount: salaryDetails?.allowance_gcn_business_fuel || 0,
      note: salaryDetails?.allowance_gcn_business_fuel_notice || null
    },
    {
      key: 'money_referral_people',
      description: 'Tiền giới thiệu người',
      hours: 0,
      amount: salaryDetails?.money_referral_people || 0,
      note: salaryDetails?.money_referral_people_notice || null
    },
    {
      key: 'allowance_diffrent',
      description: 'Phụ cấp khác',
      hours: 0,
      amount: salaryDetails?.allowance_diffrent || 0,
      note: salaryDetails?.allowance_diffrent_notice || null
    },
    {
      key: 'bonuses_for_attendance',
      description: 'Tiền thưởng đạt chuyên cần',
      hours: 0,
      amount: salaryDetails?.bonuses_for_attendance || 0,
      note: salaryDetails?.bonuses_for_attendance_notice || null
    },
    {
      key: 'kpi_refund_prev_month',
      description: 'Hoàn tiền KPI tháng trước',
      hours: 0,
      amount: salaryDetails?.previous_month_kpi_refund || 0,
      note: salaryDetails?.previous_month_kpi_refund_notice || null
    },
    {
      key: 'birthday_money',
      description: 'Tiền sinh nhật',
      hours: 0,
      amount: salaryDetails?.birthday_money || 0,
      note: salaryDetails?.birthday_money_notice || null
    },
    {
      key: 'previous_period_debt',
      description: 'Bù tiền thiếu tháng trước',
      hours: 0,
      amount: salaryDetails?.previous_period_debt || 0,
      note: salaryDetails?.previous_period_debt_notice || null
    },
    {
      key: 'total_income',
      description: 'Tổng thu nhập',
      hours: 0,
      amount: salaryDetails?.total_income || 0,
      note: null
    }
  ];

  const unionFeeAmount =
    salaryDetails?.union_fee ??
    salaryDetails?.unicon_deduction ??
    salaryDetails?.subtract_of_violations ??
    0;
  const unionFeeNote =
    salaryDetails?.union_fee_notice ??
    salaryDetails?.unicon_deduction_notice ??
    salaryDetails?.subtract_of_violations_notice ??
    null;

  const totalReduction =
    unionFeeAmount +
    (salaryDetails?.insurance_detail || 0) +
    (salaryDetails?.advance_money || 0) +
    (salaryDetails?.subtract_daysleave_allowed || 0) +
    (salaryDetails?.subtract_daysleave_notallowed || 0) +
    (salaryDetails?.subtract_error_serious || 0) +
    (salaryDetails?.subtract_error_minor || 0) +
    (salaryDetails?.kpi_subtraction || 0);
  const violationCount = salaryDetails?.number_of_violations || 0;
  const violationMeta =
    violationCount > 0 && violationCount <= 100
      ? `${violationCount.toLocaleString('vi-VN')} lần vi phạm`
      : null;

  const deductionData: SalaryTableType[] = [
    {
      key: 'insurance_detail',
      description: 'Khấu trừ BHXH (10.5%)',
      hours: 0,
      amount: salaryDetails?.insurance_detail || 0,
      note: salaryDetails?.insurance_detail_notice || null
    },
    {
      key: 'advance_money',
      description: 'Tạm ứng',
      hours: 0,
      amount: salaryDetails?.advance_money || 0,
      note: salaryDetails?.advance_money_notice || null
    },
    {
      key: 'unicon_deduction',
      description: 'Khấu trừ Công đoàn (0.5%)',
      hours: 0,
      amount: unionFeeAmount,
      note: unionFeeNote,
      meta: violationMeta
    },
    {
      key: 'subtract_daysleave_allowed',
      description: 'Nghỉ có phép',
      hours: 0,
      amount: salaryDetails?.subtract_daysleave_allowed || 0,
      note: salaryDetails?.subtract_daysleave_allowed_notice || null,
      meta: salaryDetails?.daysleave_allowed
        ? `${salaryDetails.daysleave_allowed.toLocaleString('vi-VN')} ngày`
        : null
    },
    {
      key: 'subtract_daysleave_notallowed',
      description: 'Nghỉ không phép',
      hours: 0,
      amount: salaryDetails?.subtract_daysleave_notallowed || 0,
      note: salaryDetails?.subtract_daysleave_notallowed_notice || null,
      meta: salaryDetails?.daysleave_notallowed
        ? `${salaryDetails.daysleave_notallowed.toLocaleString('vi-VN')} ngày`
        : null
    },
    {
      key: 'subtract_error_serious',
      description: 'Lỗi nặng',
      hours: 0,
      amount: salaryDetails?.subtract_error_serious || 0,
      note: salaryDetails?.subtract_error_serious_notice || null,
      meta: salaryDetails?.error_serious
        ? `${salaryDetails.error_serious.toLocaleString('vi-VN')} lỗi`
        : null
    },
    {
      key: 'subtract_error_minor',
      description: 'Lỗi nhẹ',
      hours: 0,
      amount: salaryDetails?.subtract_error_minor || 0,
      note: salaryDetails?.subtract_error_minor_notice || null,
      meta: salaryDetails?.error_minor
        ? `${salaryDetails.error_minor.toLocaleString('vi-VN')} lỗi`
        : null
    },
    {
      key: 'kpi_subtraction',
      description: 'Bị trừ KPI tháng này',
      hours: 0,
      amount: salaryDetails?.kpi_subtraction || 0,
      note: salaryDetails?.kpi_subtraction_notice || null
    },
    {
      key: 'totalReduction',
      description: 'Tổng trừ',
      hours: 0,
      amount: totalReduction || 0,
      note: null
    }
  ];

  const formsOfPayment = salaryDetails?.forms_of_payment || 'Chưa có thông tin';
  const actuallyReceived = salaryDetails?.actually_received || 0;
  const totalIncome = salaryDetails?.total_income || 0;
  const companyInsuranceDetail = salaryDetails?.company_insurance_detail || 0;
  const unionDeduction = unionFeeAmount;
  const totalSalary = totalIncome + unionDeduction * 4 + companyInsuranceDetail;

  const otherNotes = '......';

  if (!isLoading && !error && salaryDetails?.payroll_row && salary_manager) {
    return (
      <PayrollSnapshotPayslip
        row={salaryDetails.payroll_row}
        startDate={salary_manager.start_date}
        endDate={salary_manager.end_date}
      />
    );
  }

  return (
    <div className={sectionGap}>
      {/* ── Error Alert ──────────────────────────────────────── */}
      {!!error && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <Alert
            type="warning"
            showIcon
            message="Bạn không có bảng lương này hoặc bảng lương đã bị xóa"
          />
        </div>
      )}

      <Spin spinning={isLoading}>
        <div className={sectionGap}>
          {/* ── Header Info ────────────────────────────────── */}
          {template.sections.header && (
            <div
              className={`rounded-xl border bg-gradient-to-br text-center ${template.compact ? 'p-4' : 'p-5'} ${accent.header}`}
            >
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {template.title || 'Thông tin bảng lương'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                <FaCalendarAlt className={`mr-1 inline-block ${accent.icon}`} />
                Từ {dayjs(salary_manager?.start_date).format(
                  'DD/MM/YYYY'
                )} đến {dayjs(salary_manager?.end_date).format('DD/MM/YYYY')}
              </p>
            </div>
          )}

          {/* ── Employee Info ──────────────────────────────── */}
          {template.sections.employeeInfo && (
            <div
              className={`rounded-xl border border-gray-100 bg-white/80 ${sectionPadding} backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50`}
            >
              <div className={template.compact ? 'space-y-1' : 'space-y-2'}>
                <div className="flex flex-wrap items-center gap-2">
                  <FaUser className={`flex-shrink-0 ${accent.icon}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tên nhân viên:
                  </span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {employee?.name || 'Chưa có thông tin'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag color={accent.tag} className="!font-mono !text-xs">
                    {employee?.id || '---'}
                  </Tag>
                  <span className="text-sm text-gray-500">Mã nhân viên</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FaBriefcase className="flex-shrink-0 text-emerald-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bộ phận:
                  </span>
                  <Tag color="geekblue">
                    {employee?.role?.role_name || 'Chưa có thông tin'}
                  </Tag>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FaCalendarAlt className="flex-shrink-0 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ngày nhận lương:
                  </span>
                  <Tag color="green">
                    {dayjs(salary_manager?.date_show).format('DD/MM/YYYY')}
                  </Tag>
                </div>
              </div>
            </div>
          )}

          {/* ── Attendance Comparison ─────────────────────── */}
          {template.sections.attendanceComparison &&
            showAttendanceComparison &&
            salary_manager?.start_date &&
            salary_manager?.end_date && (
              <AttendanceComparisonWidget
                startDate={salary_manager.start_date}
                endDate={salary_manager.end_date}
              />
            )}

          {/* ── Income Table ──────────────────────────────── */}
          {template.sections.income && (
            <div
              className={`rounded-xl border border-emerald-100 bg-white/80 ${sectionPadding} backdrop-blur-sm dark:border-emerald-900/50 dark:bg-gray-800/50`}
            >
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                I. Các khoản lương thu nhập
              </h3>
              <SalaryTable data={incomeData} variant="income" />
            </div>
          )}

          {/* ── Deduction Table ───────────────────────────── */}
          {template.sections.deductions && (
            <div
              className={`rounded-xl border border-red-100 bg-white/80 ${sectionPadding} backdrop-blur-sm dark:border-red-900/50 dark:bg-gray-800/50`}
            >
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                II. Các khoản giảm trừ
              </h3>
              <SalaryTable data={deductionData} variant="deduction" />
            </div>
          )}

          {/* ── III. Tổng chi trả ─────────────────────────── */}
          {template.sections.companyCost && (
            <div
              className={`rounded-xl border border-amber-100 bg-white/80 ${sectionPadding} backdrop-blur-sm dark:border-amber-900/50 dark:bg-gray-800/50`}
            >
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                III. Tổng chi trả tháng{' '}
                {dayjs(salary_manager?.end_date).format('MM/YYYY')}
              </h3>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <div className="flex items-start justify-between gap-2 py-3 first:pt-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="mr-1.5 inline-block min-w-[18px] text-center font-mono text-xs text-gray-400">
                      1.
                    </span>
                    Công ty phải đóng BHXH 21,5% cho người lao động:
                  </span>
                  <span className="flex-shrink-0 text-right text-sm font-semibold text-blue-600">
                    {companyInsuranceDetail.toLocaleString('en-US', {
                      maximumFractionDigits: 0
                    })}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 py-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="mr-1.5 inline-block min-w-[18px] text-center font-mono text-xs text-gray-400">
                      2.
                    </span>
                    Công ty phải đóng Kinh phí công đoàn 2% cho người lao động:
                  </span>
                  <span className="flex-shrink-0 text-right text-sm font-semibold text-blue-600">
                    {(unionDeduction * 4).toLocaleString('en-US', {
                      maximumFractionDigits: 0
                    })}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 border-t-2 border-gray-300 pt-3 dark:border-gray-600">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    Tổng chi
                  </span>
                  <span className="flex-shrink-0 text-right text-base font-bold text-red-600">
                    {totalSalary.toLocaleString('en-US', {
                      maximumFractionDigits: 0
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── IV. Thực nhận tiền lương ────────────────────── */}
          {template.sections.netPay && (
            <div
              className={`rounded-xl border bg-gradient-to-br ${sectionPadding} ${accent.net}`}
            >
              <div className={`divide-y ${accent.divide}`}>
                <div className="flex flex-wrap items-center justify-between gap-1 pb-3">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    💰 Thực nhận tiền lương:
                  </span>
                  <span className="text-base font-bold text-emerald-600 sm:text-lg">
                    {actuallyReceived.toLocaleString('en-US', {
                      maximumFractionDigits: 0
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Hình thức:</span>
                    <Tag color="blue" className="!m-0 !text-xs">
                      {formsOfPayment}
                    </Tag>
                  </span>
                </div>
                <div className="pt-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ➡️ Bằng chữ:{' '}
                  </span>
                  <span className="text-sm text-gray-700 italic dark:text-gray-300">
                    {convertNumberToWords(actuallyReceived)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Notes ────────────────────────────────────── */}
          {template.sections.notes && (
            <div
              className={`rounded-xl border border-gray-100 bg-white/80 ${sectionPadding} backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50`}
            >
              <strong className="text-sm text-gray-700 dark:text-gray-300">
                📝 Ghi chú:
              </strong>
              <span className="ml-1 text-sm text-gray-500">{otherNotes}</span>
            </div>
          )}
        </div>
      </Spin>
    </div>
  );
};
