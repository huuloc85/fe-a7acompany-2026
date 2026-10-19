import type { AttendanceResult } from './attendanceUtil';

export function getIncompleteAttendanceDates(
  rows: AttendanceResult[],
  now = new Date()
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)!.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const currentTime = `${part('hour')}:${part('minute')}`;

  return [
    ...new Set(
      rows
        .filter((row) => {
          const date = row.date.slice(0, 10);
          if (row.shift <= 0 || date >= today) return false;

          // Night scans can belong to the previous workday until 11:30.
          if (row.shift === 2) {
            const nextDay = new Date(`${date}T00:00:00Z`);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            if (
              nextDay.toISOString().slice(0, 10) === today &&
              currentTime <= '11:30'
            ) {
              return false;
            }
          }

          return !row.time_in || !row.time_out || row.time_in === row.time_out;
        })
        .map((row) => row.date.slice(0, 10))
    )
  ].sort();
}
