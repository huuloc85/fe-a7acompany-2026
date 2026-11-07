import {
  OVERTIME_APPROVAL_EFFECTIVE_DATE,
  type OvertimeApproval
} from './overtimeApproval';

export function hasMissingOvertimeRequest(row: {
  date: string;
  overtime_approval?: OvertimeApproval;
}) {
  const approval = row.overtime_approval;
  return Boolean(
    row.date.slice(0, 10) >= OVERTIME_APPROVAL_EFFECTIVE_DATE &&
      approval &&
      approval.applicable !== false &&
      !approval.approved &&
      approval.unapproved_hours > 0 &&
      approval.requests.length === 0
  );
}

export function getMissingOvertimeRequestDates(
  rows: { date: string; overtime_approval?: OvertimeApproval }[]
) {
  return [
    ...new Set(
      rows.filter(hasMissingOvertimeRequest).map((row) => row.date.slice(0, 10))
    )
  ].sort();
}
