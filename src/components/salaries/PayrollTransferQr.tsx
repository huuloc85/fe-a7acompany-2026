import { useState } from 'react';
import { Alert, Button, Descriptions, Modal, QRCode, Select } from 'antd';
import type { PayrollDraft, PayrollRow } from '@/utils/payrollCalculation';
import { buildPayrollVietQr } from '@/utils/payrollVietQr';
import { payrollBankBin } from '@/utils/payrollBanks';
import PayrollBankLabel from './PayrollBankLabel';
import { payrollEmployeeCode } from '@/utils/payrollIdentity';

export function PayslipTransferQr({
  row,
  endDate,
  blocked
}: {
  row: PayrollRow;
  endDate: string;
  blocked: boolean;
}) {
  if (blocked) return <Alert type="info" message="Đang cập nhật QR…" />;
  let result: ReturnType<typeof buildPayrollVietQr>;
  try {
    result = buildPayrollVietQr(
      row.profile.bankAccount,
      row.net,
      payrollEmployeeCode(row.profile),
      endDate,
      payrollBankBin(row.profile)
    );
  } catch (cause) {
    return (
      <Alert
        type="warning"
        message={cause instanceof Error ? cause.message : 'Không tạo được QR.'}
      />
    );
  }
  return (
    <aside className="vvp-payslip-qr" aria-label="QR chuyển khoản phiếu lương">
      <strong>Chuyển lương</strong>
      <PayrollBankLabel bin={payrollBankBin(row.profile)} />
      <div data-testid="payslip-transfer-qr">
        <QRCode
          value={result.payload}
          size={220}
          color="#000000"
          bgColor="#ffffff"
          errorLevel="M"
          type="svg"
        />
      </div>
      <strong>{row.profile.name}</strong>
      <span>STK: {result.accountNumber}</span>
      <strong>{result.amount.toLocaleString('vi-VN')} đ</strong>
      <span>{result.memo}</span>
      <small>
        Lương tạm tính. Kiểm tra tên chủ tài khoản, số tiền và lịch sử chuyển
        trước khi xác nhận trong ứng dụng ngân hàng.
      </small>
    </aside>
  );
}

export default function PayrollTransferQr({
  draft,
  ready
}: {
  draft: PayrollDraft | null;
  ready: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string>();
  const row =
    draft?.rows.find((r) => r.profile.employeeId === employeeId) ??
    draft?.rows[0];
  let result: ReturnType<typeof buildPayrollVietQr> | undefined;
  let error = '';
  if (row && draft) {
    try {
      result = buildPayrollVietQr(
        row.profile.bankAccount,
        row.net,
        payrollEmployeeCode(row.profile),
        draft.endDate,
        payrollBankBin(row.profile)
      );
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Không tạo được QR.';
    }
  }
  const allowed = ready && !!result;
  return (
    <>
      <Button
        disabled={!ready}
        onClick={() => {
          setOpen(true);
        }}
      >
        QR chuyển lương
      </Button>
      <Modal
        title="QR chuyển lương"
        open={open}
        onCancel={() => {
          setOpen(false);
        }}
        footer={<Button onClick={() => setOpen(false)}>Đóng</Button>}
        width={600}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          message="Chỉ chuyển sau khi chốt và đối chiếu lương"
          description="Kỳ trên web hiện là bản nháp. QR không xác minh chủ tài khoản, không tự chuyển tiền và không xác nhận đã trả lương. Mã có thể quét nhiều lần; kiểm tra lịch sử để tránh chuyển trùng."
        />
        <Select
          className="my-4 w-full"
          aria-label="Nhân viên chuyển lương"
          placeholder="Chọn nhân viên"
          value={row?.profile.employeeId}
          onChange={(id) => {
            setEmployeeId(id);
          }}
          showSearch
          optionFilterProp="label"
          options={draft?.rows.map((r) => ({
            value: r.profile.employeeId,
            label: `${payrollEmployeeCode(r.profile)} — ${r.profile.name}`
          }))}
        />
        {!ready && (
          <Alert
            type="error"
            message="Chưa có dữ liệu hoặc đang cập nhật bảng lương."
          />
        )}
        {error && <Alert type="error" message={error} />}
        {row && result && (
          <>
            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                {
                  key: 'name',
                  label: 'Nhân viên (theo danh mục)',
                  children: row.profile.name
                },
                {
                  key: 'bank',
                  label: 'Ngân hàng',
                  children: (
                    <PayrollBankLabel bin={payrollBankBin(row.profile)} />
                  )
                },
                {
                  key: 'account',
                  label: 'Số tài khoản',
                  children: result.accountNumber
                },
                {
                  key: 'period',
                  label: 'Kỳ lương',
                  children: `${draft?.startDate} — ${draft?.endDate}`
                },
                {
                  key: 'amount',
                  label: 'Số tiền thực lãnh',
                  children: `${result.amount.toLocaleString('vi-VN')} đ`
                },
                { key: 'memo', label: 'Nội dung', children: result.memo }
              ]}
            />
            {allowed && (
              <div
                className="flex flex-col items-center gap-3"
                data-testid="payroll-transfer-qr"
              >
                <QRCode
                  value={result.payload}
                  size={280}
                  color="#000000"
                  bgColor="#ffffff"
                  errorLevel="M"
                  type="svg"
                />
                <p>
                  Quét bằng ứng dụng ngân hàng. Kiểm tra tên chủ tài khoản do
                  ngân hàng trả về, số tiền và nội dung trước khi xác nhận
                  chuyển.
                </p>
                <p className="text-sm">
                  QR được tạo tại trình duyệt. Không gửi dữ liệu sang dịch vụ
                  tạo QR. Ảnh đã chụp không tự hết hiệu lực khi lương thay đổi.
                </p>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
