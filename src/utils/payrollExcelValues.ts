import ExcelJS from 'exceljs';
import {
  defaultPayrollRules,
  emptyPayrollAdjustments,
  type PayrollDraft,
  type PayrollProfile,
  type PayrollRow,
  type PayrollSource
} from './payrollCalculation';

const nameKey = (v: string) =>
  v.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const companyKey = (v = '') =>
  nameKey(v) === 'a7a'
    ? 'a7a'
    : ['vvp', 'vinh vinh phát'].includes(nameKey(v))
      ? 'vvp'
      : '';

/** Explicit exclusions approved for the October 2026 import, not a general missing-person bypass. */
export function applyApprovedOctoberExclusions(
  draft: PayrollDraft
): PayrollDraft {
  const reconciliation = draft.reconciliation;
  if (
    draft.importMode !== 'excel-values' ||
    draft.endDate !== '2026-10-15' ||
    !reconciliation
  )
    return draft;
  const approved = [
    ['1234556', 'Lê Thị Mỹ Tiên', 32],
    ['1234567', 'Nguyễn Thị Hoàng Mai', 33],
    ['0', 'Huỳnh Thị Tuyết Ngân', 43]
  ] as const;
  const excluded = reconciliation.pending.filter(
    (item) =>
      item.source.file.normalize('NFC').includes('A7A') &&
      item.source.sheet === 'Tính lương' &&
      item.reason === 'Chưa tìm thấy nhân viên trên web' &&
      approved.some(
        ([code, name, row]) =>
          item.source.employeeCode === code &&
          nameKey(item.name) === nameKey(name) &&
          item.source.row === row
      )
  );
  if (!excluded.length) return draft;
  const pending = reconciliation.pending.filter(
    (item) => !excluded.includes(item)
  );
  return {
    ...draft,
    issues: pending.length
      ? draft.issues
      : draft.issues.filter(
          (issue) => issue !== 'Còn nhân viên chưa liên kết. Chưa lưu bản nháp.'
        ),
    warnings: [
      ...(draft.warnings ?? []),
      `Đã loại ${excluded.length} nhân viên chưa liên kết theo xác nhận. Số tiền các dòng đã loại không nằm trong tổng bản nháp.`
    ],
    reconciliation: {
      ...reconciliation,
      originalSourceTotals: reconciliation.originalSourceTotals ?? {
        ...reconciliation.sourceTotals
      },
      sourceTotals: {
        ...reconciliation.sourceTotals,
        a7a:
          reconciliation.sourceTotals.a7a -
          excluded.reduce((sum, item) => sum + item.net, 0)
      },
      pending,
      excluded: [
        ...(reconciliation.excluded ?? []),
        ...excluded.map((item) => ({
          ...item,
          reason: 'Không nhập theo xác nhận của người quản lý'
        }))
      ]
    }
  };
}
function read(cell: ExcelJS.Cell): string | number | null {
  const raw = cell.value;
  if (raw == null) return null;
  if (typeof raw === 'string' || typeof raw === 'number') return raw;
  if (typeof raw === 'object' && 'richText' in raw)
    return raw.richText.map((p) => p.text).join('');
  if (typeof raw === 'object' && ('formula' in raw || 'sharedFormula' in raw)) {
    const result = cell.result;
    if (typeof result === 'string' || typeof result === 'number') return result;
  }
  throw new Error(
    `Ô lỗi hoặc chưa có kết quả: ${cell.worksheet.name}!${cell.address}.`
  );
}
function numeric(cell: ExcelJS.Cell) {
  const v = read(cell);
  if (v == null || v === '') return 0;
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Error(`Số không hợp lệ: ${cell.address}.`);
  return v;
}
function source(
  sheet: ExcelJS.Worksheet,
  row: number,
  file: string,
  end: number
): PayrollSource {
  const cells: PayrollSource['cells'] = {};
  for (let c = 1; c <= end; c++) {
    const cell = sheet.getRow(row).getCell(c);
    cells[cell.address] = {
      value: read(cell),
      ...(cell.formula ? { formula: cell.formula } : {})
    };
  }
  return {
    file,
    sheet: sheet.name,
    row,
    employeeCode: String(read(sheet.getCell(`B${row}`)) ?? '').trim(),
    cells
  };
}

