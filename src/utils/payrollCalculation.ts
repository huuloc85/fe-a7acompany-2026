import type { AttendanceResult } from './attendanceUtil';

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

export interface PayrollAdjustments {
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

export interface PayrollHours {
  day: number;
  night: number;
  dayOvertime: number;
  nightOvertime: number;
  reinforcement: number;
  records: number;
}

export interface PayrollRow {
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
  endDate: string
): PayrollDraft {
  const issues: string[] = [];
  const result: PayrollDraft = {
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
    const numericAdjustments = Object.values(adjustment).filter(
      (v) => typeof v !== 'string' && typeof v !== 'boolean'
    );
    if (
      !numericProfile.every(validNumber) ||
      !numericAdjustments.every(validNumber) ||
      !Number.isInteger(profile.dependents)
    ) {
      issues.push(`Hồ sơ hoặc khoản phát sinh không hợp lệ: ${id}`);
      continue;
    }
    const total = hours.get(
      normalizeEmployeeId(profile.attendanceEmployeeId || id)
    ) ?? {
      day: 0,
      night: 0,
      dayOvertime: 0,
      nightOvertime: 0,
      reinforcement: 0,
      records: 0
    };
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
    // Match the template: round work days to 2 decimals before computing salary.
    const dayDays = Math.round((total.day / rules.hoursPerDay) * 100) / 100;
    const nightDays = Math.round((total.night / rules.hoursPerDay) * 100) / 100;
    const paidDays = dayDays + nightDays;
    const daySalary = Math.round(dailyRate * dayDays);
    const nightSalary = Math.round(
      dailyRate * nightDays * rules.nightMultiplier
    );
    const dayOvertimeSalary = Math.round(
      hourlyRate * total.dayOvertime * rules.dayOvertimeMultiplier
    );
    const nightOvertimeSalary = Math.round(
      hourlyRate * total.nightOvertime * rules.nightOvertimeMultiplier
    );
    const reinforcementSalary = Math.round(
      hourlyRate * total.reinforcement * rules.reinforcementMultiplier
    );
    const housing = Math.round(paidDays * profile.housingPerDay);
    const travel = Math.round(paidDays * profile.travelPerDay);
    const meal = Math.round(paidDays * profile.mealPerDay);
    const holidaySalary = Math.round(dailyRate * adjustment.holidayDays);
    const paidLeaveSalary = Math.round(dailyRate * adjustment.paidLeaveDays);
    const downtimeSalary = Math.round(dailyRate * adjustment.downtimeDays);
    const menstrualSalary = Math.round(hourlyRate * adjustment.menstrualHours);
    const diligence =
      (adjustment.authorizedLeaveDays ?? 0) > 0 ||
      (adjustment.unauthorizedLeaveDays ?? 0) > 0
        ? 0
        : adjustment.diligence;
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
    const union = Math.round(profile.unionBase * rules.unionRate);
    const social = Math.round(profile.insuranceBase * rules.socialRate);
    const health = Math.round(profile.insuranceBase * rules.healthRate);
    const unemployment = Math.round(
      profile.insuranceBase * rules.unemploymentRate
    );
    const dependentDeduction = profile.dependents * rules.dependentDeduction;
    if (adjustment.taxExemptIncome > gross)
      issues.push(`Thu nhập miễn thuế vượt tổng thu nhập: ${id}`);
    const taxable = Math.max(
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
        rules.personalDeduction -
        dependentDeduction
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
      personalDeduction: rules.personalDeduction,
      dependentDeduction,
      taxable,
      tax,
      net
    });
  }
  result.issues = [...new Set(issues)];
  return result;
}
