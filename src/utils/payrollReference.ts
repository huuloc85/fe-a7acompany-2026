import ExcelJS from 'exceljs';
import {
  calculatePayroll,
  defaultPayrollRules,
  emptyPayrollAdjustments,
  type PayrollDraft,
  type PayrollPeriodInputs,
  type PayrollProfile,
  type PayrollRow,
  type PayrollSource
} from './payrollCalculation';

const companyKey = (value = '') =>
  value.trim().toLowerCase() === 'a7a' ? 'a7a' : 'vvp';
const cleanName = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

function value(cell: ExcelJS.Cell): string | number | null {
  const raw = cell.value;
  if (raw == null) return null;
  if (typeof raw === 'number' || typeof raw === 'string') return raw;
  if (typeof raw !== 'object')
    throw new Error(`Kiểu dữ liệu không hỗ trợ tại ${cell.address}.`);
  if ('formula' in raw || 'sharedFormula' in raw) {
    const result = cell.result;
    if (typeof result === 'number' || typeof result === 'string') return result;
    if (result == null)
      throw new Error(
        `Chưa có kết quả công thức tại ${cell.worksheet.name}!${cell.address}. Mở và lưu lại bằng Excel.`
      );
  }
  if ('richText' in raw) return raw.richText.map((part) => part.text).join('');
  throw new Error(
    `Ô lỗi hoặc kiểu dữ liệu không hỗ trợ: ${cell.worksheet.name}!${cell.address}.`
  );
}

function number(cell: ExcelJS.Cell) {
  const v = value(cell);
  if (v == null || v === '') return 0;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
    throw new Error(
      `Số không hợp lệ tại ${cell.worksheet.name}!${cell.address}.`
    );
  return v;
}

function sourceCell(cell: ExcelJS.Cell) {
  return {
    value: value(cell),
    ...(cell.formula ? { formula: cell.formula } : {})
  };
}

