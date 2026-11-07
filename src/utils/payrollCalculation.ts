import type { AttendanceResult } from './attendanceUtil';
import { resolveSnapshotProfile } from './payrollSnapshotProfile';

export interface PayrollProfile {
  employeeId: string;
  attendanceEmployeeId?: string;
  company?: string;
  name: string;
  department: string;
  bankAccount: string;
  bankBin?: string;
  basicSalary: number;
  responsibility: number;
  housingPerDay: number;
  travelPerDay: number;
  mealPerDay: number;
  diligence: number;
  insuranceBase: number;
  unionBase: number;
  dependents: number;
  legacySalary26Days?: number;
}

export interface PayrollAttendanceOverride {
  date: string;
  day: number;
  night: number;
  overtime: number;
  overtimeShift: 1 | 2;
}

export interface PayrollAdjustments {
  /** Period-specific inputs. Missing means calculate normally; zero is explicit. */
  calculation?: PayrollPeriodInputs;
  attendanceOverrides?: PayrollAttendanceOverride[];
  holidayDays: number;
  paidLeaveDays: number;
  authorizedLeaveDays?: number;
  unauthorizedLeaveDays?: number;
  downtimeDays: number;
  menstrualHours: number;
  diligence: number;
  bonus: number;
  referral: number;
  otherIncome: number;
  taxExemptIncome: number;
  advance: number;
  otherDeduction: number;
  noAttendanceConfirmed: boolean;
  note: string;
}

export const payrollPeriodInputKeys = [
  'dayDays',
  'nightDays',
  'dayRate',
  'nightRate',
  'dayOvertimeHours',
  'nightOvertimeHours',
  'mainReinforcementHours',
  'mainReinforcementHourlyRate',
  'housingPerDay',
  'travelPerDay',
  'mealPerDay',
  'downtimeDailyRate',
  'holidayDailyRate',
  'paidLeaveDailyRate',
  'menstrualHourlyRate',
  'unionBase',
  'insuranceBase',
  'personalDeduction',
  'dependentDeduction',
  'taxable',
  'diligence',
  'cashOvertimeHours',
  'cashOvertimeBase',
  'cashAnnualLeaveDays',
  'cashAnnualLeaveBase',
  'cashDowntime',
  'cashOtherIncome',
  'cashReinforcementHours',
  'cashReinforcementHourlyRate',
  'cashMeal',
  'cashOvertimeAllowance',
  'cashHousing',
  'cashTravel'
] as const;

export type PayrollPeriodInputs = Partial<
  Record<(typeof payrollPeriodInputKeys)[number], number>
>;

export interface PayrollSource {
  file: string;
  sheet: string;
  row: number;
  employeeCode: string;
  /** Exact source inputs/formulas, retained for reconciliation, never executed. */
  cells: Record<string, { value: string | number | null; formula?: string }>;
}

export interface PayrollRules {
  standardDays: number;
  hoursPerDay: number;
  nightMultiplier: number;
  dayOvertimeMultiplier: number;
  nightOvertimeMultiplier: number;
  reinforcementMultiplier: number;
  socialRate: number;
  healthRate: number;
  unemploymentRate: number;
  unionRate: number;
  personalDeduction: number;
  dependentDeduction: number;
}

// Starting values from the supplied VVP template, not a universal payroll policy.
export const defaultPayrollRules: PayrollRules = {
  standardDays: 25,
  hoursPerDay: 8,
  nightMultiplier: 1.3,
  dayOvertimeMultiplier: 1.5,
  nightOvertimeMultiplier: 1.7,
  reinforcementMultiplier: 2,
  socialRate: 0.08,
  healthRate: 0.015,
  unemploymentRate: 0.01,
  unionRate: 0.005,
  personalDeduction: 15_500_000,
  dependentDeduction: 6_200_000
};

export const emptyPayrollAdjustments = (): PayrollAdjustments => ({
  holidayDays: 0,
  paidLeaveDays: 0,
  authorizedLeaveDays: 0,
  unauthorizedLeaveDays: 0,
  downtimeDays: 0,
  menstrualHours: 0,
  diligence: 0,
  bonus: 0,
  referral: 0,
  otherIncome: 0,
  taxExemptIncome: 0,
  advance: 0,
  otherDeduction: 0,
  noAttendanceConfirmed: false,
  note: ''
});

