import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { DeleteOutlined } from '@ant-design/icons';
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AttendanceResult } from '@/utils/attendanceUtil';
import { calculatePayrollDiligence } from '@/utils/payrollCalculation';
import type {
  PayrollDraft,
  PayrollAttendanceOverride,
  PayrollProfile,
  PayrollRow
} from '@/utils/payrollCalculation';
import { payrollSheetSchema } from '@/utils/payrollSheetSchema';
import { buildPayrollSheetView, periodDates } from '@/utils/payrollSheetViews';
import type { SheetValue, SheetRecord } from '@/utils/payrollSheetViews';
import './payroll-excel-sheets.css';
import PayrollTransferQr, { PayslipTransferQr } from './PayrollTransferQr';
import { payrollEmployeeCode } from '@/utils/payrollIdentity';
import type { PayrollHolidays } from '@/utils/payrollHolidays';
import type { PayrollAdjustments } from '@/utils/payrollCalculation';
import PayrollManualCell from './PayrollManualCell';
import { payrollBanks, payrollBankBin } from '@/utils/payrollBanks';
import PayrollBankLabel from './PayrollBankLabel';
import { formatPayrollAccount } from '@/utils/payrollAccountFormat';

const sheetLabels: Record<string, string> = {
  'Danh muc': 'Danh mục',
  'Tính lương': 'Tính lương',
  ' Bảng nhập công': 'Bảng nhập công',
  'Tăng ca-Tăng cường-Phép năm': 'Tăng ca · Tăng cường · Phép năm',
  'tính tăng cường': 'Tính lương tăng cường',
  'In phiếu lương': 'In phiếu lương'
};

const display = (value: SheetValue) =>
  value == null
    ? '—'
    : typeof value === 'number'
      ? value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
      : value;

const finiteNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
interface Props {
  attendanceAdjustments?: Record<string, PayrollAdjustments>;
  saveAttendanceOverride?: (
    profile: PayrollProfile,
    value: PayrollAttendanceOverride,
    remove?: boolean
  ) => Promise<boolean>;
  draftPreview?: boolean;
  saveManualAdjustment: (
    profile: PayrollProfile,
    key: keyof PayrollAdjustments,
    value: string | number
  ) => Promise<boolean>;
  canEditProfiles: boolean;
  canEditAdjustments: boolean;
  editAdjustment: (
    profile: PayrollProfile,
    key:
      | 'downtimeDays'
      | 'paidLeaveDays'
      | 'authorizedLeaveDays'
      | 'unauthorizedLeaveDays'
      | 'referral'
      | 'bonus',
    label: string
  ) => void;
  holidaySettings: PayrollHolidays | null;
  canEditHolidays: boolean;
  editHoliday: (profile: PayrollProfile | null) => void;
  profiles: PayrollProfile[];
  attendance: AttendanceResult[] | null;
  draft: PayrollDraft | null;
  startDate: string;
  endDate: string;
  search: string;
  busy: boolean;
  editProfile: (profile: PayrollProfile) => void;
  createProfile: () => void;
  deleteProfile: (profile: PayrollProfile) => void;
  saveProfileField: (
    profile: PayrollProfile,
    field: keyof PayrollProfile,
    value: string
  ) => Promise<void>;
  employeeId?: string;
  selectEmployee: (id: string) => void;
  canExport: boolean;
  exportPayslip: () => void;
}