/** Read known payroll formula precedents, not arbitrary JavaScript or VBA. */
function rate(
  cell: ExcelJS.Cell,
  catalogue: ExcelJS.Worksheet,
  divisor: number,
  multiplier = 1
): number {
  if (cell.value == null) return 0;
  const formula = cell.formula;
  if (!formula)
    throw new Error(
      `Cần xác nhận đơn giá của ô nhập tiền trực tiếp ${cell.address}.`
    );
  const refs = [...formula.matchAll(/'Danh muc'!\$?([FGHIJKLM])\$?(\d+)/g)];
  if (!refs.length || /#REF!|\[\d+\]/.test(formula))
    throw new Error(`Không xác định được căn cứ tính tại ${cell.address}.`);
  // First-month daily/nightly wages reference one L/M catalogue cell directly.
  if (refs.length === 1 && ['L', 'M'].includes(refs[0][1]))
    return number(catalogue.getCell(`${refs[0][1]}${refs[0][2]}`));
  if (refs.length !== 2)
    throw new Error(`Công thức chưa hỗ trợ tại ${cell.address}.`);
  return (
    (refs.reduce(
      (sum, ref) => sum + number(catalogue.getCell(`${ref[1]}${ref[2]}`)),
      0
    ) /
      divisor) *
    multiplier
  );
}

export interface PayrollReference {
  company: 'vvp' | 'a7a';
  period: string;
  rows: PayrollRow[];
  total: number;
  warnings: string[];
}

/** Import inputs and verify every main-payroll amount against Excel's saved results.
 * Workbooks remain local; macros and external links are never executed.
 */
export async function readPayrollReference(
  buffer: ArrayBuffer,
  file: string,
  period: string
): Promise<PayrollReference> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const salary = workbook.getWorksheet('Tính lương');
  const catalogue = workbook.getWorksheet('Danh muc');
  if (!salary || !catalogue)
    throw new Error('Thiếu sheet Tính lương hoặc Danh muc.');
  const a7a = String(value(salary.getCell('A1'))).includes('A7A');
  const company = a7a ? 'a7a' : 'vvp';
  const title = String(value(salary.getCell('A5')));
  const [year, month] = period.split('-').map(Number);
  if (
    !/^2026-(0[1-9]|1[0-2])$/.test(period) ||
    !title.includes(`${month}-${year}`)
  )
    throw new Error(`${file}: tháng trong Excel không khớp kỳ ${period}.`);
  const endDate = `${period}-15`;
  const prior = new Date(Date.UTC(year, month - 2, 16))
    .toISOString()
    .slice(0, 10);
  const columns = a7a
    ? {
        dayDays: 'F',
        daySalary: 'G',
        nightDays: 'H',
        nightSalary: 'I',
        dayOvertimeHours: 'J',
        dayOvertimeSalary: 'K',
        nightOvertimeHours: 'L',
        nightOvertimeSalary: 'M',
        mainHours: 'N',
        mainSalary: 'O',
        housing: 'R',
        travel: 'S',
        meal: 'T',
        downtimeDays: 'U',
        downtimeSalary: 'V',
        holidayDays: 'W',
        holidaySalary: 'X',
        paidLeaveDays: 'Y',
        paidLeaveSalary: 'Z',
        note: 'AA',
        authorizedLeaveDays: 'AB',
        unauthorizedLeaveDays: 'AC',
        diligence: 'AD',
        menstrualHours: 'AE',
        menstrualSalary: 'AF',
        bonus: 'AG',
        referral: 'AH',
        gross: 'AI',
        union: 'AJ',
        social: 'AK',
        health: 'AL',
        unemployment: 'AM',
        personalDeduction: 'AN',
        dependentDeduction: 'AO',
        taxable: 'AQ',
        tax: 'AR',
        net: 'AS'
      }
    : {
        dayDays: 'E',
        daySalary: 'F',
        nightDays: 'G',
        nightSalary: 'H',
        dayOvertimeHours: 'I',
        dayOvertimeSalary: 'J',
        nightOvertimeHours: 'K',
        nightOvertimeSalary: 'L',
        mainHours: 'M',
        mainSalary: 'N',
        housing: 'P',
        travel: 'Q',
        meal: 'R',
        downtimeDays: 'S',
        downtimeSalary: 'T',
        holidayDays: 'U',
        holidaySalary: 'V',
        paidLeaveDays: 'W',
        paidLeaveSalary: 'X',
        note: 'Y',
        authorizedLeaveDays: 'Z',
        unauthorizedLeaveDays: 'AA',
        diligence: 'AB',
        menstrualHours: 'AC',
        menstrualSalary: 'AD',
        bonus: 'AE',
        referral: 'AF',
        gross: 'AG',
        union: 'AH',
        social: 'AI',
        health: 'AJ',
        unemployment: 'AK',
        personalDeduction: 'AL',
        dependentDeduction: 'AM',
        taxable: 'AO',
        tax: 'AP',
        net: 'AQ'
      };
  if (
    value(salary.getCell(`${columns.net}7`)) !== 'Thực lãnh' ||
    value(catalogue.getCell('B7')) !== 'Mã NV'
  )
    throw new Error('Cấu trúc bảng lương không đúng mẫu đã đối soát.');
  const rows: PayrollRow[] = [];
  const warnings: string[] = [];
  let expectedTotal: number | undefined;
  for (let r = 8; r <= salary.rowCount; r++) {
    if (String(value(salary.getCell(`A${r}`))).includes('TỔNG CỘNG')) {
      expectedTotal = number(salary.getCell(`${columns.net}${r}`));
      break;
    }
    const name = String(value(salary.getCell(`C${r}`)) ?? '').trim();
    if (!name || name === '0') continue;
    const cell = (key: keyof typeof columns) =>
      salary.getCell(`${columns[key]}${r}`);
    const n = (key: keyof typeof columns) => number(cell(key));
    const p = (col: string) => number(catalogue.getCell(`${col}${r}`));
    const employeeCode = String(value(salary.getCell(`B${r}`)) ?? '').trim();
    const profile: PayrollProfile = {
      employeeId: employeeCode || '0',
      company,
      name,
      department: String(value(salary.getCell(`D${r}`)) ?? ''),
      bankAccount: String(value(catalogue.getCell(`E${r}`)) ?? ''),
      basicSalary: p('F'),
      responsibility: p('G'),
      housingPerDay: p('H'),
      travelPerDay: p('I'),
      mealPerDay: p('J'),
      diligence: p('K'),
      insuranceBase: p('F') + p('G'),
      unionBase: p('F') + p('G'),
      dependents: 0,
      legacySalary26Days: a7a ? 0 : p('L')
    };
    const input: PayrollPeriodInputs = {
      dayDays: n('dayDays'),
      nightDays: n('nightDays'),
      dayOvertimeHours: n('dayOvertimeHours'),
      nightOvertimeHours: n('nightOvertimeHours'),
      dayRate: rate(cell('daySalary'), catalogue, 25),
      nightRate: rate(cell('nightSalary'), catalogue, 25, 1.3),
      downtimeDailyRate: rate(cell('downtimeSalary'), catalogue, 25),
      holidayDailyRate: rate(cell('holidaySalary'), catalogue, 25),
      paidLeaveDailyRate: rate(cell('paidLeaveSalary'), catalogue, 25),
      menstrualHourlyRate: rate(cell('menstrualSalary'), catalogue, 200),
      unionBase: rate(cell('union'), catalogue, 1),
      insuranceBase: rate(cell('social'), catalogue, 1),
      personalDeduction: n('personalDeduction'),
      dependentDeduction: n('dependentDeduction'),
      mainReinforcementHours: a7a ? 0 : n('mainHours'),
      mainReinforcementHourlyRate: rate(cell('mainSalary'), catalogue, 200, 2)
    };
    // Follow the exact catalogue reference, including shifted references, with provenance.
    for (const [key, output] of [
      ['housingPerDay', 'housing'],
      ['travelPerDay', 'travel'],
      ['mealPerDay', 'meal']
    ] as const) {
      const ref = cell(output).formula?.match(/'Danh muc'!\$?([HIJ])\$?(\d+)/);
      input[key] = ref ? number(catalogue.getCell(`${ref[1]}${ref[2]}`)) : 0;
    }
    if (!cell('taxable').formula) input.taxable = n('taxable');
    if (!cell('diligence').formula) input.diligence = n('diligence');
    const adjustment = {
      ...emptyPayrollAdjustments(),
      calculation: input,
      downtimeDays: n('downtimeDays'),
      holidayDays: n('holidayDays'),
      paidLeaveDays: n('paidLeaveDays'),
      authorizedLeaveDays: n('authorizedLeaveDays'),
      unauthorizedLeaveDays: n('unauthorizedLeaveDays'),
      menstrualHours: n('menstrualHours'),
      bonus: n('bonus'),
      referral: n('referral'),
      diligence: cell('diligence').formula
        ? number(catalogue.getCell('K8'))
        : 0,
      note: String(value(cell('note')) ?? ''),
      noAttendanceConfirmed: true
    };
    const result = calculatePayroll(
      [profile],
      [],
      { [profile.employeeId]: adjustment },
      defaultPayrollRules,
      prior,
      endDate
    );
    if (result.issues.length || !result.rows[0])
      throw new Error(`${file}, dòng ${r}: ${result.issues.join('; ')}`);
    const row = result.rows[0];
    for (const key of [
      'dayDays',
      'nightDays',
      'daySalary',
      'nightSalary',
      'dayOvertimeSalary',
      'nightOvertimeSalary',
      'housing',
      'travel',
      'meal',
      'downtimeSalary',
      'holidaySalary',
      'paidLeaveSalary',
      'menstrualSalary',
      'diligence',
      'gross',
      'union',
      'social',
      'health',
      'unemployment',
      'personalDeduction',
      'dependentDeduction',
      'taxable',
      'tax',
      'net'
    ] as const) {
      if (Math.abs(row[key] - n(key)) > 0.001)
        throw new Error(
          `${file}, ${cell(key).address}: hệ thống ${row[key]}, Excel ${n(key)}. Chưa nhập dòng lệch.`
        );
    }
    if (!a7a && row.reinforcementSalary !== n('mainSalary'))
      throw new Error(`Lệch tăng cường tại ${cell('mainSalary').address}.`);
    if (a7a && n('mainSalary') !== 0)
      warnings.push(
        `${file}, ${cell('mainSalary').address}: tăng cường không được cộng trong công thức tổng thu nhập A7A.`
      );
    const cells: PayrollSource['cells'] = {};
    for (const c of Object.values(columns))
      cells[`${c}${r}`] = sourceCell(salary.getCell(`${c}${r}`));
    row.source = { file, sheet: 'Tính lương', row: r, employeeCode, cells };
    rows.push(row);
  }
  const total = rows.reduce((sum, row) => sum + row.net, 0);
  if (expectedTotal === undefined || Math.abs(total - expectedTotal) > 0.001)
    throw new Error(
      `${file}: tổng chi tiết ${total} không khớp dòng tổng ${expectedTotal ?? 'trống'}.`
    );
  return { company, period, rows, total, warnings };
}