export function calculatePayrollDiligence(
  approvedAmount: number,
  authorizedLeaveDays = 0,
  unauthorizedLeaveDays = 0,
  company = 'vvp'
): number {
  // A7A's approved workbook has a different authorized-leave threshold.
  if (company.trim().toLowerCase() === 'a7a') {
    if (authorizedLeaveDays >= 2 || unauthorizedLeaveDays >= 2) return 0;
    return unauthorizedLeaveDays >= 1 ? approvedAmount * 0.5 : approvedAmount;
  }
  if (
    authorizedLeaveDays >= 3 ||
    unauthorizedLeaveDays >= 2 ||
    (authorizedLeaveDays >= 2 && unauthorizedLeaveDays >= 1)
  )
    return 0;
  if (authorizedLeaveDays >= 2 || unauthorizedLeaveDays >= 1)
    return approvedAmount * 0.5;
  return approvedAmount;
}

export interface PayrollHours {
  day: number;
  night: number;
  dayOvertime: number;
  nightOvertime: number;
  reinforcement: number;
  records: number;
}

export interface PayrollRow {
  excelNetBlank?: boolean;
  annualLeaveSalary?: number;
  annualLeaveDays?: number;
  allowanceDays?: number;
  employeeInsurance?: number;
  employerInsurance?: number;
  employerUnion?: number;
  cashSource?: PayrollSource;
  source?: PayrollSource;
  cashReinforcementSalary?: number;
  cashOvertimeSalary?: number;
  cashAnnualLeaveSalary?: number;
  cashTotal?: number;
  profile: PayrollProfile;
  adjustments: PayrollAdjustments;
  hours: PayrollHours;
  dayDays: number;
  nightDays: number;
  daySalary: number;
  nightSalary: number;
  dayOvertimeSalary: number;
  nightOvertimeSalary: number;
  reinforcementSalary: number;
  housing: number;
  travel: number;
  meal: number;
  holidaySalary: number;
  paidLeaveSalary: number;
  downtimeSalary: number;
  menstrualSalary: number;
  /** Monthly diligence after applying authorized/unauthorized leave rule. */
  diligence: number;
  gross: number;
  union: number;
  social: number;
  health: number;
  unemployment: number;
  personalDeduction: number;
  dependentDeduction: number;
  taxable: number;
  tax: number;
  net: number;
}

export interface PayrollDraft {
  importMode?: 'excel-values';
  formulaVersion?: string;
  attendance?: AttendanceResult[];
  /** Unresolved source rows must not be silently merged or included in payment. */
  reconciliation?: {
    sourceTotals: Record<string, number>;
    originalSourceTotals?: Record<string, number>;
    excluded?: {
      source: PayrollSource;
      name: string;
      net: number;
      reason: string;
    }[];
    pending: {
      source: PayrollSource;
      name: string;
      net: number;
      reason: string;
    }[];
  };
  warnings?: string[];
  dataThrough?: string;
  startDate: string;
  endDate: string;
  rules: PayrollRules;
  rows: PayrollRow[];
  issues: string[];
}

const validNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

// Approved default day attendance; explicit period inputs and saved drafts win.
const default22DayEmployeeCodes = new Set(['13001201', '23030102', '23032403']);

export function normalizeEmployeeId(value: string | number) {
  return String(value).trim();
}

