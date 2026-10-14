import type { AttendanceResponse } from '@services/AttendanceService';
import dayjs from 'dayjs';
import type { OvertimeApproval } from './overtimeApproval';

export interface AttendanceResult {
  employee_id: string;
  name: string;
  company: string;
  date: string;
  shift: number;
  hnhc: 'N' | 'LN' | 'D' | 'TC' | 'X' | 'NN' | null;
  day_type: string;
  is_schedule_change: boolean;
  time_in: string;
  time_out: string;
  total_hours: number;
  overtime_hours: number;
  administrative_hours: number;
  overtime_approval?: OvertimeApproval;
}

export function calculateAttendances(
  data: AttendanceResponse[]
): AttendanceResult[] {
  return data.map((attendance) => {
    const {
      employee_id,
      name,
      date,
      hnhc,
      dates,
      calendar_category_id,
      company
    } = attendance;
    let shift = 0;
    if (dates.filter((d) => d.date === date).length > 0) {
      if (hnhc === 'N' || hnhc === 'LN' || hnhc === 'NN') shift = 1;
      else if (hnhc === 'D' || hnhc === 'TC') shift = 2;
      else if (hnhc === 'X') {
        const yesterday = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayEntries = data.filter(
          (item) => item.employee_id === employee_id && item.date === yesterday
        );
        const tomorrow = dayjs(date).add(1, 'day').format('YYYY-MM-DD');
        const tomorrowEntries = data.filter(
          (item) => item.employee_id === employee_id && item.date === tomorrow
        );
        if (yesterdayEntries.length > 0) {
          const yesterdayHnhc = yesterdayEntries[0].hnhc;
          const tomorrowHnhc = tomorrowEntries[0]?.hnhc || null;
          if (
            (yesterdayHnhc === 'N' ||
              yesterdayHnhc === 'LN' ||
              yesterdayHnhc === 'NN') &&
            (tomorrowHnhc === 'N' || tomorrowHnhc !== 'LN') // Note: this condition might need 'NN', but keeping structure as is
          )
            shift = 1;
          else if (
            (yesterdayHnhc === 'D' || yesterdayHnhc === 'TC') &&
            (tomorrowHnhc === 'D' || tomorrowHnhc === 'TC')
          )
            shift = 2;
        }
      }
    }
    let time_in = '';
    let time_out = '';
    if (shift === 1) {
      const dateEntries = dates.filter((d) => d.date === date);
      time_in =
        dateEntries.length > 0
          ? dateEntries.reduce(
              (min, d) => (d.datetime < min ? d.datetime : min),
              dateEntries[0].datetime
            )
          : '';
      time_out =
        dateEntries.length > 0
          ? dateEntries.reduce(
              (max, d) => (d.datetime > max ? d.datetime : max),
              dateEntries[0].datetime
            )
          : '';
    } else if (shift === 2) {
      const startDateTime = new Date(date);
      startDateTime.setHours(18, 0, 0, 0);
      const endDateTime = new Date(date);
      endDateTime.setDate(endDateTime.getDate() + 1);
      endDateTime.setHours(11, 30, 0, 0);
      const dateEntries = dates.filter((d) => {
        const entryDate = new Date(d.datetime);
        return entryDate >= startDateTime && entryDate <= endDateTime;
      });
      time_in =
        dateEntries.length > 0 && dateEntries[0].date === date
          ? dateEntries.reduce(
              (min, d) => (d.datetime < min ? d.datetime : min),
              dateEntries[0].datetime
            )
          : '';
      time_out =
        dateEntries.length > 0 &&
        dateEntries[dateEntries.length - 1].date !== date
          ? dateEntries.reduce(
              (max, d) => (d.datetime > max ? d.datetime : max),
              dateEntries[0].datetime
            )
          : '';
    }
    let total_hours = 0;
    let break_time = 0;
    if (time_in && time_out && date >= '2026-09-01') {
      const day = dayjs(date).startOf('day');
      const shiftStart = day.hour(shift === 2 ? 21 : 7).minute(30);
      const start = Math.max(dayjs(time_in).valueOf(), shiftStart.valueOf());
      const end = dayjs(time_out).valueOf();
      // Production breaks are paid; only the meal break is deducted.
      // Night break offsets are relative to the shift's starting date.
      const breaks =
        calendar_category_id == '4'
          ? [
              [9 * 60 + 40, 9 * 60 + 55],
              [12 * 60, 13 * 60],
              [14 * 60 + 40, 14 * 60 + 55]
            ]
          : shift === 2
            ? [[25 * 60 + 30, 26 * 60 + 30]]
            : [[11 * 60 + 30, 12 * 60 + 30]];
      const unpaidMilliseconds = breaks.reduce((total, [from, to]) => {
        const breakStart = day.add(from, 'minute').valueOf();
        const breakEnd = day.add(to, 'minute').valueOf();
        return (
          total +
          Math.max(0, Math.min(end, breakEnd) - Math.max(start, breakStart))
        );
      }, 0);
      total_hours =
        Math.floor(Math.max(0, end - start - unpaidMilliseconds) / 900000) / 4;
    } else if (time_in && time_out) {
      let start = new Date(time_in);
      const end = new Date(time_out);
      if (shift === 1) {
        start.setHours(7, 30, 0, 0);
        start = start > new Date(time_in) ? start : new Date(time_in);
      } else if (shift === 2) {
        start.setHours(19, 30, 0, 0);
        start = start > new Date(time_in) ? start : new Date(time_in);
      }

      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes =
        shift == 2
          ? (end.getTime() - start.getTime()) / 60000 + startMinutes
          : end.getHours() * 60 + end.getMinutes();

      if (calendar_category_id == '4') {
        if (
          endMinutes > 9 * 60 + 30 &&
          startMinutes < 9 * 60 + 45 &&
          startMinutes < 9 * 60 + 30
        )
          break_time += 15;
        if (
          endMinutes > 12 * 60 &&
          startMinutes < 13 * 60 &&
          startMinutes < 12 * 60
        )
          break_time += 60;
        if (
          endMinutes > 14 * 60 + 30 &&
          startMinutes < 14 * 60 + 45 &&
          startMinutes < 14 * 60 + 30
        )
          break_time += 15;
      } else if (calendar_category_id == '2') {
        if (
          endMinutes > 9 * 60 + 30 &&
          startMinutes < 9 * 60 + 35 &&
          startMinutes < 9 * 60 + 30
        )
          break_time += 5;
        if (
          endMinutes > 11 * 60 + 20 &&
          startMinutes < 12 * 60 &&
          startMinutes < 11 * 60 + 20
        )
          break_time += 40;
        if (
          endMinutes > 14 * 60 + 30 &&
          startMinutes < 14 * 60 + 35 &&
          startMinutes < 14 * 60 + 30
        )
          break_time += 5;
        if (
          endMinutes > 16 * 60 &&
          startMinutes < 17 * 60 + 10 &&
          startMinutes < 16 * 60
        )
          break_time += 10;
        if (endMinutes < 17 * 60 && startMinutes < 17 * 60) break_time += 10;
      } else if (shift === 1) {
        if (
          endMinutes > 9 * 60 + 30 &&
          startMinutes < 9 * 60 + 40 &&
          startMinutes < 9 * 60 + 30
        )
          break_time += 10;
        if (
          endMinutes > 11 * 60 + 20 &&
          startMinutes < 11 * 60 + 50 &&
          startMinutes < 11 * 60 + 20
        )
          break_time += 30;
        if (
          endMinutes > 14 * 60 + 30 &&
          startMinutes < 14 * 60 + 40 &&
          startMinutes < 14 * 60 + 30
        )
          break_time += 10;
        if (
          endMinutes > 17 * 60 &&
          startMinutes < 17 * 60 + 10 &&
          startMinutes < 17 * 60
        )
          break_time += 10;
      } else if (shift === 2) {
        if (
          endMinutes > 21 * 60 + 30 &&
          startMinutes < 21 * 60 + 40 &&
          startMinutes < 21 * 60 + 30
        )
          break_time += 10;
        if (
          endMinutes > 23 * 60 + 30 &&
          startMinutes < 24 * 60 &&
          startMinutes < 23 * 60 + 30
        )
          break_time += 30;
        if (
          endMinutes > 26 * 60 + 30 &&
          startMinutes < 26 * 60 + 40 &&
          startMinutes < 26 * 60 + 30
        )
          break_time += 10;
        if (
          endMinutes > 29 * 60 &&
          startMinutes < 29 * 60 + 10 &&
          startMinutes < 29 * 60
        )
          break_time += 10;
      }

      total_hours =
        (end.getTime() - start.getTime() - break_time * 60000) / 3600000;
      total_hours = total_hours < 0 ? 0 : total_hours;
      total_hours = Math.floor(total_hours * 4) / 4;
    }
    return {
      employee_id,
      name,
      company,
      date,
      shift,
      hnhc: hnhc || null,
      day_type: attendance.day_type || '',
      is_schedule_change: !!attendance.is_schedule_change,
      time_in,
      time_out,
      total_hours: total_hours,
      overtime_hours: total_hours > 8 ? total_hours - 8 : 0,
      administrative_hours: total_hours > 8 ? 8 : total_hours
    };
  });
}
