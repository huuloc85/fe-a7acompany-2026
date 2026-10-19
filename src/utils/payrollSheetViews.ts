import type { AttendanceResult } from './attendanceUtil';
import { payrollEmployeeCode } from './payrollIdentity.ts';
import type { PayrollDraft, PayrollProfile } from './payrollCalculation';
import { payrollSheetSchema } from './payrollSheetSchema.ts';
import type { PayrollSheetSchema } from './payrollSheetSchema';

export type SheetValue = string | number | null;
export interface SheetRecord {
  id: string;
  sourceRow: number;
  profile: PayrollProfile;
  values: SheetValue[];
}
export interface SheetView {
  schema: PayrollSheetSchema;
  records: SheetRecord[];
  note: string;
}
export function excelColumn(index: number): string {
  let result = '';
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
}
export function periodDates(start: string, end: string): string[] {
  const dates: string[] = [];
  for (
    let d = new Date(start + 'T00:00:00Z');
    d.toISOString().slice(0, 10) <= end;
    d.setUTCDate(d.getUTCDate() + 1)
  )
    dates.push(d.toISOString().slice(0, 10));
  return dates;
}
export const isReinforcement = (entry: AttendanceResult) =>
  entry.hnhc === 'LN' || entry.hnhc === 'TC';
const dateLabel = (date: string) => date.slice(8, 10) + '/' + date.slice(5, 7);