export async function readPayrollExcelValues(
  files: { name: string; buffer: ArrayBuffer }[],
  period: string,
  profiles: PayrollProfile[]
): Promise<PayrollDraft> {
  if (files.length !== 2 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    throw new Error('Chọn đủ hai file A7A và VVP cùng tháng lương.');
  const [year, month] = period.split('-').map(Number);
  const draft: PayrollDraft = {
    importMode: 'excel-values',
    startDate: new Date(Date.UTC(year, month - 2, 16))
      .toISOString()
      .slice(0, 10),
    endDate: `${period}-15`,
    rules: { ...defaultPayrollRules },
    rows: [],
    issues: [],
    warnings: [],
    reconciliation: { sourceTotals: {}, pending: [] }
  };
  const cash: { name: string; amount: number; source: PayrollSource }[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(file.buffer);
    const sheet = book.getWorksheet('Tính lương');
    const catalogue = book.getWorksheet('Danh muc');
    if (!sheet || !catalogue)
      throw new Error(`${file.name}: thiếu sheet Tính lương hoặc Danh muc.`);
    const title = String(read(sheet.getCell('A1')))
      .normalize('NFC')
      .toUpperCase();
    const company = title.includes('A7A')
      ? 'a7a'
      : title.includes('VINH VINH PHÁT')
        ? 'vvp'
        : '';
    if (!company || seen.has(company))
      throw new Error('Chọn một file A7A và một file VVP.');
    seen.add(company);
    const a7a = company === 'a7a';
    if (
      !String(read(sheet.getCell('A5'))).includes(`${month}-${year}`) ||
      read(sheet.getCell('AS7')) !== 'Thực lãnh'
    )
      throw new Error(`${file.name}: kỳ lương hoặc cấu trúc cột không khớp.`);
    let total: number | undefined;
    let sum = 0;
    for (let r = 8; r <= sheet.rowCount; r++) {
      const n = (c: string) => numeric(sheet.getCell(`${c}${r}`));
      if (String(read(sheet.getCell(`A${r}`))).includes('TỔNG CỘNG')) {
        total = n('AS');
        break;
      }
      const name = String(read(sheet.getCell(`C${r}`)) ?? '').trim();
      if (!name || name === '0') continue;
      const src = source(sheet, r, file.name, 52);
      sum += n('AS');
      const matches = profiles.filter(
        (p) =>
          companyKey(p.company) === company && nameKey(p.name) === nameKey(name)
      );
      const ids = new Set(
        matches.map((p) => p.attendanceEmployeeId || p.employeeId)
      );
      if (ids.size !== 1) {
        draft.reconciliation!.pending.push({
          source: src,
          name,
          net: n('AS'),
          reason: ids.size
            ? 'Tên trùng nhiều nhân viên trên web'
            : 'Chưa tìm thấy nhân viên trên web'
        });
        continue;
      }
      const linked = matches[0];
      const id = linked.attendanceEmployeeId || linked.employeeId;
      if (draft.rows.some((row) => row.profile.employeeId === id))
        throw new Error(`${name}: nhiều dòng Excel trùng một nhân viên web.`);
      if (
        nameKey(String(read(catalogue.getCell(`C${r}`)) ?? '')) !==
        nameKey(name)
      )
        throw new Error(`${file.name}: Danh muc!C${r} không khớp tên.`);
      const p = (c: string) => numeric(catalogue.getCell(`${c}${r}`));
      const row: PayrollRow = {
        profile: {
          ...linked,
          employeeId: id,
          attendanceEmployeeId: id,
          company,
          name,
          department: String(read(sheet.getCell(`D${r}`)) ?? ''),
          bankAccount: String(read(catalogue.getCell(`E${r}`)) ?? ''),
          basicSalary: p('F'),
          responsibility: p('G'),
          housingPerDay: p('H'),
          travelPerDay: p('I'),
          mealPerDay: p('J'),
          diligence: p('K')
        },
        source: src,
        excelNetBlank: read(sheet.getCell(`AS${r}`)) == null,
        adjustments: {
          ...emptyPayrollAdjustments(),
          downtimeDays: n('U'),
          holidayDays: n('W'),
          paidLeaveDays: n('Y'),
          authorizedLeaveDays: n('AB'),
          unauthorizedLeaveDays: n('AC'),
          menstrualHours: n('AE'),
          bonus: n('AG'),
          referral: n('AH'),
          taxExemptIncome: n('AP'),
          note: String(read(sheet.getCell(`AA${r}`)) ?? ''),
          noAttendanceConfirmed: true
        },
        hours: {
          day: n(a7a ? 'F' : 'E') * 8,
          night: n(a7a ? 'H' : 'G') * 8,
          dayOvertime: n(a7a ? 'J' : 'I'),
          nightOvertime: n(a7a ? 'L' : 'K'),
          reinforcement: n(a7a ? 'N' : 'M'),
          records: 0
        },
        dayDays: n(a7a ? 'F' : 'E'),
        nightDays: n(a7a ? 'H' : 'G'),
        daySalary: n(a7a ? 'G' : 'F'),
        nightSalary: n(a7a ? 'I' : 'H'),
        dayOvertimeSalary: n(a7a ? 'K' : 'J'),
        nightOvertimeSalary: n(a7a ? 'M' : 'L'),
        reinforcementSalary: n(a7a ? 'O' : 'N'),
        annualLeaveDays: n(a7a ? 'P' : 'O'),
        annualLeaveSalary: a7a ? 0 : n('P'),
        allowanceDays: n('Q'),
        housing: n('R'),
        travel: n('S'),
        meal: n('T'),
        downtimeSalary: n('V'),
        holidaySalary: n('X'),
        paidLeaveSalary: n('Z'),
        diligence: n('AD'),
        menstrualSalary: n('AF'),
        gross: n('AI'),
        union: n('AJ'),
        social: n('AK'),
        health: n('AL'),
        unemployment: n('AM'),
        personalDeduction: n('AN'),
        dependentDeduction: n('AO'),
        taxable: n('AQ'),
        tax: n('AR'),
        net: n('AS'),
        employeeInsurance: n('AT'),
        employerInsurance: n('AU'),
        employerUnion: n('AV')
      };
      if (row.excelNetBlank)
        draft.warnings!.push(
          `${name}: thực lãnh để trống trong Excel; không tự tính bù, không tính vào tổng.`
        );
      draft.rows.push(row);
    }
    if (total === undefined || Math.abs(total - sum) > 0.001)
      throw new Error(`${file.name}: tổng thực lãnh không khớp chi tiết.`);
    draft.reconciliation!.sourceTotals[company] = total;
    const cashSheet = book.getWorksheet('TĂNG CƯỜNG TIỀN MẶT');
    if (cashSheet) {
      let cashSum = 0;
      for (let r = 8; r <= cashSheet.rowCount; r++) {
        const name = String(read(cashSheet.getCell(`C${r}`)) ?? '').trim();
        const amount = numeric(cashSheet.getCell(`V${r}`));
        if (!name || name === '0') {
          if (
            cashSheet.getCell(`V${r}`).formula?.startsWith('SUM(') &&
            Math.abs(amount - cashSum) > 0.001
          )
            throw new Error('Tổng tăng cường tiền mặt không khớp chi tiết.');
          continue;
        }
        cashSum += amount;
        if (amount)
          cash.push({
            name,
            amount,
            source: source(cashSheet, r, file.name, 22)
          });
      }
    }
  }
  for (const item of cash) {
    const matches = draft.rows.filter(
      (row) => nameKey(row.profile.name) === nameKey(item.name)
    );
    if (matches.length !== 1 || matches[0].cashSource)
      throw new Error(
        `${item.name}: chưa liên kết duy nhất khoản tăng cường tiền mặt.`
      );
    Object.assign(matches[0], {
      cashTotal: item.amount,
      cashReinforcementSalary: item.amount,
      cashSource: item.source
    });
  }
  if (draft.reconciliation!.pending.length)
    draft.issues.push('Còn nhân viên chưa liên kết. Chưa lưu bản nháp.');
  return draft;
}
