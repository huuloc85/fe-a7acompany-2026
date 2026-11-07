import { useMemo, useState } from 'react';
import { Alert, Modal, Space, Table, message } from 'antd';
import Button from '@components/common/AppButton';
import type {
  PayrollDraft,
  PayrollProfile,
  PayrollRow
} from '@/utils/payrollCalculation';
import {
  applyApprovedOctoberExclusions,
  readPayrollExcelValues
} from '@/utils/payrollExcelValues';
import { getApiErrorMessage } from '@/utils/apiError';

const comparedAmounts = {
  dayDays: 'Công ngày',
  nightDays: 'Công đêm',
  daySalary: 'Lương ca ngày',
  nightSalary: 'Lương ca đêm',
  dayOvertimeSalary: 'Tăng ca ngày',
  nightOvertimeSalary: 'Tăng ca đêm',
  reinforcementSalary: 'Tăng cường',
  housing: 'Nhà ở',
  travel: 'Đi lại',
  meal: 'Cơm',
  downtimeSalary: 'Ngừng việc',
  holidaySalary: 'Lễ',
  paidLeaveSalary: 'Nghỉ hưởng lương',
  menstrualSalary: 'Hành kinh',
  diligence: 'Chuyên cần',
  gross: 'Tổng thu nhập',
  union: 'Đoàn phí',
  social: 'BHXH',
  health: 'BHYT',
  unemployment: 'BHTN',
  personalDeduction: 'Giảm trừ bản thân',
  dependentDeduction: 'Giảm trừ phụ thuộc',
  taxable: 'Thu nhập tính thuế',
  tax: 'Thuế TNCN',
  net: 'Thực lãnh'
} satisfies Partial<Record<keyof PayrollRow, string>>;

