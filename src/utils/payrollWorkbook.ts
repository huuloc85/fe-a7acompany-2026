import ExcelJS from 'exceljs';
import { payrollBankBin, payrollBankName } from './payrollBanks.ts';
import { payrollEmployeeCode } from './payrollIdentity.ts';
import {
  payrollExcelFormulas,
  payrollFormulaNotes,
  payrollRuleKeys
} from './payrollFormulas.ts';
import type {
  PayrollDraft,
  PayrollProfile,
  PayrollRow
} from './payrollCalculation';

function textValue(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return '';
  if (typeof value === 'object') {
    // Only read cached formula results. Never execute workbook macros or links.
    if ('formula' in value || 'sharedFormula' in value) {
      if (cell.result == null || typeof cell.result === 'object')
        throw new Error(`Không đọc được kết quả tại ${cell.address}`);
      return String(cell.result).trim();
    }
    if ('richText' in value)
      return value.richText
        .map((part) => part.text)
        .join('')
        .trim();
    throw new Error(`Giá trị không hợp lệ tại ${cell.address}`);
  }
  return String(value).trim();
}

function amount(cell: ExcelJS.Cell, required = false) {
  const raw = textValue(cell);
  if (!raw && required) throw new Error(`Thiếu mức lương tại ${cell.address}`);
  const value = raw ? Number(raw) : 0;
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`Số tiền không hợp lệ tại ${cell.address}`);
  return value;
}

export async function readPayrollProfiles(
  buffer: ArrayBuffer
): Promise<PayrollProfile[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Danh muc');
  if (
    !sheet ||
    textValue(sheet.getCell('B7')) !== 'Mã NV' ||
    textValue(sheet.getCell('F7')) !== 'Lương căn bản' ||
    textValue(sheet.getCell('G7')) !== 'Phụ cấp trách nhiệm' ||
    textValue(sheet.getCell('H7')) !== 'Phụ cấp nhà ở/ ngày' ||
    textValue(sheet.getCell('I7')) !== 'Hỗ trợ đi lại/ ngày' ||
    textValue(sheet.getCell('J7')) !== 'Phụ cấp cơm trưa/ ngày' ||
    textValue(sheet.getCell('K7')) !== 'Chuyên cần'
  ) {
    throw new Error(
      'Cần sheet “Danh muc” đúng cấu trúc mẫu VVP (tiêu đề dòng 7, mã NV cột B, lương cột F–K).'
    );
  }
  const profiles: PayrollProfile[] = [];
  const ids = new Set<string>();
  for (let row = 8; row <= sheet.rowCount; row++) {
    const employeeId = textValue(sheet.getCell(row, 2));
    if (!employeeId) continue;
    if (ids.has(employeeId))
      throw new Error(`Trùng mã nhân viên ${employeeId} trong danh mục.`);
    ids.add(employeeId);
    const name = textValue(sheet.getCell(row, 3));
    if (!name) throw new Error(`Thiếu tên nhân viên ở dòng ${row}.`);
    const basicSalary = amount(sheet.getCell(row, 6), true);
    const responsibility = amount(sheet.getCell(row, 7));
    profiles.push({
      employeeId,
      name,
      department: textValue(sheet.getCell(row, 4)),
      bankAccount: textValue(sheet.getCell(row, 5)),
      ...(textValue(sheet.getCell('Q7')) === 'Mã ngân hàng (BIN)'
        ? { bankBin: textValue(sheet.getCell(row, 17)) }
        : {}),
      basicSalary,
      responsibility,
      housingPerDay: amount(sheet.getCell(row, 8)),
      travelPerDay: amount(sheet.getCell(row, 9)),
      mealPerDay: amount(sheet.getCell(row, 10)),
      diligence: amount(sheet.getCell(row, 11)),
      insuranceBase:
        textValue(sheet.getCell('L7')) === 'Căn cứ BH'
          ? amount(sheet.getCell(row, 12), true)
          : basicSalary + responsibility,
      unionBase:
        textValue(sheet.getCell('M7')) === 'Căn cứ đoàn phí'
          ? amount(sheet.getCell(row, 13), true)
          : basicSalary + responsibility,
      dependents:
        textValue(sheet.getCell('N7')) === 'Số người phụ thuộc'
          ? amount(sheet.getCell(row, 14), true)
          : 0
    });
  }
  if (!profiles.length) throw new Error('Danh mục không có nhân viên.');
  return profiles;
}

type PayrollColumn = {
  title: string;
  value: (row: PayrollRow) => string | number;
};