// Monthly progressive brackets for resident employment income, tax year 2026.
// https://xaydungchinhsach.chinhphu.vn/huong-dan-quyet-toan-thue-thu-nhap-ca-nhan-doi-voi-thu-nhap-tu-tien-luong-tien-cong-119260306092819051.htm
export function calculateResidentTax2026(taxable: number): number {
  if (!validNumber(taxable)) throw new Error('Thu nhập tính thuế không hợp lệ');
  const brackets = [
    [10_000_000, 0.05],
    [30_000_000, 0.1],
    [60_000_000, 0.2],
    [100_000_000, 0.3],
    [Infinity, 0.35]
  ];
  let tax = 0;
  let previous = 0;
  for (const [ceiling, rate] of brackets) {
    tax += Math.max(0, Math.min(taxable, ceiling) - previous) * rate;
    previous = ceiling;
    if (taxable <= ceiling) break;
  }
  return Math.round(tax);
}

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function calculatePayroll(
  profiles: PayrollProfile[],
  attendance: AttendanceResult[],
  adjustments: Record<string, PayrollAdjustments>,
  rules: PayrollRules,
  startDate: string,
  endDate: string,
  savedHours?: Record<string, PayrollHours>
): PayrollDraft {
  const issues: string[] = [];
  const result: PayrollDraft = {
    formulaVersion: 'excel-2026-10-v2',
    attendance: attendance.map((entry) => ({ ...entry })),
    startDate,
    endDate,
    rules: { ...rules },
    rows: [],
    issues,
    warnings: []
  };
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
    issues.push('Kỳ công không hợp lệ');
    return result;
  }
  if (!startDate.startsWith('2026-') || !endDate.startsWith('2026-')) {
    issues.push('Biểu thuế hiện chỉ hỗ trợ kỳ công trong năm 2026.');
  }
  if ((Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 30) {
    issues.push('Chỉ tính một kỳ lương, tối đa 31 ngày.');
  }
  if (
    Object.values(rules).some((v) => !validNumber(v)) ||
    rules.standardDays <= 0 ||
    rules.hoursPerDay <= 0 ||
    [
      rules.socialRate,
      rules.healthRate,
      rules.unemploymentRate,
      rules.unionRate
    ].some((v) => v > 1)
  ) {
    issues.push(
      'Cấu hình lương không hợp lệ (công/giờ chuẩn phải lớn hơn 0; tỷ lệ từ 0 đến 1).'
    );
    return result;
  }
  if (!profiles.length) issues.push('Chưa có danh mục lương.');
  const profileMap = new Map<string, PayrollProfile>();
  for (const profile of profiles) {
    const id = normalizeEmployeeId(
      profile.attendanceEmployeeId || profile.employeeId
    );
    if (!id || profileMap.has(id))
      issues.push(`Mã nhân viên trống hoặc trùng: ${id}`);
    profileMap.set(id, profile);
  }
  const hours = new Map<string, PayrollHours>();
  const seen = new Set<string>();
  for (const entry of attendance) {
    const id = normalizeEmployeeId(entry.employee_id);
    const overrideProfile = profileMap.get(id);
    if (
      overrideProfile &&
      adjustments[overrideProfile.employeeId]?.attendanceOverrides?.some(
        (item) =>
          item.date === entry.date &&
          item.date >= startDate &&
          item.date <= endDate
      )
    )
      continue;
    const company = entry.company.trim().toLocaleLowerCase('vi');
    if (!['vvp', 'vinh vinh phát', 'a7a'].includes(company)) {
      issues.push(`Không nhận diện công ty của mã ${id}: ${entry.company}`);
      continue;
    }
    const linkedProfile = profileMap.get(id);
    const profileCompany = String(linkedProfile?.company ?? 'vvp')
      .trim()
      .toLocaleLowerCase('vi');
    const expectedCompanies =
      profileCompany === 'a7a' ? ['a7a'] : ['vvp', 'vinh vinh phát'];
    if (!expectedCompanies.includes(company)) {
      issues.push(
        `Sai công ty của mã ${id}: hồ sơ ${linkedProfile?.company ?? 'VVP'}, dữ liệu công ${entry.company}.`
      );
      continue;
    }
    if (
      !validDate(entry.date) ||
      entry.date < startDate ||
      entry.date > endDate
    ) {
      issues.push(`Công ngoài kỳ hoặc ngày không hợp lệ: ${id}, ${entry.date}`);
      continue;
    }
    if (!profileMap.has(id)) {
      issues.push(`Có công nhưng thiếu hồ sơ lương: ${id}`);
      continue;
    }
    // Existing attendance API returns one calculated row per employee/date.
    const key = `${id}/${entry.date}`;
    if (seen.has(key)) {
      issues.push(`Trùng dữ liệu công: ${id}, ${entry.date}`);
      continue;
    }
    seen.add(key);
    if (
      ![
        entry.administrative_hours,
        entry.overtime_hours,
        entry.total_hours
      ].every(validNumber)
    ) {
      issues.push(`Giờ công không hợp lệ: ${id}, ${entry.date}`);
      continue;
    }
    if (
      (entry.time_in && !entry.time_out) ||
      (!entry.time_in && entry.time_out) ||
      (entry.total_hours > 0 && (!entry.time_in || !entry.time_out))
    ) {
      result.warnings!.push(
        `Thiếu giờ vào/ra: ${id} — ${profileMap.get(id)?.name || entry.name}, ${entry.date} (chưa tính công).`
      );
      continue;
    }
    if (entry.total_hours > 0 && ![1, 2].includes(entry.shift)) {
      issues.push(`Chưa xác định ca: ${id}, ${entry.date}`);
      continue;
    }
    if (
      entry.total_hours > 24 ||
      Math.abs(
        entry.total_hours - entry.administrative_hours - entry.overtime_hours
      ) > 0.01
    ) {
      issues.push(`Tổng giờ không khớp: ${id}, ${entry.date}`);
      continue;
    }
    const total = hours.get(id) ?? {
      day: 0,
      night: 0,
      dayOvertime: 0,
      nightOvertime: 0,
      reinforcement: 0,
      records: 0
    };
    total.records++;
    // Match the current attendance screen: LN/TC are reinforcement, not regular hours plus OT.
    if (entry.hnhc === 'LN' || entry.hnhc === 'TC')
      total.reinforcement += entry.total_hours;
    else if (entry.shift === 1) {
      total.day += entry.administrative_hours;
      total.dayOvertime += entry.overtime_hours;
    } else if (entry.shift === 2) {
      total.night += entry.administrative_hours;
      total.nightOvertime += entry.overtime_hours;
    }
    hours.set(id, total);
  }
  for (const profile of profiles) {
    const id = normalizeEmployeeId(
      profile.attendanceEmployeeId || profile.employeeId
    );
    const seenDates = new Set<string>();
    for (const item of adjustments[profile.employeeId]?.attendanceOverrides ??
      []) {
      if (
        !validDate(item.date) ||
        item.date < startDate ||
        item.date > endDate ||
        seenDates.has(item.date) ||
        ![item.day, item.night, item.overtime].every(validNumber) ||
        item.day + item.night + item.overtime > 24 ||
        ![1, 2].includes(item.overtimeShift)
      ) {
        issues.push(
          `Công nhập tay không hợp lệ: ${profile.employeeId}, ${item.date}`
        );
        continue;
      }
      seenDates.add(item.date);
      const total = hours.get(id) ?? {
        day: 0,
        night: 0,
        dayOvertime: 0,
        nightOvertime: 0,
        reinforcement: 0,
        records: 0
      };
      total.day += item.day;
      total.night += item.night;
      total[item.overtimeShift === 1 ? 'dayOvertime' : 'nightOvertime'] +=
        item.overtime;
      total.records++;
      hours.set(id, total);
    }
  }
  for (const profile of profiles) {
    const id = normalizeEmployeeId(profile.employeeId);
    const adjustment = adjustments[id] ?? {
      ...emptyPayrollAdjustments(),
      diligence: profile.diligence
    };
    const numericProfile = [
      profile.basicSalary,
      profile.responsibility,
      profile.housingPerDay,
      profile.travelPerDay,
      profile.mealPerDay,
      profile.diligence,
      profile.insuranceBase,
      profile.unionBase,
      profile.dependents
    ];
    const input = adjustment.calculation ?? {};
    const numericAdjustments = Object.entries(adjustment)
      .filter(
        ([key]) =>
          ![
            'note',
            'noAttendanceConfirmed',
            'attendanceOverrides',
            'calculation'
          ].includes(key)
      )
      .map(([, value]) => value);
    if (
      !numericProfile.every(validNumber) ||
      !numericAdjustments.every(validNumber) ||
      Object.entries(input).some(
        ([key, value]) =>
          !payrollPeriodInputKeys.includes(key as keyof PayrollPeriodInputs) ||
          !validNumber(value)
      ) ||
      !Number.isInteger(profile.dependents)
    ) {
      issues.push(`Hồ sơ hoặc khoản phát sinh không hợp lệ: ${id}`);
      continue;
    }
    const sourceHours = savedHours?.[id] ??
      hours.get(normalizeEmployeeId(profile.attendanceEmployeeId || id)) ?? {
        day: 0,
        night: 0,
        dayOvertime: 0,
        nightOvertime: 0,
        reinforcement: 0,
        records: 0
      };
    const total = {
      ...sourceHours,
      day:
        input.dayDays !== undefined
          ? input.dayDays * rules.hoursPerDay
          : savedHours?.[id] || adjustment.attendanceOverrides?.length
            ? sourceHours.day
            : default22DayEmployeeCodes.has(
                  normalizeEmployeeId(profile.attendanceEmployeeId || id)
                )
              ? 22 * rules.hoursPerDay
              : sourceHours.day,
      night:
        input.nightDays === undefined
          ? sourceHours.night
          : input.nightDays * rules.hoursPerDay,
      dayOvertime: input.dayOvertimeHours ?? sourceHours.dayOvertime,
      nightOvertime: input.nightOvertimeHours ?? sourceHours.nightOvertime
    };
    if (!Object.values(total).every(validNumber)) {
      issues.push(`Giờ công không hợp lệ: ${id}`);
      continue;
    }
    if (
      total.day +
        total.night +
        total.reinforcement +
        total.dayOvertime +
        total.nightOvertime ===
        0 &&
      !adjustment.noAttendanceConfirmed
    ) {
      result.warnings!.push(
        `Chưa có giờ công: ${normalizeEmployeeId(profile.attendanceEmployeeId || id)} — ${profile.name}.`
      );
    }
    const dailyRate =
      (profile.basicSalary + profile.responsibility) / rules.standardDays;
    const hourlyRate = dailyRate / rules.hoursPerDay;
    // Excel keeps full precision in E/G; only the resulting money is rounded.
    const dayDays = total.day / rules.hoursPerDay;
    const nightDays = total.night / rules.hoursPerDay;
    const paidDays = dayDays + nightDays;
    const daySalary = Math.round((input.dayRate ?? dailyRate) * dayDays);
    const nightSalary = Math.round(
      (input.nightRate ?? dailyRate * rules.nightMultiplier) * nightDays
    );
    const dayOvertimeSalary = Math.round(
      hourlyRate * total.dayOvertime * rules.dayOvertimeMultiplier
    );
    const nightOvertimeSalary = Math.round(
      hourlyRate * total.nightOvertime * rules.nightOvertimeMultiplier
    );
    const reinforcementSalary = Math.round(
      (input.mainReinforcementHourlyRate ??
        hourlyRate * rules.reinforcementMultiplier) *
        (input.mainReinforcementHours ?? 0)
    );
    const cashHours = input.cashReinforcementHours ?? total.reinforcement;
    const cashReinforcementSalary =
      cashHours > 0
        ? cashHours *
            (input.cashReinforcementHourlyRate ??
              hourlyRate * rules.reinforcementMultiplier) +
          (input.cashMeal ?? 0) +
          (input.cashOvertimeAllowance ?? 0) +
          (input.cashHousing ?? 0) +
          (input.cashTravel ?? 0)
        : 0;
    const cashOvertimeSalary = Math.round(
      ((input.cashOvertimeBase ?? profile.legacySalary26Days ?? 0) /
        (rules.standardDays * rules.hoursPerDay)) *
        (input.cashOvertimeHours ?? 0) *
        rules.dayOvertimeMultiplier
    );
    const cashAnnualLeaveSalary = Math.round(
      ((input.cashAnnualLeaveBase ?? profile.legacySalary26Days ?? 0) / 26) *
        (input.cashAnnualLeaveDays ?? 0)
    );
    const cashTotal =
      Math.floor(
        (cashOvertimeSalary +
          cashAnnualLeaveSalary +
          cashReinforcementSalary +
          (input.cashDowntime ?? 0) +
          (input.cashOtherIncome ?? 0)) /
          1000
      ) * 1000;
    const housing = Math.round(
      paidDays * (input.housingPerDay ?? profile.housingPerDay)
    );
    const travel = Math.round(
      paidDays * (input.travelPerDay ?? profile.travelPerDay)
    );
    const meal = Math.round(
      paidDays * (input.mealPerDay ?? profile.mealPerDay)
    );
    const holidaySalary = Math.round(
      (input.holidayDailyRate ?? dailyRate) * adjustment.holidayDays
    );
    const paidLeaveSalary = Math.round(
      (input.paidLeaveDailyRate ?? dailyRate) * adjustment.paidLeaveDays
    );
    const downtimeSalary = Math.round(
      (input.downtimeDailyRate ?? dailyRate) * adjustment.downtimeDays
    );
    const menstrualSalary = Math.round(
      (input.menstrualHourlyRate ?? hourlyRate) * adjustment.menstrualHours
    );
    // Keep the approved base unchanged so recalculation never discounts it twice.
    const diligence =
      input.diligence ??
      calculatePayrollDiligence(
        adjustment.diligence,
        adjustment.authorizedLeaveDays,
        adjustment.unauthorizedLeaveDays,
        profile.company
      );
    const gross =
      daySalary +
      nightSalary +
      dayOvertimeSalary +
      nightOvertimeSalary +
      reinforcementSalary +
      housing +
      travel +
      meal +
      holidaySalary +
      paidLeaveSalary +
      downtimeSalary +
      menstrualSalary +
      diligence +
      adjustment.bonus +
      adjustment.referral +
      adjustment.otherIncome;
    // AF:AI use catalogue F + G, without ROUND in the workbook.
    const contributionBase = profile.basicSalary + profile.responsibility;
    const union = (input.unionBase ?? contributionBase) * rules.unionRate;
    const social = (input.insuranceBase ?? contributionBase) * rules.socialRate;
    const health = (input.insuranceBase ?? contributionBase) * rules.healthRate;
    const unemployment =
      (input.insuranceBase ?? contributionBase) * rules.unemploymentRate;
    const personalDeduction =
      input.personalDeduction ?? rules.personalDeduction;
    const dependentDeduction =
      input.dependentDeduction ?? profile.dependents * rules.dependentDeduction;
    if (adjustment.taxExemptIncome > gross)
      issues.push(`Thu nhập miễn thuế vượt tổng thu nhập: ${id}`);
    const taxable =
      input.taxable ??
      Math.max(
        0,
        gross -
          adjustment.taxExemptIncome -
          // Match the workbook AL column: housing and meal are tax-exempt;
          // travel is not included in that column.
          housing -
          meal -
          social -
          health -
          unemployment -
          // The supplied workbook displays AK but does not subtract it in AL/AM.
          personalDeduction
      );
    const tax = calculateResidentTax2026(taxable);
    const net =
      gross -
      union -
      social -
      health -
      unemployment -
      tax -
      adjustment.advance -
      adjustment.otherDeduction;
    if (![gross, taxable, tax, net].every(Number.isFinite)) {
      issues.push(`Kết quả vượt giới hạn tính toán: ${id}`);
      continue;
    }
    if (net < 0)
      result.warnings!.push(
        `Thực lãnh âm: ${normalizeEmployeeId(profile.attendanceEmployeeId || id)} — ${profile.name}. Kiểm tra khấu trừ/bảo hiểm; không chuyển khoản.`
      );
    result.rows.push({
      profile: { ...profile, employeeId: id },
      adjustments: { ...adjustment },
      hours: { ...total },
      dayDays,
      nightDays,
      daySalary,
      nightSalary,
      dayOvertimeSalary,
      nightOvertimeSalary,
      reinforcementSalary,
      cashReinforcementSalary,
      cashOvertimeSalary,
      cashAnnualLeaveSalary,
      cashTotal,
      housing,
      travel,
      meal,
      holidaySalary,
      paidLeaveSalary,
      downtimeSalary,
      menstrualSalary,
      diligence,
      gross,
      union,
      social,
      health,
      unemployment,
      personalDeduction,
      dependentDeduction,
      taxable,
      tax,
      net
    });
  }
  result.issues = [...new Set(issues)];
  return result;
}

