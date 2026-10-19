import { useAttendanceMonth } from '@/hooks/useAttendanceMonth';
import { fetchEmpAttendancesCalculated } from '@/services/AttendanceService';
import { getIncompleteAttendanceDates } from '@/utils/incompleteAttendance';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Alert } from 'antd';
import dayjs from 'dayjs';

export function IncompleteAttendanceAlert({
  employeeId
}: {
  employeeId: string;
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

  if (isError || dates.length === 0) return null;

  return (
    <Alert
      className="mb-3"
      style={{
        padding: '8px 12px',
        borderRadius: 10,
        alignItems: 'flex-start'
      }}
      type="warning"
      showIcon
      message={
        <div className="text-sm leading-5">
          <div className="font-medium">
            Chưa đủ chấm công: {dates.length} ngày
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 text-xs leading-5">
            <span>
              {dates.map((date) => dayjs(date).format('DD/MM')).join(', ')}
            </span>
            <Link
              to="/employee/attendances"
              className="shrink-0 font-medium underline"
            >
              Xem chi tiết
            </Link>
          </div>
          <div className="text-xs leading-5">
            Vui lòng báo tổ trưởng để được xác nhận giờ vào/ra.
          </div>
        </div>
      }
    />
  );
}