function Payslip({
  row,
  startDate,
  endDate
}: {
  row: PayrollRow;
  startDate: string;
  endDate: string;
}) {
  const r = row,
    a = r.adjustments;
  // The workbook bases employer contributions on basic salary plus responsibility.
  // Prefer the contribution already calculated into the snapshot so legacy
  // snapshots that omit profile salary fields still show the correct amount.
  const profileContributionBase =
    finiteNumber(r.profile.basicSalary) +
    finiteNumber(r.profile.responsibility);
  const contributionBase =
    finiteNumber(r.social) > 0
      ? finiteNumber(r.social) / 0.08
      : profileContributionBase;
  const insuranceContribution = Math.round(contributionBase * 0.215);
  const unionContribution = Math.round(contributionBase * 0.02);
  const paymentDate = dayjs(endDate).add(1, 'month').startOf('month');
  const lines: [string, string, SheetValue, SheetValue, string?][] = [
    ['I', 'Các khoản lương thu nhập :', '', r.gross],
    ['1', 'Lương ngày', r.dayDays, r.daySalary],
    ['2', 'Lương đêm (130%)', r.nightDays, r.nightSalary],
    [
      '3',
      'Lương tăng ca ngày (150%)',
      r.hours.dayOvertime,
      r.dayOvertimeSalary
    ],
    [
      '4',
      'Lương tăng ca đêm (170%)',
      r.hours.nightOvertime,
      r.nightOvertimeSalary
    ],
    ['5', 'Phụ cấp nhà ở', r.dayDays + r.nightDays, r.housing],
    ['6', 'Phụ cấp đi lại', r.dayDays + r.nightDays, r.travel],
    ['7', 'Phụ cấp cơm', r.dayDays + r.nightDays, r.meal],
    ['8', 'Phụ cấp hành kinh', a.menstrualHours, r.menstrualSalary],
    ['9', 'Phụ cấp ngừng việc', a.downtimeDays, r.downtimeSalary],
    ['10', 'Công lễ/ tết', a.holidayDays, r.holidaySalary],
    [
      '11',
      'Tiền hiếu/ hỷ',
      a.paidLeaveDays,
      r.paidLeaveSalary,
      'Khoản nghỉ hưởng lương đã nhập'
    ],
    [
      '12',
      'Thưởng chuyên cần tháng',
      '',
      row.diligence,
      `Có phép: ${a.authorizedLeaveDays ?? 0} · Không phép: ${a.unauthorizedLeaveDays ?? 0}`
    ],
    ['13', 'Thưởng chuyên cần quý', '', a.bonus],
    ['14', 'Tiền giới thiệu nhân sự', '', a.referral],
    ['15', 'Tiền tăng cường', '', r.reinforcementSalary],
    ['16', 'Thu nhập bổ sung', '', a.otherIncome],
    [
      'II',
      'Các khoản giảm trừ :',
      '',
      r.social +
        r.health +
        r.unemployment +
        r.union +
        r.tax +
        a.advance +
        a.otherDeduction
    ],
    ['1', 'BHXH (8%)', '', r.social],
    ['2', 'BHYT (1.5%)', '', r.health],
    ['3', 'BHTN (1%)', '', r.unemployment],
    ['4', 'Đóng đoàn phí (0.5%)', '', r.union],
    ['5', 'Thuế TNCN', '', r.tax],
    ['6', 'Tạm ứng', '', a.advance],
    ['7', 'Khấu trừ khác', '', a.otherDeduction],
    [
      'III',
      `Tổng chi trả tháng ${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`,
      '',
      r.net + insuranceContribution + unionContribution
    ],
    [
      '1',
      'Công ty phải đóng BHXH 21.5% cho người lao động :',
      '',
      insuranceContribution
    ],
    [
      '2',
      'Công ty phải đóng Kinh phí công đoàn 2% cho người lao động :',
      '',
      unionContribution
    ],
    ['IV', 'Thực nhận tiền lương :', '', r.net]
  ];
  return (
    <article className="vvp-payslip">
      <h3>
        PHIẾU LƯƠNG THÁNG {dayjs(endDate).format('MM')} (từ{' '}
        {dayjs(startDate).format('DD-MM')} đến {dayjs(endDate).format('DD-MM')})
      </h3>
      <p>
        - Tên nhân viên : <strong>{r.profile.name}</strong> · Mã NV:{' '}
        {payrollEmployeeCode(r.profile)}
      </p>
      <p>
        - Bộ phận : {r.profile.department}{' '}
        <span className="float-right">
          Ngày nhận lương: {paymentDate.format('DD-MM-YYYY')}
        </span>
      </p>
      <h4>THÔNG TIN CHI TIẾT LƯƠNG</h4>
      <table>
        <thead>
          <tr>
            {['Stt', 'Diễn giải', 'Số giờ/ công', 'Tính tiền', 'Ghi chú'].map(
              (v) => (
                <th key={v}>{v}</th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {lines.map(([no, label, quantity, amount, note], i) => (
            <tr
              key={i}
              className={
                /^[IV]+$/.test(no) ? `vvp-section vvp-section-${no}` : ''
              }
            >
              <td>{no}</td>
              <td>{label}</td>
              <td className="vvp-number">{display(quantity)}</td>
              <td className="vvp-number">{display(amount)}</td>
              <td>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export default function PayrollExcelSheets(props: Props) {
  const [attendanceEditing, setAttendanceEditing] = useState<{
    profile: PayrollProfile;
    value: PayrollAttendanceOverride;
  } | null>(null);
  const [active, setActive] = useState(
    props.draftPreview ? 'Tính lương' : 'Danh muc'
  );
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: keyof PayrollProfile;
    value: string;
  } | null>(null);
  const view = useMemo(
    () =>
      buildPayrollSheetView(
        active,
        props.profiles,
        props.attendance,
        props.draft,
        props.startDate,
        props.endDate
      ),
    [
      active,
      props.profiles,
      props.attendance,
      props.draft,
      props.startDate,
      props.endDate
    ]
  );
  const selected = props.draft?.rows.find(
    (r) => r.profile.employeeId === props.employeeId
  );
  const filtered = view.records.filter((r) =>
    `${payrollEmployeeCode(r.profile)} ${r.profile.name}`
      .toLocaleLowerCase('vi')
      .includes(props.search.toLocaleLowerCase('vi'))
  );
  const attendanceDates = useMemo(
    () => periodDates(props.startDate, props.endDate),
    [props.startDate, props.endDate]
  );
  const columns: ColumnsType<SheetRecord> = Array.from(
    { length: view.schema.columnCount },
    (_, i) => {
      const labels = view.schema.headers.flatMap((headers) =>
        headers
          .filter((h) => i + 1 >= h.column && i + 1 < h.column + h.colSpan)
          .map((h) => h.label)
      );
      const label = (labels.at(-1) ?? '').toLocaleLowerCase('vi');
      const manualFields = {
        16: ['downtimeDays', 'Số ngày ngừng việc'],
        20: ['paidLeaveDays', 'Số ngày hiếu/hỷ'],
        22: ['note', 'Ghi chú'],
        23: ['authorizedLeaveDays', 'Có phép'],
        24: ['unauthorizedLeaveDays', 'Không phép'],
        25: ['diligence', 'Chuyên cần được duyệt'],
        26: ['menstrualHours', 'Giờ hành kinh'],
        28: ['bonus', 'Thưởng chuyên cần quý'],
        29: ['referral', 'Tiền giới thiệu nhân sự'],
        37: ['taxExemptIncome', 'Miễn thuế bổ sung đã xác nhận'],
        44: ['otherIncome', 'Thu nhập bổ sung'],
        45: ['advance', 'Tạm ứng'],
        46: ['otherDeduction', 'Khấu trừ khác']
      } as const;
      const manualField =
        active === 'Tính lương'
          ? manualFields[i as keyof typeof manualFields]
          : undefined;
      const isBankAccount =
        label === 'số tài khoản' || label === 'số ngân hàng';
      const attendanceTone =
        active.trim() === 'Bảng nhập công'
          ? /tăng ca/.test(label)
            ? 'overtime'
            : /đêm/.test(label)
              ? 'night'
              : /ngày/.test(label)
                ? 'day'
                : undefined
          : undefined;
      const groupLabel = labels.join(' ').toLocaleLowerCase('vi');
      const payrollTone = /thực lãnh|thực nhận|tổng thu nhập|thành tiền/.test(
        groupLabel
      )
        ? 'total'
        : /bhxh|bhyt|bhtn|bảo hiểm|thuế|giảm trừ|khấu trừ|đoàn phí|tạm ứng/.test(
              groupLabel
            )
          ? 'deduction'
          : /lương|phụ cấp|hỗ trợ|thưởng|chuyên cần|tiền/.test(groupLabel)
            ? 'income'
            : /tăng ca|tăng cường/.test(groupLabel)
              ? 'overtime'
              : /đêm/.test(groupLabel)
                ? 'night'
                : /ngày|giờ|công|phép/.test(groupLabel)
                  ? 'day'
                  : undefined;
      const tone =
        active.trim() === 'Bảng nhập công' ? attendanceTone : payrollTone;
      return {
        key: String(i),
        title: (
          <span className="vvp-column-title" title={labels.join(' · ')}>
            {labels.join(' · ')}
          </span>
        ),
        width: isBankAccount
          ? 230
          : labels.includes('Stt')
            ? 56
            : labels.includes('Mã NV')
              ? 112
              : labels.some(
                    (label) => label === 'Tên NV' || label === 'Họ và tên'
                  )
                ? 220
                : 155,
        fixed: i === 1 || i === 2 ? 'left' : undefined,
        align: i > 3 || i === 0 ? 'center' : 'left',
        className: tone ? `vvp-attendance-${tone}` : undefined,
        onCell: (record) => ({
          style:
            typeof record.values[i] === 'number'
              ? { textAlign: 'center' as const }
              : undefined
        }),
        render: (_, record) => {
          const value = record.values[i];
          const date =
            active === ' Bảng nhập công' && i >= 10
              ? attendanceDates[Math.floor((i - 10) / 3)]
              : undefined;
          if (date) {
            const field = (['day', 'night', 'overtime'] as const)[(i - 10) % 3];
            const override = (
              props.attendanceAdjustments?.[record.profile.employeeId] ??
              props.draft?.rows.find(
                (row) => row.profile.employeeId === record.profile.employeeId
              )?.adjustments
            )?.attendanceOverrides?.find((item) => item.date === date);
            const shown = override ? override[field] : value;
            if (!props.draftPreview && props.saveAttendanceOverride)
              return (
                <button
                  type="button"
                  className="vvp-inline-edit-cell"
                  disabled={
                    props.busy ||
                    !props.canEditAdjustments ||
                    props.attendance === null
                  }
                  title={
                    override
                      ? 'Công đã bổ sung theo kỳ — bấm để sửa'
                      : 'Bổ sung công theo kỳ'
                  }
                  onClick={() => {
                    const base = 10 + Math.floor((i - 10) / 3) * 3;
                    const day = Number(record.values[base] ?? 0);
                    const night = Number(record.values[base + 1] ?? 0);
                    setAttendanceEditing({
                      profile: record.profile,
                      value: override ?? {
                        date,
                        day,
                        night,
                        overtime: Number(record.values[base + 2] ?? 0),
                        overtimeShift: night > 0 && day === 0 ? 2 : 1
                      }
                    });
                  }}
                >
                  {display(shown)} {override ? '✎' : ''}
                </button>
              );
            return display(shown);
          }
          if (props.draftPreview && !(manualField && props.canEditAdjustments))
            return isBankAccount ? formatPayrollAccount(value) : display(value);
          const catalogueFields: Record<number, keyof PayrollProfile> = {
            4: 'bankAccount',
            5: 'basicSalary',
            6: 'responsibility',
            7: 'housingPerDay',
            8: 'travelPerDay',
            9: 'mealPerDay',
            10: 'diligence',
            11: 'legacySalary26Days'
          };
          const catalogueField =
            active === 'Danh muc' ? catalogueFields[i] : undefined;
          if (catalogueField && props.canEditProfiles) {
            const isEditing =
              editingCell?.id === record.profile.employeeId &&
              editingCell.field === catalogueField;
            if (isEditing)
              return (
                <Input
                  className="vvp-inline-edit-input"
                  autoFocus
                  value={editingCell.value}
                  onChange={(event) =>
                    setEditingCell({
                      ...editingCell,
                      value: event.target.value
                    })
                  }
                  onPressEnter={async () => {
                    await props.saveProfileField(
                      record.profile,
                      catalogueField,
                      editingCell.value
                    );
                    setEditingCell(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setEditingCell(null);
                  }}
                  onBlur={async () => {
                    if (
                      editingCell &&
                      editingCell.value !== String(value ?? '')
                    ) {
                      await props.saveProfileField(
                        record.profile,
                        catalogueField,
                        editingCell.value
                      );
                    }
                    setEditingCell(null);
                  }}
                  size="small"
                />
              );
            if (isBankAccount)
              return (
                <button
                  type="button"
                  className="vvp-inline-edit-cell vvp-account-edit"
                  disabled={props.busy}
                  aria-label={`Sửa số tài khoản ${payrollEmployeeCode(record.profile)}`}
                  onClick={() =>
                    setEditingCell({
                      id: record.profile.employeeId,
                      field: catalogueField,
                      value: String(value ?? '')
                    })
                  }
                >
                  <span className="vvp-bank-account">
                    {formatPayrollAccount(value)}
                  </span>
                  <span className="vvp-account-edit-icon" aria-hidden>
                    ✎
                  </span>
                </button>
              );
            return (
              <button
                type="button"
                className="vvp-inline-edit-cell"
                onClick={() =>
                  setEditingCell({
                    id: record.profile.employeeId,
                    field: catalogueField,
                    value: String(value ?? '')
                  })
                }
              >
                {display(value)} <span aria-hidden>✎</span>
              </button>
            );
          }
          if (manualField) {
            const adjustment = props.draftPreview
              ? props.draft?.rows.find(
                  (row) => row.profile.employeeId === record.profile.employeeId
                )?.adjustments
              : props.attendanceAdjustments?.[record.profile.employeeId];
            const adjustmentValue = adjustment?.[manualField[0]];
            const manualValue =
              adjustmentValue ??
              (manualField[0] === 'diligence'
                ? record.profile.diligence
                : (value ?? (manualField[0] === 'note' ? '' : 0)));
            const displayedValue =
              manualField[0] === 'diligence'
                ? props.draftPreview
                  ? (value ?? manualValue)
                  : calculatePayrollDiligence(
                      Number(manualValue),
                      adjustment?.authorizedLeaveDays,
                      adjustment?.unauthorizedLeaveDays
                    )
                : manualValue;
            return (
              <PayrollManualCell
                value={
                  manualField[0] === 'note'
                    ? String(displayedValue)
                    : Number(displayedValue)
                }
                inputValue={
                  manualField[0] === 'note'
                    ? String(manualValue)
                    : Number(manualValue)
                }
                label={`${manualField[1]} ${payrollEmployeeCode(record.profile)}`}
                disabled={props.busy || !props.canEditAdjustments}
                text={manualField[0] === 'note'}
                fractional={
                  manualField[0].endsWith('Days') ||
                  manualField[0] === 'menstrualHours'
                }
                max={manualField[0].endsWith('Days') ? 31 : 1e12}
                save={(next) =>
                  props.saveManualAdjustment(
                    record.profile,
                    manualField[0],
                    next
                  )
                }
              />
            );
          }
          if (isBankAccount) {
            const raw = String(value ?? '').trim();
            return (
              <span className="vvp-bank-account" title={raw || undefined}>
                {formatPayrollAccount(value)}
              </span>
            );
          }
          if (active === 'Tính lương' && i === 18)
            return (
              <Button
                type="link"
                disabled={
                  !props.canEditHolidays ||
                  props.busy ||
                  props.holidaySettings?.defaultDays === null
                }
                aria-label={`Công lễ ${payrollEmployeeCode(record.profile)}`}
                onClick={() => props.editHoliday(record.profile)}
              >
                {props.holidaySettings?.overrides[record.profile.employeeId] ??
                  props.holidaySettings?.defaultDays ??
                  '—'}
                {props.holidaySettings &&
                Object.prototype.hasOwnProperty.call(
                  props.holidaySettings.overrides,
                  record.profile.employeeId
                )
                  ? ' · Riêng'
                  : ' · Chung'}
              </Button>
            );
          if (value === record.profile.name)
            return (
              <button
                type="button"
                className="vvp-employee-name"
                disabled={props.busy}
                aria-label={`Điều chỉnh ${payrollEmployeeCode(record.profile)}`}
                onClick={() => props.editProfile(record.profile)}
              >
                {display(value)}
              </button>
            );
          return display(value);
        }
      };
    }
  );
  if (active === 'Danh muc') {
    columns.splice(4, 0, {
      key: 'bank',
      title: 'Ngân hàng',
      width: 180,
      align: 'center',
      render: (_, record) => {
        if (record.profile.bankAccount == null) return '—';
        if (!record.profile.bankAccount?.trim()) {
          return <span className="text-sm font-medium">Trả tiền mặt</span>;
        }
        return (
          <Select
            className="vvp-bank-select"
            size="small"
            aria-label={`Ngân hàng ${payrollEmployeeCode(record.profile)}`}
            showSearch
            optionFilterProp="label"
            placeholder="Chọn ngân hàng"
            style={{ width: '100%' }}
            disabled={props.busy || !props.canEditProfiles}
            value={payrollBankBin(record.profile) || undefined}
            options={payrollBanks.map((bank) => ({
              value: bank.bin,
              label: bank.name
            }))}
            optionRender={(option) => (
              <PayrollBankLabel bin={String(option.value)} />
            )}
            labelRender={(option) => (
              <PayrollBankLabel bin={String(option.value)} />
            )}
            onChange={(bin) =>
              void props.saveProfileField(record.profile, 'bankBin', bin)
            }
          />
        );
      }
    });
  }
  if (active === 'Danh muc' && props.canEditProfiles) {
    columns.push({
      key: 'actions',
      title: 'Thao tác',
      width: 88,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="text"
          danger
          size="small"
          disabled={props.busy}
          icon={<DeleteOutlined />}
          title="Xoá danh mục"
          aria-label={`Xoá ${payrollEmployeeCode(record.profile)}`}
          onClick={() => props.deleteProfile(record.profile)}
        />
      )
    });
  }
  const sheetContent =
    active === 'In phiếu lương' ? (
      <>
        <Select
          className="vvp-employee-select"
          size="small"
          aria-label="Nhân viên in phiếu lương"
          placeholder="Chọn nhân viên theo mã"
          value={props.employeeId}
          onChange={props.selectEmployee}
          showSearch
          optionFilterProp="label"
          style={{ width: '100%', maxWidth: 300 }}
          options={props.draft?.rows.map((r) => ({
            value: r.profile.employeeId,
            label: `${payrollEmployeeCode(r.profile)} — ${r.profile.name}`
          }))}
        />
        {selected ? (
          <>
            <div className="vvp-payslip-layout">
              <Payslip
                row={{
                  ...selected,
                  profile: {
                    ...selected.profile,
                    department:
                      selected.profile.department ??
                      props.profiles.find(
                        (profile) =>
                          profile.employeeId === selected.profile.employeeId
                      )?.department ??
                      '—'
                  }
                }}
                startDate={props.startDate}
                endDate={props.endDate}
              />
              {!props.draftPreview && (
                <PayslipTransferQr
                  row={selected}
                  endDate={props.endDate}
                  blocked={props.busy}
                />
              )}
            </div>
          </>
        ) : (
          <Empty description="Lấy công và chọn nhân viên để xem phiếu lương." />
        )}
        {!props.draftPreview && (
          <Button
            className="mt-3"
            disabled={!props.canExport || !selected}
            onClick={props.exportPayslip}
          >
            Xuất phiếu lương Excel
          </Button>
        )}
      </>
    ) : view.schema.columnCount === 0 ? (
      <Empty description="Sheet kỹ thuật của macro trong file gốc, không có bảng dữ liệu. Hệ thống web không chạy macro Excel." />
    ) : (
      <>
        <Table<SheetRecord>
          className="vvp-web-table"
          sticky={{ offsetHeader: 0 }}
          bordered
          rowKey="id"
          size="middle"
          tableLayout="fixed"
          dataSource={filtered}
          columns={columns}
          scroll={{
            x: columns.reduce(
              (total, column) => total + Number(column.width),
              0
            )
          }}
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            showTotal: (total) => total + ' nhân viên'
          }}
          locale={{ emptyText: 'Không có nhân viên trong nhóm đang chọn.' }}
        />
        <p className="mt-2 text-sm">
          {filtered.length} dòng · Kỳ {props.startDate} — {props.endDate} · Đơn
          vị: đồng, giờ/công theo tiêu đề.
        </p>
      </>
    );
  return (
    <section className="vvp-excel-workbook">
      <Modal
        title={`Bổ sung công ${attendanceEditing?.value.date ?? ''} — ${attendanceEditing?.profile.name ?? ''}`}
        open={!!attendanceEditing}
        confirmLoading={props.busy}
        onCancel={() => {
          if (!props.busy) setAttendanceEditing(null);
        }}
        okText="Lưu công theo kỳ"
        cancelText="Đóng"
        onOk={async () => {
          if (
            attendanceEditing &&
            (await props.saveAttendanceOverride?.(
              attendanceEditing.profile,
              attendanceEditing.value
            ))
          )
            setAttendanceEditing(null);
        }}
      >
        <p>
          Nhập tổng số giờ đúng của ngày này. Chỉ thay thế công dùng tính lương,
          không sửa chấm công gốc.
        </p>
        {attendanceEditing && (
          <Space direction="vertical" className="w-full">
            {(
              [
                ['day', 'Giờ ngày'],
                ['night', 'Giờ đêm'],
                ['overtime', 'Giờ tăng ca']
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                {label}{' '}
                <InputNumber
                  min={0}
                  max={24}
                  precision={2}
                  disabled={props.busy}
                  value={attendanceEditing.value[field]}
                  onChange={(value) =>
                    setAttendanceEditing({
                      ...attendanceEditing,
                      value: { ...attendanceEditing.value, [field]: value ?? 0 }
                    })
                  }
                />
              </label>
            ))}
            <Radio.Group
              disabled={props.busy}
              value={attendanceEditing.value.overtimeShift}
              options={[
                { label: 'Tăng ca ngày (150%)', value: 1 },
                { label: 'Tăng ca đêm (170%)', value: 2 }
              ]}
              onChange={(event) =>
                setAttendanceEditing({
                  ...attendanceEditing,
                  value: {
                    ...attendanceEditing.value,
                    overtimeShift: event.target.value
                  }
                })
              }
            />
            <Button
              disabled={props.busy}
              onClick={async () => {
                if (
                  await props.saveAttendanceOverride?.(
                    attendanceEditing.profile,
                    attendanceEditing.value,
                    true
                  )
                )
                  setAttendanceEditing(null);
              }}
            >
              Khôi phục công gốc
            </Button>
          </Space>
        )}
      </Modal>
      <div role="tabpanel" aria-label={sheetLabels[active] ?? active.trim()}>
        {sheetContent}
      </div>
      <Tabs
        className="vvp-web-tabs"
        activeKey={active}
        onChange={setActive}
        tabBarExtraContent={
          <Space>
            {active === 'Danh muc' && props.canEditProfiles && (
              <Button
                type="primary"
                disabled={props.busy}
                onClick={props.createProfile}
              >
                Thêm nhân viên
              </Button>
            )}
            {!props.draftPreview && active !== 'In phiếu lương' && (
              <PayrollTransferQr
                draft={props.draft}
                ready={!!props.draft?.rows.length && !props.busy}
              />
            )}
          </Space>
        }
        items={payrollSheetSchema
          .filter(
            (s) =>
              !s.hidden && (props.draftPreview || s.name !== 'In phiếu lương')
          )
          .map((s) => ({
            key: s.name,
            label: sheetLabels[s.name] ?? s.name.trim()
          }))}
      />
    </section>
  );
}
