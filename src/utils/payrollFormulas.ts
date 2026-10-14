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
    D: `ROUND(${hours('C')}/${config('hoursPerDay')},2)`,
    E: `ROUND(${daily}*D${row},0)`,
    F: `ROUND(${hours('D')}/${config('hoursPerDay')},2)`,
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
    AB: `SUM(E${row},G${row},I${row},K${row},M${row}:O${row},Q${row},S${row},U${row},W${row},Y${row}:AA${row},AN${row}:AO${row})`,
    AC: `ROUND(${profile('M')}*${config('unionRate')},0)`,
    AD: `ROUND(${profile('L')}*${config('socialRate')},0)`,
    AE: `ROUND(${profile('L')}*${config('healthRate')},0)`,
    AF: `ROUND(${profile('L')}*${config('unemploymentRate')},0)`,
    AG: config('personalDeduction'),
    AH: `${profile('N')}*${config('dependentDeduction')}`,
    AJ: `MAX(0,AB${row}-SUM(AD${row}:AI${row}))`,
    AK: `ROUND(IF(${taxable}<=10000000,${taxable}*5%,IF(${taxable}<=30000000,(${taxable}-10000000)*10%+500000,IF(${taxable}<=60000000,(${taxable}-30000000)*20%+2500000,IF(${taxable}<=100000000,(${taxable}-60000000)*30%+8500000,(${taxable}-100000000)*35%+20500000)))),0)`,
    AL: `AB${row}-SUM(AC${row}:AF${row})-AK${row}-AP${row}-AQ${row}`,
    AM: hours('G'),
    AN: `ROUND(${hourly}*AM${row}*${config('reinforcementMultiplier')},0)`,
    AR: profile('E')
  };
}

export const payrollFormulaNotes: Record<string, string> = {
  D: 'Như mẫu: ROUND(giờ ngày / 8, 2); số giờ/công lấy từ cấu hình.',
  E: 'Mẫu F8: ROUND((Danh muc!F8 + Danh muc!G8) / 25 × E8, 0). Web lấy công chuẩn từ cấu hình.',
  F: 'Như mẫu: ROUND(giờ đêm / 8, 2).',
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
  AB: 'Mẫu AE8 cộng các khoản thu nhập. Web cộng thêm tăng cường và thu nhập bổ sung, mỗi khoản một lần.',
  AC: 'Mẫu AF8: (lương căn bản + trách nhiệm) × 0,5%. Web dùng căn cứ đoàn phí riêng và làm tròn đồng.',
  AD: 'Mẫu AG8: (lương căn bản + trách nhiệm) × 8%. Web dùng căn cứ BH riêng và làm tròn đồng.',
  AE: 'Mẫu AH8: (lương căn bản + trách nhiệm) × 1,5%. Web dùng căn cứ BH riêng và làm tròn đồng.',
  AF: 'Mẫu AI8: (lương căn bản + trách nhiệm) × 1%. Web dùng căn cứ BH riêng và làm tròn đồng.',
  AH: 'Khác mẫu: khoản giảm trừ phụ thuộc được đưa vào phép trừ thu nhập tính thuế; không bỏ sót như liên kết AL9 của mẫu.',
  AJ: 'Mẫu AL8 cộng nhà ở, cơm, BH, giảm trừ bản thân; web tự miễn thuế nhà ở/cơm theo mẫu, cộng miễn thuế xác nhận và giảm trừ phụ thuộc riêng.',
  AK: 'Cùng 5 bậc lũy tiến như mẫu AN8. Không giữ điều kiện tên trống thì tính 10%; bản này chỉ hỗ trợ diện lũy tiến.',
  AL: 'Mẫu AO8: AE8 − AF8 − AG8 − AH8 − AI8 − AN8. Web trừ thêm tạm ứng và khấu trừ khác.',
  AN: 'Công thức tăng cường: (lương căn bản + trách nhiệm) / giờ chuẩn × giờ tăng cường × hệ số. Chưa cộng tự động phụ cấp tăng cường.'
};