/** Recalculate a draft without fetching attendance or changing historical profiles. */
export function recalculatePayrollDraft(
  draft: PayrollDraft,
  profiles: PayrollProfile[] = []
): PayrollDraft {
  if (draft.importMode === 'excel-values')
    throw new Error(
      'Bản nháp giữ nguyên kết quả Excel. Nhập lại Excel để thay đổi số liệu.'
    );
  const warnings = [...(draft.warnings ?? [])];
  const rows = draft.rows.map((row) => {
    const id = normalizeEmployeeId(row.profile.employeeId);
    const profile = resolveSnapshotProfile(
      row.profile,
      profiles.find((item) => normalizeEmployeeId(item.employeeId) === id)
    );
    const adjustments = { ...emptyPayrollAdjustments(), ...row.adjustments };
    const code = normalizeEmployeeId(profile.attendanceEmployeeId || id);
    // These three approved defaults also repair zero-day legacy drafts.
    // An existing zero override or daily correction must not suppress the default.
    if (
      default22DayEmployeeCodes.has(code) &&
      row.hours.day === 0 &&
      (adjustments.calculation?.dayDays ?? 0) === 0
    ) {
      adjustments.calculation = { ...adjustments.calculation, dayDays: 22 };
    }
    const result = calculatePayroll(
      [profile],
      [],
      { [id]: { ...adjustments, attendanceOverrides: [] } },
      draft.rules,
      draft.startDate,
      draft.endDate,
      { [id]: row.hours }
    );
    if (result.issues.length || !result.rows.length)
      throw new Error(
        `${profile.name} (${code}): ${result.issues.join('; ') || 'Không thể tính lại lương.'}`
      );
    warnings.push(...(result.warnings ?? []));
    return { ...result.rows[0], adjustments, source: row.source };
  });
  return {
    ...draft,
    rows,
    formulaVersion: 'excel-2026-10-v2',
    warnings: [...new Set(warnings)]
  };
}
