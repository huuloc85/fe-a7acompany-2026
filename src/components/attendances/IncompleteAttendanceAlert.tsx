import { useAttendanceMonth } from '@/hooks/useAttendanceMonth';
import { fetchEmpAttendancesCalculated } from '@/services/AttendanceService';
import { getIncompleteAttendanceDates } from '@/utils/incompleteAttendance';
import { getMissingOvertimeRequestDates } from '@/utils/missingOvertimeRequests';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AttendanceReminder } from './AttendanceReminder';

export function IncompleteAttendanceAlert({
  employeeId,
  showOvertimeReminder = false
}: {
  employeeId: string;
  showOvertimeReminder?: boolean;
}) {
  const month = useAttendanceMonth();
  const startDate = dayjs(`${month}-01`)
    .subtract(1, 'month')
    .date(16)
    .format('YYYY-MM-DD');
  const { data, isError } = useQuery({
    queryKey: ['emp-attendance', 'incomplete', employeeId, month, startDate],
    queryFn: () =>
      fetchEmpAttendancesCalculated({
        limit: 0,
        'filter[date_between]': `${startDate},${dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD')}`
      }),
    refetchInterval: 60_000
  });
  const dates = getIncompleteAttendanceDates(data?.data ?? []);
  const overtimeDates = showOvertimeReminder
    ? getMissingOvertimeRequestDates(data?.data ?? [])
    : [];

  if (isError || (dates.length === 0 && overtimeDates.length === 0))
    return null;

  return (
    <>
      <AttendanceReminder dates={dates} kind="incomplete" />
      <AttendanceReminder dates={overtimeDates} kind="overtime" />
    </>
  );
}