export default function PayrollReferenceImport({
  period,
  profiles,
  disabled,
  onSave,
  currentDraft
}: {
  period: string;
  profiles: PayrollProfile[];
  disabled: boolean;
  onSave: (draft: PayrollDraft) => Promise<void>;
  currentDraft?: PayrollDraft;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rawDraft, setDraft] = useState<PayrollDraft | null>(null);
  const draft = useMemo(
    () => rawDraft && applyApprovedOctoberExclusions(rawDraft),
    [rawDraft]
  );
  const [error, setError] = useState('');
  async function read(files: File[]) {
    setDraft(null);
    setError('');
    setBusy(true);
    try {
      if (!files.length || files.length > 2)
        throw new Error('Chọn file Excel của công ty đang sửa.');
      const inputs = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          buffer: await file.arrayBuffer()
        }))
      );
      const imported = await readPayrollExcelValues(inputs, period, profiles);
      if (
        currentDraft &&
        new Set(
          currentDraft.rows.map((row) => row.profile.company?.toLowerCase())
        ).size < 2
      )
        throw new Error(
          'Mở Tính lương để nhập thay toàn bộ hai công ty cùng lúc.'
        );
      setDraft(imported);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : getApiErrorMessage(cause, 'Chưa đọc được bảng lương Excel.')
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft || draft.issues.length || busy || disabled) return;
    setBusy(true);
    try {
      await onSave(draft);
      setOpen(false);
      setDraft(null);
    } catch (cause) {
      message.error(
        getApiErrorMessage(cause, 'Chưa lưu được bản nháp từ Excel.')
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          setDraft(null);
          setError('');
        }}
      >
        Nhập bảng lương Excel
      </Button>
      <Modal
        title={`Nhập bảng lương tháng ${period}`}
        open={open}
        width={850}
        onCancel={() => {
          if (!busy) setOpen(false);
        }}
        okText={
          currentDraft ? 'Áp dụng vào bản đang sửa' : 'Lưu bản nháp từ Excel'
        }
        cancelText="Đóng"
        confirmLoading={busy}
        okButtonProps={{
          disabled: disabled || !draft || !!draft.issues.length
        }}
        onOk={() => void save()}
      >
        <Space direction="vertical" className="w-full">
          <Alert
            type="info"
            message="Giữ nguyên kết quả Excel, không tính lại và không công bố."
            description="Chọn đủ hai file A7A và VVP. Nhập sheet Tính lương và TĂNG CƯỜNG TIỀN MẶT; không nhập sheet tiền mặt tổng hợp đang lỗi. Liên kết theo tên và công ty, giữ mã nhân viên web. Bản nháp cũ chỉ được thay thế khi lưu thành công."
          />
          <input
            type="file"
            accept=".xlsx,.xlsm"
            multiple
            disabled={busy}
            aria-label="Chọn bảng lương Excel"
            onChange={(event) =>
              void read(Array.from(event.target.files ?? []))
            }
          />
          {!!error && <Alert type="error" message={error} />}
          {draft && (
            <>
              <div>
                {draft.reconciliation!.excluded?.length
                  ? 'Tổng lương chính sau khi loại nhân viên'
                  : 'Tổng Excel'}
                :{' '}
                {Object.values(draft.reconciliation!.sourceTotals)
                  .reduce((a, b) => a + b, 0)
                  .toLocaleString('vi-VN')}{' '}
                đ. Đã liên kết: {draft.rows.length} dòng.
              </div>
              <div>
                Tăng cường tiền mặt:{' '}
                {draft.rows
                  .reduce((sum, row) => sum + (row.cashTotal ?? 0), 0)
                  .toLocaleString('vi-VN')}{' '}
                đ.
              </div>
              <div>
                <strong>
                  Tổng lương chính và tăng cường:{' '}
                  {draft.rows
                    .reduce(
                      (sum, row) => sum + row.net + (row.cashTotal ?? 0),
                      0
                    )
                    .toLocaleString('vi-VN')}{' '}
                  đ.
                </strong>
              </div>
              {!!draft.issues.length && (
                <Alert type="error" message={draft.issues.join(' ')} />
              )}
              {currentDraft && (
                <Table
                  size="small"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 700 }}
                  rowKey={(row) => row.profile.employeeId}
                  dataSource={draft.rows}
                  expandable={{
                    expandedRowRender: (row) => {
                      const old = currentDraft.rows.find(
                        (item) =>
                          (item.profile.attendanceEmployeeId ||
                            item.profile.employeeId) === row.profile.employeeId
                      );
                      const fields = Object.keys(
                        comparedAmounts
                      ) as (keyof typeof comparedAmounts)[];
                      const differences = fields.filter(
                        (key) => !old || Math.abs(old[key] - row[key]) > 0.001
                      );
                      const details = differences.map((key) => ({
                        key: String(key),
                        label: comparedAmounts[key],
                        before: old?.[key],
                        after: row[key]
                      }));
                      for (const [key, label] of [
                        ['referral', 'Giới thiệu nhân sự'],
                        ['bonus', 'Thưởng'],
                        ['menstrualHours', 'Giờ hành kinh'],
                        ['authorizedLeaveDays', 'Có phép'],
                        ['unauthorizedLeaveDays', 'Không phép'],
                        ['advance', 'Tạm ứng'],
                        ['otherDeduction', 'Khấu trừ khác'],
                        ['otherIncome', 'Thu nhập bổ sung']
                      ] as const) {
                        const before = old?.adjustments[key];
                        const after = row.adjustments[key] ?? 0;
                        if (
                          before === undefined ||
                          Math.abs(before - after) > 0.001
                        )
                          details.push({ key, label, before, after });
                      }
                      return details.length ? (
                        <Table
                          size="small"
                          pagination={false}
                          rowKey="key"
                          dataSource={details}
                          columns={[
                            { title: 'Khoản lương', dataIndex: 'label' },
                            {
                              title: 'Bản nháp',
                              dataIndex: 'before',
                              render: (n?: number) =>
                                n?.toLocaleString('vi-VN') ?? 'Chưa có'
                            },
                            {
                              title: 'Excel',
                              dataIndex: 'after',
                              render: (n: number) => n.toLocaleString('vi-VN')
                            }
                          ]}
                        />
                      ) : (
                        'Các khoản lương đã khớp Excel.'
                      );
                    }
                  }}
                  columns={[
                    {
                      title: 'Mã Excel',
                      render: (_, row) => row.source?.employeeCode
                    },
                    {
                      title: 'Mã web',
                      render: (_, row) => row.profile.employeeId
                    },
                    { title: 'Họ tên', render: (_, row) => row.profile.name },
                    {
                      title: 'Thực lãnh hiện tại',
                      render: (_, row) => {
                        const old = currentDraft.rows.find(
                          (item) =>
                            (item.profile.attendanceEmployeeId ||
                              item.profile.employeeId) ===
                            row.profile.employeeId
                        );
                        return old
                          ? old.net.toLocaleString('vi-VN')
                          : 'Chưa có';
                      }
                    },
                    {
                      title: 'Thực lãnh Excel',
                      render: (_, row) => row.net.toLocaleString('vi-VN')
                    },
                    {
                      title: 'Chênh lệch',
                      render: (_, row) => {
                        const old = currentDraft.rows.find(
                          (item) =>
                            (item.profile.attendanceEmployeeId ||
                              item.profile.employeeId) ===
                            row.profile.employeeId
                        );
                        return old
                          ? (row.net - old.net).toLocaleString('vi-VN')
                          : 'Dòng mới';
                      }
                    }
                  ]}
                />
              )}
              {!!draft.reconciliation!.pending.length && (
                <Table
                  size="small"
                  pagination={false}
                  scroll={{ y: 300 }}
                  rowKey={(row) => `${row.source.file}:${row.source.row}`}
                  dataSource={draft.reconciliation!.pending}
                  columns={[
                    {
                      title: 'Dòng Excel',
                      render: (_, row) =>
                        `${row.source.sheet}!${row.source.row}`
                    },
                    {
                      title: 'Mã NV',
                      render: (_, row) => row.source.employeeCode
                    },
                    { title: 'Họ tên', dataIndex: 'name' },
                    {
                      title: 'Thực lãnh',
                      dataIndex: 'net',
                      render: (n: number) => n.toLocaleString('vi-VN')
                    },
                    { title: 'Cần xác nhận', dataIndex: 'reason' }
                  ]}
                />
              )}
              {draft.warnings?.map((warning) => (
                <Alert key={warning} type="warning" message={warning} />
              ))}
            </>
          )}
        </Space>
      </Modal>
    </>
  );
}