export function reconcilePayrollReferences(
  references: PayrollReference[],
  profiles: PayrollProfile[],
  previousDraft?: PayrollDraft
): PayrollDraft {
  const companies = previousDraft
    ? [
        ...new Set(
          previousDraft.rows.map((row) => companyKey(row.profile.company))
        )
      ]
    : ['a7a', 'vvp'];
  if (
    !references.length ||
    references.length !== companies.length ||
    new Set(references.map((ref) => ref.company)).size !== companies.length ||
    references.some(
      (ref) =>
        !companies.includes(ref.company) || ref.period !== references[0].period
    )
  )
    throw new Error(
      `Chọn đủ file ${companies.map((company) => company.toUpperCase()).join(' và ')} cùng tháng lương.`
    );
  const period = references[0].period;
  if (previousDraft && previousDraft.endDate.slice(0, 7) !== period)
    throw new Error('Tháng trong Excel không khớp bản nháp đang sửa.');
  const [year, month] = period.split('-').map(Number);
  const draft: PayrollDraft = {
    formulaVersion: 'excel-2026-10-v2',
    startDate: new Date(Date.UTC(year, month - 2, 16))
      .toISOString()
      .slice(0, 10),
    endDate: `${period}-15`,
    dataThrough: `${period}-15`,
    rules: { ...defaultPayrollRules },
    rows: [],
    issues: [],
    warnings: references.flatMap((ref) => ref.warnings),
    reconciliation: {
      sourceTotals: Object.fromEntries(
        references.map((ref) => [ref.company, ref.total])
      ),
      pending: []
    }
  };
  const allRows = references.flatMap((ref) => ref.rows);
  const mapped = allRows.map((row) => {
    const candidates = profiles.filter(
      (profile) =>
        companyKey(profile.company) === companyKey(row.profile.company) &&
        [
          profile.employeeId.trim(),
          profile.attendanceEmployeeId?.trim()
        ].includes(row.source!.employeeCode)
    );
    const candidate = candidates.length === 1 ? candidates[0] : undefined;
    return { row, candidate };
  });
  for (const { row, candidate } of mapped) {
    const code = row.source!.employeeCode;
    const duplicate =
      allRows.filter(
        (other) =>
          other.source!.employeeCode === code &&
          companyKey(other.profile.company) === companyKey(row.profile.company)
      ).length > 1;
    const linkedDuplicate =
      candidate &&
      mapped.filter(
        (item) => item.candidate?.employeeId === candidate.employeeId
      ).length > 1;
    const reason =
      !code || code === '0'
        ? 'Thiếu mã nhân viên'
        : duplicate || linkedDuplicate
          ? 'Trùng mã nhân viên trong Excel'
          : !candidate
            ? 'Chưa liên kết với danh mục hệ thống'
            : cleanName(candidate.name) !== cleanName(row.profile.name)
              ? 'Tên nhân viên không khớp mã'
              : '';
    if (reason) {
      draft.reconciliation!.pending.push({
        source: row.source!,
        name: row.profile.name,
        net: row.net,
        reason
      });
      continue;
    }
    draft.rows.push({
      ...row,
      profile: {
        ...row.profile,
        employeeId: candidate!.attendanceEmployeeId || candidate!.employeeId,
        attendanceEmployeeId: candidate!.attendanceEmployeeId,
        bankBin: candidate!.bankBin
      }
    });
  }
  for (const row of previousDraft?.rows ?? []) {
    const code = row.profile.attendanceEmployeeId || row.profile.employeeId;
    if (
      !draft.rows.some(
        (item) =>
          (item.profile.attendanceEmployeeId || item.profile.employeeId) ===
          code
      )
    )
      draft.issues.push(
        `${row.profile.name} (${code}): chưa có dòng Excel liên kết. Không bỏ dòng khỏi bản nháp.`
      );
  }
  if (draft.reconciliation!.pending.length)
    draft.issues.push(
      `${draft.reconciliation!.pending.length} dòng Excel chưa xác nhận mã nhân viên. Chưa lưu hoặc công bố.`
    );
  return draft;
}