// Same core column sequence as the VVP template; new explicit inputs follow it.
export const payrollColumns: PayrollColumn[] = [
  { title: 'Mã NV', value: (r) => payrollEmployeeCode(r.profile) },
  { title: 'Tên NV', value: (r) => r.profile.name },
  { title: 'Bộ phận', value: (r) => r.profile.department },
  { title: 'Số công ngày', value: (r) => r.dayDays },
  { title: 'Lương ca ngày', value: (r) => r.daySalary },
  { title: 'Số công đêm', value: (r) => r.nightDays },
  { title: 'Lương ca đêm', value: (r) => r.nightSalary },
  { title: 'Số giờ tăng ca ngày', value: (r) => r.hours.dayOvertime },
  { title: 'Lương tăng ca ngày', value: (r) => r.dayOvertimeSalary },
  { title: 'Số giờ tăng ca đêm', value: (r) => r.hours.nightOvertime },
  { title: 'Lương tăng ca đêm', value: (r) => r.nightOvertimeSalary },
  { title: 'Số ngày phụ cấp', value: (r) => r.dayDays + r.nightDays },
  { title: 'Phụ cấp nhà ở', value: (r) => r.housing },
  { title: 'Phụ cấp đi lại', value: (r) => r.travel },
  { title: 'Phụ cấp cơm', value: (r) => r.meal },
  { title: 'Số ngày ngừng việc', value: (r) => r.adjustments.downtimeDays },
  { title: 'Tiền ngừng việc', value: (r) => r.downtimeSalary },
  { title: 'Số ngày lễ/tết', value: (r) => r.adjustments.holidayDays },
  { title: 'Tiền lễ/tết', value: (r) => r.holidaySalary },
  {
    title: 'Nghỉ hưởng lương (ngày)',
    value: (r) => r.adjustments.paidLeaveDays
  },
  { title: 'Tiền nghỉ hưởng lương', value: (r) => r.paidLeaveSalary },
  { title: 'Ghi chú', value: (r) => r.adjustments.note },
  { title: 'Chuyên cần tháng', value: (r) => r.diligence },
  { title: 'Số giờ hành kinh', value: (r) => r.adjustments.menstrualHours },
  { title: 'Phụ cấp hành kinh', value: (r) => r.menstrualSalary },
  { title: 'Thưởng', value: (r) => r.adjustments.bonus },
  { title: 'Giới thiệu nhân sự', value: (r) => r.adjustments.referral },
  { title: 'Tổng thu nhập', value: (r) => r.gross },
  { title: 'Đoàn phí', value: (r) => r.union },
  { title: 'BHXH', value: (r) => r.social },
  { title: 'BHYT', value: (r) => r.health },
  { title: 'BHTN', value: (r) => r.unemployment },
  { title: 'Giảm trừ bản thân', value: (r) => r.personalDeduction },
  { title: 'Giảm trừ phụ thuộc', value: (r) => r.dependentDeduction },
  {
    title: 'Thu nhập miễn thuế đã xác nhận',
    value: (r) => r.adjustments.taxExemptIncome
  },
  { title: 'Thu nhập tính thuế', value: (r) => r.taxable },
  { title: 'Thuế TNCN', value: (r) => r.tax },
  { title: 'Thực lãnh', value: (r) => r.net },
  { title: 'Giờ tăng cường', value: (r) => r.hours.reinforcement },
  { title: 'Tiền tăng cường', value: (r) => r.reinforcementSalary },
  { title: 'Thu nhập bổ sung', value: (r) => r.adjustments.otherIncome },
  { title: 'Tạm ứng', value: (r) => r.adjustments.advance },
  { title: 'Khấu trừ khác', value: (r) => r.adjustments.otherDeduction },
  { title: 'Số tài khoản', value: (r) => r.profile.bankAccount }
];

function styleSheet(sheet: ExcelJS.Worksheet, headerRow: number) {
  sheet.views = [{ state: 'frozen', ySplit: headerRow, xSplit: 2 }];
  sheet.eachRow((row, index) => {
    row.font = { name: 'Arial', size: 11 };
    row.alignment = { vertical: 'middle' };
    row.height = index === headerRow ? 50 : 22;
    row.eachCell((cell) => {
      if (typeof cell.value === 'number' || typeof cell.result === 'number')
        cell.numFmt = '#,##0.##';
    });
  });
  sheet.getRow(headerRow).font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };
  sheet.getRow(headerRow).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF16324F' }
  };
  sheet.getRow(headerRow).alignment = { wrapText: true, vertical: 'middle' };
  sheet.columns.forEach((column) => {
    column.width = 22;
  });
  sheet.getColumn(2).width = 30;
  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };
}

