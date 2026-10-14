import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

export function getAttendanceWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(now);
  const monthKey = `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`;
  const month = dayjs(`${monthKey}-01`);
  return {
    monthKey,
    month,
    start: month.subtract(2, 'month'),
    end: month.endOf('month')
  };
}

export function isOutsideAttendanceWindow(date: Dayjs) {
  const { start, end } = getAttendanceWindow();
  return date.isBefore(start, 'day') || date.isAfter(end, 'day');
}

export function clampAttendanceRange(from: Dayjs, to: Dayjs) {
  const { start, end } = getAttendanceWindow();
  return `${(from.isBefore(start) ? start : from).format('YYYY-MM-DD')},${(to.isAfter(end) ? end : to).format('YYYY-MM-DD')}`;
}
