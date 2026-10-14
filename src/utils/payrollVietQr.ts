// VietQR account transfer (QRIBFTTA), VCB BIN confirmed by the user.
// Structure reference: https://github.com/subiz/vietqr/blob/master/vietqr.go
// Bank reference: https://casso.vn/api-vietcombank/
export const payrollBank = {
  name: 'Vietcombank (VCB)',
  bin: '970436'
} as const;

export function crc16Ccitt(value: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function field(id: string, value: string) {
  const length = new TextEncoder().encode(value).length;
  if (length > 99) throw new Error('Nội dung QR vượt độ dài cho phép.');
  return id + String(length).padStart(2, '0') + value;
}

export function buildPayrollVietQr(
  account: string,
  amount: number,
  employeeId: string,
  endDate: string,
  bankBin: string = payrollBank.bin
) {
  // Catalogue accounts use spaces/dots as grouping separators. Keep leading zeros;
  // reject other characters rather than guessing or converting to a number.
  const accountNumber = account.trim().replace(/[\s.]/g, '');
  if (!/^\d{6,19}$/.test(accountNumber))
    throw new Error(
      'Số tài khoản chưa hợp lệ: cần 6–19 chữ số. Hãy kiểm tra danh mục.'
    );
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    String(amount).length > 13
  )
    throw new Error('Thực lãnh phải là số nguyên dương hợp lệ.');
  if (!/^\d{4}-(0[1-9]|1[0-2])-15$/.test(endDate))
    throw new Error('Kỳ lương chưa hợp lệ.');
  if (!/^[A-Za-z0-9_-]+$/.test(employeeId))
    throw new Error('Mã nhân viên không hợp lệ để tạo nội dung chuyển khoản.');
  const memo = `LUONG ${endDate.slice(5, 7)}/${endDate.slice(0, 4)} ${employeeId}`;
  if (memo.length > 25)
    throw new Error(
      'Mã nhân viên quá dài cho nội dung QR (tối đa 25 ký tự cả nội dung).'
    );
  if (!/^\d{6}$/.test(bankBin))
    throw new Error('Chọn ngân hàng nhận tiền trong danh mục để tạo QR.');
  const beneficiary = field('00', bankBin) + field('01', accountNumber);
  const merchant =
    field('00', 'A000000727') +
    field('01', beneficiary) +
    field('02', 'QRIBFTTA');
  // Static QR can be scanned repeatedly; never promise one-time payment or automatic expiry.
  const payload =
    field('00', '01') +
    field('01', '11') +
    field('38', merchant) +
    field('53', '704') +
    field('54', String(amount)) +
    field('58', 'VN') +
    field('62', field('08', memo)) +
    '6304';
  return {
    payload: payload + crc16Ccitt(payload),
    accountNumber,
    amount,
    memo
  };
}
