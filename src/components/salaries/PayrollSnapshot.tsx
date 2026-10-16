import { Table, Select, Empty } from 'antd';
import { useState } from 'react';
import dayjs from 'dayjs';
import type { PayrollDraft, PayrollRow } from '@/utils/payrollCalculation';
import './payroll-snapshot.css';

const number = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export function PayrollSnapshotPayslip({
  row,
  endDate,
  startDate
}: {
  row: PayrollRow;
  endDate: string;
  startDate: string;
}) {
  const company = row.profile.company?.trim() ?? '';
  const companyName = ['vvp', 'vinh vinh phát'].includes(company.toLowerCase())
    ? 'Công ty Vinh Vinh Phát'
    : company.toLowerCase() === 'a7a'
      ? 'A7A'
      : company;
  const income: [string, number][] = [
    ['Lương ngày', row.daySalary],
    ['Lương đêm', row.nightSalary],
    ['Tăng ca ngày', row.dayOvertimeSalary],
    ['Tăng ca đêm', row.nightOvertimeSalary],
    ['Tăng cường', row.reinforcementSalary],
    ['Nhà ở', row.housing],
    ['Đi lại', row.travel],
    ['Tiền cơm', row.meal],
    ['Lễ / Tết', row.holidaySalary],
    ['Hiếu / hỷ', row.paidLeaveSalary],
    ['Ngừng việc', row.downtimeSalary],
    ['Chế độ phụ nữ', row.menstrualSalary],
    ['Chuyên cần tháng', row.diligence],
    ['Thưởng chuyên cần quý', row.adjustments.bonus],
    ['Giới thiệu nhân sự', row.adjustments.referral],
    ['Thu nhập khác', row.adjustments.otherIncome]
  ];
  const deductions: [string, number][] = [
    ['Bảo hiểm xã hội', row.social],
    ['Bảo hiểm y tế', row.health],
    ['Bảo hiểm thất nghiệp', row.unemployment],
    ['Phí công đoàn', row.union],
    ['Thuế thu nhập cá nhân', row.tax],
    ['Tạm ứng', row.adjustments.advance],
    ['Khấu trừ khác', row.adjustments.otherDeduction]
  ];
  const totalDeduction = deductions.reduce((sum, [, value]) => sum + value, 0);
  const renderRows = (items: [string, number][]) => (
    <dl className="employee-slip-lines">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {number(value)} <span>đ</span>
          </dd>
        </div>
      ))}
    </dl>
  );
  const renderGroup = (
    title: string,
    items: [string, number][],
    total: number,
    kind: string
  ) => {
    const active = items.filter(([, value]) => value !== 0);
    const zero = items.filter(([, value]) => value === 0);
    return (
      <section className={`employee-slip-group ${kind}`}>
        <header>
          <h4>{title}</h4>
          <strong>{number(total)} đ</strong>
        </header>
        {active.length ? (
          renderRows(active)
        ) : (
          <p className="employee-slip-empty">Không phát sinh trong kỳ.</p>
        )}
        {!!zero.length && (
          <details>
            <summary>Các khoản không phát sinh ({zero.length})</summary>
            {renderRows(zero)}
          </details>
        )}
      </section>
    );
  };
  return (
    <section className="employee-slip" aria-label="Phiếu lương nhân viên">
      <header className="employee-slip-heading">
        <div>
          <p className="employee-slip-eyebrow">PHIẾU LƯƠNG</p>
          <h3>Tháng {dayjs(endDate).format('MM/YYYY')}</h3>
          <p>
            Kỳ công: {dayjs(startDate).format('DD-MM-YYYY')} —{' '}
            {dayjs(endDate).format('DD-MM-YYYY')}
          </p>
        </div>
        <div className="employee-slip-identity">
          <strong>{row.profile.name}</strong>
          <p>Mã NV: {row.profile.employeeId}</p>
          <p>{companyName}</p>
          {row.profile.department && <p>Bộ phận: {row.profile.department}</p>}
        </div>
      </header>
      <div className="employee-slip-net">
        <div>
          <p>Thực lãnh</p>
          <strong>
            {number(row.net)} <span>đ</span>
          </strong>
          {row.net < 0 && (
            <p>Khấu trừ vượt thu nhập. Vui lòng liên hệ bộ phận tính lương.</p>
          )}
        </div>
        <p>
          Ngày nhận lương
          <br />
          <b>
            {dayjs(endDate)
              .add(1, 'month')
              .startOf('month')
              .format('DD-MM-YYYY')}
          </b>
        </p>
      </div>
      <div className="employee-slip-summary" aria-label="Tóm tắt lương">
        <div>
          <span>Tổng thu nhập</span>
          <strong>{number(row.gross)} đ</strong>
        </div>
        <span aria-hidden="true">−</span>
        <div>
          <span>Tổng khấu trừ & tạm ứng</span>
          <strong>{number(totalDeduction)} đ</strong>
        </div>
        <span aria-hidden="true">=</span>
        <div>
          <span>Thực lãnh</span>
          <strong>{number(row.net)} đ</strong>
        </div>
      </div>
      <div className="employee-slip-hours">
        {(
          [
            ['Công ngày', row.dayDays, 'ngày'],
            ['Công đêm', row.nightDays, 'ngày'],
            ['Tăng ca', row.hours.dayOvertime + row.hours.nightOvertime, 'giờ'],
            ['Tăng cường', row.hours.reinforcement, 'giờ']
          ] as const
        ).map(([label, value, unit]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>
              {number(value)} <small>{unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="employee-slip-breakdown">
        {renderGroup('Thu nhập', income, row.gross, 'income')}
        {renderGroup(
          'Khấu trừ & tạm ứng',
          deductions,
          totalDeduction,
          'deductions'
        )}
      </div>
      {!!row.adjustments.note && (
        <aside className="employee-slip-note">
          <strong>Ghi chú</strong>
          <p>{row.adjustments.note}</p>
        </aside>
      )}
    </section>
  );
}

export default function PayrollSnapshot({ draft }: { draft: PayrollDraft }) {
  const [employeeId, setEmployeeId] = useState<string>();
  const selected =
    draft.rows.find((r) => r.profile.employeeId === employeeId) ??
    draft.rows[0];
  if (!selected)
    return <Empty description="Không có bảng lương của công ty này" />;
  return (
    <div className="grid min-w-0 gap-5">
      <Table
        bordered
        size="small"
        pagination={false}
        scroll={{ x: 780 }}
        rowKey={(r) => r.profile.employeeId}
        dataSource={draft.rows}
        columns={[
          { title: 'Mã NV', render: (_, r) => r.profile.employeeId },
          { title: 'Nhân viên', render: (_, r) => r.profile.name },
          ...(
            [
              ['gross', 'Thu nhập'],
              ['tax', 'Thuế TNCN'],
              ['net', 'Thực lãnh']
            ] as const
          ).map(([key, title]) => ({
            title,
            dataIndex: key,
            align: 'center' as const,
            render: number
          }))
        ]}
      />
      <Select
        className="w-full"
        size="large"
        showSearch
        optionFilterProp="label"
        value={selected.profile.employeeId}
        onChange={setEmployeeId}
        options={draft.rows.map((r) => ({
          value: r.profile.employeeId,
          label: `${r.profile.employeeId} — ${r.profile.name}`
        }))}
      />
      <PayrollSnapshotPayslip
        row={selected}
        startDate={draft.startDate}
        endDate={draft.endDate}
      />
    </div>
  );
}