// View mapping only. The existing payroll engine still owns calculations and validation.
// null means unavailable; never invent a zero for an unsupported template field.
export function buildPayrollSheetView(
  name: string,
  profiles: PayrollProfile[],
  attendance: AttendanceResult[] | null,
  draft: PayrollDraft | null,
  start: string,
  end: string
): SheetView {
  const original = payrollSheetSchema.find((sheet) => sheet.name === name);
  if (!original) throw new Error('Unknown payroll sheet');
  const schema = structuredClone(original);
  const dates = periodDates(start, end);
  const entries = (attendance ?? []).filter(
    (e) =>
      e.date >= start &&
      e.date <= end &&
      profiles.some(
        (profile) =>
          String(profile.attendanceEmployeeId || profile.employeeId).trim() ===
          String(e.employee_id).trim()
      )
  );
  let detailDates = dates;
  let note =
    'Ô — chưa có dữ liệu hoặc chưa hỗ trợ tính. Bấm tên nhân viên để điều chỉnh hồ sơ/khoản phát sinh.';
  if (name === ' Bảng nhập công') {
    const prefix = schema.headers[0].filter((h) => h.column <= 10);
    const suffix = schema.headers[0]
      .filter((h) => h.column >= 104)
      .map((h, i) => ({ ...h, column: 11 + dates.length * 3 + i }));
    schema.headers = [
      [
        ...prefix,
        ...dates.map((d, i) => ({
          column: 11 + i * 3,
          label: dateLabel(d),
          colSpan: 3,
          rowSpan: 1
        })),
        ...suffix
      ],
      dates.flatMap((_, i) =>
        ['Ngày', 'Đêm', 'Tăng ca'].map((label, j) => ({
          column: 11 + i * 3 + j,
          label,
          colSpan: 1,
          rowSpan: 1
        }))
      )
    ];
    schema.columnCount = 13 + dates.length * 3;
    note =
      'Công lấy từ web theo từng ngày, không nhập Excel. Ngày/Đêm/Tăng ca là giờ. LN/TC nằm riêng ở sheet tính tăng cường, không cộng trùng. Tăng ca ở đây là toàn bộ giờ trên web, chưa tách lương cũ/mới như file mẫu.';
  } else if (name === 'Tăng ca-Tăng cường-Phép năm') {
    detailDates = dates.filter((d) => d.slice(0, 7) === start.slice(0, 7));
    const prefix = schema.headers[0]
      .filter((h) => h.column <= 12)
      .map((h) => ({
        ...h,
        rowSpan: 2,
        label: h.label
          .replace('tháng 9', `tháng ${Number(end.slice(5, 7))}`)
          .replace('tháng 8', `tháng ${Number(start.slice(5, 7))}`)
      }));
    schema.headers = [
      [
        ...prefix,
        ...detailDates.map((d, i) => ({
          column: 13 + i * 3,
          label: dateLabel(d),
          colSpan: 3,
          rowSpan: 1
        }))
      ],
      detailDates.flatMap((_, i) =>
        [
          'tách 1 giờ tăng ca tính vào lương mới',
          'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          'Tăng ca'
        ].map((label, j) => ({
          column: 13 + i * 3 + j,
          label,
          colSpan: 1,
          rowSpan: 1
        }))
      )
    ];
    schema.columnCount = 12 + detailDates.length * 3;
    note =
      'Giữ bố cục mẫu. Chưa tách tăng ca lương cũ/mới, tiền phép năm, tiền hết việc và tổng tiền mặt nên các ô đó để —. Cột Tăng ca theo ngày lấy giờ từ web. Lương tăng cường hiện chỉ gồm tiền giờ, chưa gồm phụ cấp riêng; không dùng bảng này để chi trả.';
  } else if (name === 'tính tăng cường') {
    detailDates = [
      ...new Set([
        ...dates.slice(-6),
        ...entries.filter(isReinforcement).map((e) => e.date)
      ])
    ].sort();
    schema.headers = [
      [
        ...schema.headers[0].filter((h) => h.column < 4),
        {
          column: 4,
          label: 'NGÀY TĂNG CƯỜNG',
          colSpan: detailDates.length,
          rowSpan: 1
        },
        ...schema.headers[0]
          .filter((h) => h.column >= 10)
          .map((h) => ({ ...h, column: h.column + detailDates.length - 6 }))
      ],
      detailDates.map((d, i) => ({
        column: 4 + i,
        label: dateLabel(d),
        colSpan: 1,
        rowSpan: 1
      }))
    ];
    schema.columnCount = 13 + detailDates.length;
    note =
      'Giờ tăng cường lấy từ LN/TC trên web, tách khỏi tổng lương chính. Phụ cấp riêng chưa có dữ liệu nên để —; chưa dùng bảng này làm tổng thanh toán tăng cường.';
  } else if (name === 'Tính lương') {
    note =
      'Giữ cột A–AR như mẫu. Chuyên cần dùng số tiền đã duyệt, không tự giảm theo ngày nghỉ. Tăng cường tách khỏi lương chính. Thu nhập bổ sung, tạm ứng và khấu trừ khác chỉ áp dụng khi có nhập. Xem Cấu hình để biết tỷ lệ đang áp dụng.';
  } else if (schema.hidden) {
    note =
      'Sheet ẩn trong file gốc. Chỉ hiển thị dữ liệu có nguồn từ hệ thống; các khoản/chức năng cũ chưa được nối để —, không sao chép dữ liệu lịch sử từ Excel.';
  }
  const records: SheetRecord[] = [];
  profiles.forEach((p, index) => {
    const r = draft?.rows.find(
      (row) =>
        String(row.profile.employeeId).trim() === String(p.employeeId).trim()
    );
    const a = r?.adjustments;
    const own = entries.filter(
      (e) =>
        String(e.employee_id).trim() ===
        (p.attendanceEmployeeId || p.employeeId).trim()
    );
    const daily = (date: string) => own.filter((e) => e.date === date);
    const regular = (date: string, shift: number) =>
      daily(date)
        .filter((e) => !isReinforcement(e) && e.shift === shift)
        .reduce((sum, e) => sum + e.administrative_hours, 0);
    const overtime = (date: string) =>
      daily(date)
        .filter((e) => !isReinforcement(e))
        .reduce((sum, e) => sum + e.overtime_hours, 0);
    const extra = (date: string) =>
      daily(date)
        .filter(isReinforcement)
        .reduce((sum, e) => sum + e.total_hours, 0);
    const ids: SheetValue[] = [
      index + 1,
      payrollEmployeeCode(p),
      p.name,
      p.department
    ];
    let values: SheetValue[] = Array(schema.columnCount).fill(null);
    if (name === 'Danh muc')
      values = [
        ...ids,
        p.bankAccount,
        p.basicSalary,
        p.responsibility,
        p.housingPerDay,
        p.travelPerDay,
        p.mealPerDay,
        p.diligence,
        p.legacySalary26Days ?? null
      ];
    else if (name === 'Tính lương' && r && a)
      values = [
        ...ids,
        r.dayDays,
        r.daySalary,
        r.nightDays,
        r.nightSalary,
        r.hours.dayOvertime,
        r.dayOvertimeSalary,
        r.hours.nightOvertime,
        r.nightOvertimeSalary,
        r.dayDays + r.nightDays,
        r.housing,
        r.travel,
        r.meal,
        a.downtimeDays,
        r.downtimeSalary,
        a.holidayDays,
        r.holidaySalary,
        a.paidLeaveDays,
        r.paidLeaveSalary,
        a.note,
        a.authorizedLeaveDays ?? 0,
        a.unauthorizedLeaveDays ?? 0,
        r.diligence,
        a.menstrualHours,
        r.menstrualSalary,
        a.bonus,
        a.referral,
        r.gross,
        r.union,
        r.social,
        r.health,
        r.unemployment,
        r.personalDeduction,
        r.dependentDeduction,
        a.taxExemptIncome,
        r.taxable,
        r.tax,
        r.net,
        r.social + r.health + r.unemployment,
        (p.basicSalary + p.responsibility) * 0.215,
        (p.basicSalary + p.responsibility) * 0.02,
        a.otherIncome,
        a.advance,
        a.otherDeduction
      ];
    else if (name === ' Bảng nhập công')
      values = [
        ...ids,
        r?.hours.day ?? null,
        r?.dayDays ?? null,
        r?.hours.night ?? null,
        r?.nightDays ?? null,
        r?.hours.dayOvertime ?? null,
        r?.hours.nightOvertime ?? null,
        ...dates.flatMap((d) =>
          attendance === null
            ? [null, null, null]
            : [regular(d, 1), regular(d, 2), overtime(d)]
        ),
        attendance === null
          ? null
          : new Set(
              own
                .filter(
                  (e) =>
                    isReinforcement(e) && e.shift === 1 && e.total_hours > 0
                )
                .map((e) => e.date)
            ).size,
        a?.note ?? '',
        ''
      ];
    else if (name === 'Tăng ca-Tăng cường-Phép năm')
      values = [
        ...ids,
        p.legacySalary26Days ?? null,
        null,
        null,
        r?.reinforcementSalary ?? null,
        null,
        null,
        null,
        '',
        ...detailDates.flatMap((d) => [
          null,
          null,
          attendance === null ? null : overtime(d)
        ])
      ];
    else if (name === 'tính tăng cường') {
      if (!own.some((e) => isReinforcement(e) && e.total_hours > 0)) return;
      values = [
        records.length + 1,
        p.name,
        p.department,
        ...detailDates.map(extra),
        r?.hours.reinforcement ?? null,
        p.basicSalary,
        p.responsibility,
        draft
          ? ((p.basicSalary + p.responsibility) /
              (draft.rules.standardDays * draft.rules.hoursPerDay)) *
            draft.rules.reinforcementMultiplier
          : null,
        null,
        null,
        null,
        null,
        null,
        ''
      ];
    } else if (name === 'Tiền lễ 2-9')
      values = [
        index + 1,
        payrollEmployeeCode(p),
        p.name,
        '',
        p.department,
        p.bankAccount,
        null
      ];
    else if (name === 'Sheet1')
      values = [index + 1, p.name, p.department, null];
    else if (name === 'Bang Thanh Toan Luong')
      values = [
        ...ids,
        r?.gross ?? null,
        r ? r.social + r.health + r.unemployment : null,
        r?.union ?? null,
        a?.advance ?? null,
        null,
        null,
        r?.net ?? null,
        p.bankAccount
      ];
    else if (name === 'Bảng tính toán') {
      values.splice(0, 4, ...ids);
      const mapped: Record<number, SheetValue> = {
        5: p.legacySalary26Days ?? null,
        7: p.diligence,
        9: p.responsibility,
        12: p.basicSalary,
        13: draft
          ? p.basicSalary / (draft.rules.standardDays * draft.rules.hoursPerDay)
          : null,
        14: p.housingPerDay,
        15: draft ? p.responsibility / draft.rules.standardDays : null,
        16: p.travelPerDay,
        18: p.mealPerDay,
        31: a?.referral ?? null,
        43: r?.gross ?? null,
        44: r ? r.social + r.health + r.unemployment : null,
        46: a?.advance ?? null,
        48: r?.union ?? null,
        60: r?.net ?? null,
        62: Math.round(p.insuranceBase * 0.215)
      };
      for (const [col, value] of Object.entries(mapped))
        values[Number(col) - 1] = value;
    } else if (name === 'Data chấm công') {
      own.forEach((e, i) =>
        records.push({
          id: `${p.employeeId}-${i}`,
          sourceRow: schema.dataRow + records.length,
          profile: p,
          values: [
            '',
            e.date,
            String(e.employee_id),
            p.name,
            e.shift,
            p.department,
            e.time_in ?? '',
            e.time_out ?? '',
            !isReinforcement(e) && e.shift === 1 ? e.administrative_hours : 0,
            !isReinforcement(e) && e.shift === 2 ? e.administrative_hours : 0,
            !isReinforcement(e) ? e.overtime_hours : 0,
            e.total_hours,
            '',
            null,
            null,
            null,
            null,
            null,
            '',
            null,
            null,
            null
          ]
        })
      );
      return;
    } else values.splice(0, 4, ...ids);
    records.push({
      id: p.employeeId,
      sourceRow: schema.dataRow + index,
      profile: p,
      values
    });
  });
  return { schema, records, note };
}