export async function buildPayrollWorkbook(
  draft: PayrollDraft,
  payslipEmployeeId?: string
) {
  if (!draft.rows.length)
    throw new Error('Chưa có dữ liệu bảng lương để xuất.');
  const workbook = new ExcelJS.Workbook();
  const warningText = payslipEmployeeId
    ? 'Bản tạm tính có lưu ý cần kiểm tra trước khi thanh toán.'
    : draft.warnings?.join(' / ');
  const period = `${draft.startDate} đến ${draft.endDate}${draft.dataThrough ? ` — TẠM TÍNH: công đến ${draft.dataThrough}` : ''}${draft.warnings?.length ? ` — Lưu ý: ${warningText}` : ''}`;
  if (payslipEmployeeId !== undefined) {
    const row = draft.rows.find(
      (r) => r.profile.employeeId === payslipEmployeeId
    );
    if (!row) throw new Error('Không tìm thấy nhân viên.');
    // Include only this employee's inputs so the individual file remains live
    // without exposing coworkers or linking to an external workbook.
    await workbook.xlsx.load(
      await buildPayrollWorkbook({
        ...draft,
        rows: [row],
        warnings: draft.warnings?.length ? [warningText!] : []
      })
    );
    const sheet = workbook.addWorksheet('Phiếu lương');
    sheet.addRow(['VINH VINH PHÁT — PHIẾU LƯƠNG NHÁP']);
    sheet.addRow([period]);
    sheet.addRow(['Mã nhân viên', payrollEmployeeCode(row.profile)]);
    sheet.addRow(['Họ tên', row.profile.name]);
    sheet.addRow(['Bộ phận', row.profile.department]);
    sheet.addRow(['Diễn giải', 'Giá trị (tiền: VND; công/giờ theo nhãn)']);
    payrollColumns.forEach((column, index) => {
      if (index < 3 || ['Ghi chú', 'Số tài khoản'].includes(column.title))
        return;
      const source = workbook.getWorksheet('Tính lương')!.getCell(5, index + 1);
      sheet.addRow([
        column.title,
        {
          formula: `'Tính lương'!${source.address}`,
          result: Number(column.value(row))
        }
      ]);
    });
    sheet.addRow(['Ghi chú', row.adjustments.note]);
    styleSheet(sheet, 6);
    sheet.getColumn(1).width = 46;
    sheet.getColumn(2).width = 48;
    sheet.pageSetup.orientation = 'portrait';
    sheet.pageSetup.fitToHeight = 1;
    workbook.views = [
      {
        x: 0,
        y: 0,
        width: 1200,
        height: 800,
        visibility: 'visible',
        firstSheet: 0,
        activeTab: workbook.worksheets.length - 1
      }
    ];
  } else {
    const salary = workbook.addWorksheet('Tính lương');
    salary.addRow(['VINH VINH PHÁT — BẢNG LƯƠNG NHÁP']);
    salary.addRow([period]);
    salary.addRow([
      'Có công thức: sửa ô nhập màu xanh, không ghi đè ô công thức. Xem sheet Công thức để đối chiếu mẫu. Không import vào luồng lương cũ.'
    ]);
    salary.addRow(payrollColumns.map((column) => column.title));
    draft.rows.forEach((row, index) => {
      const excelRow = salary.addRow(
        payrollColumns.map((column) => column.value(row))
      );
      const formulas = payrollExcelFormulas(index + 5, draft.rows.length);
      Object.entries(formulas).forEach(([column, formula]) => {
        const cell = salary.getCell(`${column}${excelRow.number}`);
        cell.value = { formula, result: cell.value as string | number };
      });
    });
    const totals = salary.addRow(
      payrollColumns.map((column, index) =>
        index === 0
          ? 'TỔNG CỘNG'
          : typeof column.value(draft.rows[0]) === 'number'
            ? draft.rows.reduce(
                (sum, row) => sum + Number(column.value(row)),
                0
              )
            : ''
      )
    );
    totals.font = { bold: true };
    styleSheet(salary, 4);
    totals.eachCell((cell, column) => {
      if (typeof cell.value === 'number') {
        const letter = salary.getColumn(column).letter;
        cell.value = {
          formula: `SUM(${letter}5:${letter}${totals.number - 1})`,
          result: cell.value
        };
      }
      cell.font = { name: 'Arial', size: 11, bold: true };
    });
    for (let row = 5; row < totals.number; row++) {
      salary.getRow(row).eachCell((cell) => {
        cell.font = {
          name: 'Arial',
          size: 11,
          color: {
            argb:
              cell.type === ExcelJS.ValueType.Formula ? 'FF111827' : 'FF0000FF'
          }
        };
      });
    }
    salary.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + draft.rows.length, column: payrollColumns.length }
    };

    const profiles = workbook.addWorksheet('Danh muc');
    profiles.addRow(['VINH VINH PHÁT — DANH MỤC LƯƠNG']);
    profiles.addRow([period]);
    for (let i = 3; i <= 6; i++) profiles.addRow([]);
    profiles.addRow([
      'Stt',
      'Mã NV',
      'Tên NV',
      'Bộ phận',
      'Số tài khoản',
      'Lương căn bản',
      'Phụ cấp trách nhiệm',
      'Phụ cấp nhà ở/ ngày',
      'Hỗ trợ đi lại/ ngày',
      'Phụ cấp cơm trưa/ ngày',
      'Chuyên cần',
      'Căn cứ BH',
      'Căn cứ đoàn phí',
      'Số người phụ thuộc',
      'Lương CB chính thức/26 ngày (mẫu cũ)',
      'Ngân hàng',
      'Mã ngân hàng (BIN)'
    ]);
    draft.rows.forEach(({ profile: p }, i) =>
      profiles.addRow([
        i + 1,
        payrollEmployeeCode(p),
        p.name,
        p.department,
        p.bankAccount,
        p.basicSalary,
        p.responsibility,
        p.housingPerDay,
        p.travelPerDay,
        p.mealPerDay,
        p.diligence,
        p.insuranceBase,
        p.unionBase,
        p.dependents,
        p.legacySalary26Days ?? 0,
        payrollBankName(payrollBankBin(p)),
        payrollBankBin(p)
      ])
    );
    styleSheet(profiles, 7);

    const hours = workbook.addWorksheet('Tổng hợp công');
    hours.addRow([period]);
    hours.addRow([
      'Mã NV',
      'Tên NV',
      'Giờ ngày',
      'Giờ đêm',
      'Tăng ca ngày',
      'Tăng ca đêm',
      'Tăng cường',
      'Số dòng công',
      'Xác nhận không có giờ công',
      'Có phép (ngày)',
      'Không phép (ngày)'
    ]);
    draft.rows.forEach((row) =>
      hours.addRow([
        payrollEmployeeCode(row.profile),
        row.profile.name,
        row.hours.day,
        row.hours.night,
        row.hours.dayOvertime,
        row.hours.nightOvertime,
        row.hours.reinforcement,
        row.hours.records,
        row.adjustments.noAttendanceConfirmed ? 'Có' : 'Không',
        row.adjustments.authorizedLeaveDays ?? 0,
        row.adjustments.unauthorizedLeaveDays ?? 0
      ])
    );
    styleSheet(hours, 2);

    const config = workbook.addWorksheet('Cấu hình');
    config.addRow(['Cấu hình áp dụng cho bản nháp', 'Giá trị']);
    payrollRuleKeys.forEach((key) => config.addRow([key, draft.rules[key]]));
    config.addRow([
      'Thuế',
      'Lũy tiến cá nhân cư trú 2026: 5%, 10%, 20%, 30%, 35%; mốc 10, 30, 60, 100 triệu/tháng.'
    ]);
    config.addRow([
      'Miễn thuế',
      'Nhập số tiền đã được người phụ trách xác nhận; không tự miễn toàn bộ nhà ở/cơm.'
    ]);
    config.addRow([
      'Phạm vi',
      'Không tự tách tăng ca lương cũ/mới, phụ cấp tăng cường hoặc tiền phép năm thanh toán riêng.'
    ]);
    styleSheet(config, 1);
    config.getColumn(1).width = 32;
    config.getColumn(2).width = 80;
    config.eachRow((row) => {
      row.alignment = { wrapText: true, vertical: 'middle' };
      row.height = 42;
    });
    const formulas = workbook.addWorksheet('Công thức');
    formulas.addRow(['ĐỐI CHIẾU CÔNG THỨC']);
    formulas.addRow([
      'Ví dụ nhân viên đầu tiên ở dòng 5 của Tính lương. Cột/địa chỉ khác mẫu gốc; xem ghi chú về khác biệt nghiệp vụ.'
    ]);
    formulas.addRow([
      'Ô xuất',
      'Khoản',
      'Công thức đang dùng',
      'Đối chiếu mẫu gốc'
    ]);
    Object.entries(payrollExcelFormulas(5, draft.rows.length)).forEach(
      ([column, formula]) => {
        const index = salary.getColumn(column).number - 1;
        formulas.addRow([
          `${column}5`,
          payrollColumns[index].title,
          `=${formula}`,
          payrollFormulaNotes[column] ??
            'Lấy dữ liệu theo mã nhân viên hoặc cấu hình; không ghép theo tên/vị trí dòng.'
        ]);
      }
    );
    styleSheet(formulas, 3);
    formulas.getColumn(1).width = 12;
    formulas.getColumn(2).width = 28;
    formulas.getColumn(3).width = 100;
    formulas.getColumn(4).width = 80;
    formulas.eachRow((row, index) => {
      row.alignment = { vertical: 'top', wrapText: true };
      if (index > 3) row.height = 105;
    });
  }
  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook.xlsx.writeBuffer();
}
