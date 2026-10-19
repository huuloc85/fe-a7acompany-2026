import type { PayrollRules } from './payrollCalculation';

// Explicit order keeps the formula references stable when rule objects are reordered.
export const payrollRuleKeys: (keyof PayrollRules)[] = [
  'standardDays',
  'hoursPerDay',
  'nightMultiplier',
  'dayOvertimeMultiplier',
  'nightOvertimeMultiplier',
  'reinforcementMultiplier',
  'socialRate',
  'healthRate',
  'unemploymentRate',
  'unionRate',
  'personalDeduction',
  'dependentDeduction'
];

export function payrollExcelFormulas(
  row: number,
  employeeCount: number
): Record<string, string> {
  const config = (key: keyof PayrollRules) =>
    `'Cấu hình'!$B$${payrollRuleKeys.indexOf(key) + 2}`;
  const profile = (column: string) =>
    `INDEX('Danh muc'!$${column}$8:$${column}$${employeeCount + 7},MATCH($A${row},'Danh muc'!$B$8:$B$${employeeCount + 7},0))`;
  const hours = (column: string) =>
    `INDEX('Tổng hợp công'!$${column}$3:$${column}$${employeeCount + 2},MATCH($A${row},'Tổng hợp công'!$A$3:$A$${employeeCount + 2},0))`;
  const daily = `(${profile('F')}+${profile('G')})/${config('standardDays')}`;
  const hourly = `${daily}/${config('hoursPerDay')}`;
  const taxable = `AJ${row}`;
  return {
    B: profile('C'),
    C: profile('D'),
    D: `${hours('C')}/${config('hoursPerDay')}`,
    E: `ROUND(${daily}*D${row},0)`,
    F: `${hours('D')}/${config('hoursPerDay')}`,
    G: `ROUND(${daily}*F${row}*${config('nightMultiplier')},0)`,
    H: hours('E'),
    I: `ROUND(${hourly}*H${row}*${config('dayOvertimeMultiplier')},0)`,
    J: hours('F'),
    K: `ROUND(${hourly}*J${row}*${config('nightOvertimeMultiplier')},0)`,
    L: `D${row}+F${row}`,
    M: `ROUND(L${row}*${profile('H')},0)`,
    N: `ROUND(L${row}*${profile('I')},0)`,
    O: `ROUND(L${row}*${profile('J')},0)`,
    Q: `ROUND(${daily}*P${row},0)`,
    S: `ROUND(${daily}*R${row},0)`,
    U: `ROUND(${daily}*T${row},0)`,
    Y: `ROUND(${hourly}*X${row},0)`,
    AB: `SUM(E${row},G${row},I${row},K${row},M${row}:O${row},Q${row},S${row},U${row},W${row},Y${row}:AA${row},AO${row})`,
    AC: `(${profile('F')}+${profile('G')})*${config('unionRate')}`,
    AD: `(${profile('F')}+${profile('G')})*${config('socialRate')}`,
    AE: `(${profile('F')}+${profile('G')})*${config('healthRate')}`,
    AF: `(${profile('F')}+${profile('G')})*${config('unemploymentRate')}`,
    AG: config('personalDeduction'),
    AH: `${profile('N')}*${config('dependentDeduction')}`,
    AJ: `MAX(0,AB${row}-SUM(AD${row}:AG${row})-AI${row})`,
    AK: `ROUND(IF(${taxable}<=10000000,${taxable}*5%,IF(${taxable}<=30000000,(${taxable}-10000000)*10%+500000,IF(${taxable}<=60000000,(${taxable}-30000000)*20%+2500000,IF(${taxable}<=100000000,(${taxable}-60000000)*30%+8500000,(${taxable}-100000000)*35%+20500000)))),0)`,
    AL: `AB${row}-SUM(AC${row}:AF${row})-AK${row}-AP${row}-AQ${row}`,
    AM: hours('G'),
    AN: `ROUND(${hourly}*AM${row}*${config('reinforcementMultiplier')},0)`,
    AR: profile('E')
  };
}

export const payrollFormulaNotes: Record<string, string> = {
  D: 'Giờ ngày / 8, giữ nguyên độ chính xác khi tính tiền như Excel.',
  E: 'Mẫu F8: ROUND((Danh muc!F8 + Danh muc!G8) / 25 × E8, 0). Web lấy công chuẩn từ cấu hình.',
  F: 'Giờ đêm / 8, không làm tròn số công trước khi tính tiền.',
  G: 'Mẫu H8: (lương căn bản + trách nhiệm) / 25 × công đêm × 130%, làm tròn đồng.',
  I: 'Mẫu J8: (lương căn bản + trách nhiệm) / 200 × TC ngày × 150%. Chưa chia giờ theo lương cũ/mới.',
  K: 'Mẫu L8: (lương căn bản + trách nhiệm) / 200 × TC đêm × 170%.',
  M: 'Mẫu N8: ROUND((công ngày + công đêm) × phụ cấp nhà ở/ngày, 0).',
  N: 'Mẫu O8: ROUND((công ngày + công đêm) × phụ cấp đi lại/ngày, 0).',
  O: 'Mẫu P8: ROUND((công ngày + công đêm) × phụ cấp cơm/ngày, 0).',
  Q: 'Mẫu R8: ROUND((lương căn bản + trách nhiệm) / 25 × ngày ngừng việc, 0).',
  S: 'Mẫu T8: ROUND((lương căn bản + trách nhiệm) / 25 × ngày lễ, 0).',
  U: 'Cách tính như mẫu V8 (hiếu/hỷ); trên web dùng mục nghỉ hưởng lương.',
  Y: 'Mẫu AB8: ROUND((lương căn bản + trách nhiệm) / 200 × giờ hành kinh, 0).',
  AB: 'Cộng các khoản lương chính theo AE8. Tăng cường tách riêng; thu nhập bổ sung trên web chỉ cộng khi có nhập.',
  AC: 'Mẫu AF8: (lương căn bản + trách nhiệm) × 0,5%, không ROUND.',
  AD: 'Mẫu AG8: (lương căn bản + trách nhiệm) × 8%, không ROUND.',
  AE: 'Mẫu AH8: (lương căn bản + trách nhiệm) × 1,5%, không ROUND.',
  AF: 'Mẫu AI8: (lương căn bản + trách nhiệm) × 1%, không ROUND.',
  AH: 'Hiển thị giảm trừ phụ thuộc nhưng không đưa vào AL/AM, theo công thức file được duyệt.',
  AJ: 'Trừ nhà ở, cơm, bảo hiểm và giảm trừ bản thân theo mẫu; miễn thuế bổ sung chỉ áp dụng khi có nhập.',
  AK: 'Cùng 5 bậc lũy tiến như mẫu AN8. Không giữ điều kiện tên trống thì tính 10%; bản này chỉ hỗ trợ diện lũy tiến.',
  AL: 'Mẫu AO8: AE8 − AF8 − AG8 − AH8 − AI8 − AN8. Web trừ thêm tạm ứng và khấu trừ khác.',
  AN: 'Công thức tăng cường: (lương căn bản + trách nhiệm) / giờ chuẩn × giờ tăng cường × hệ số. Chưa cộng tự động phụ cấp tăng cường.'
};
