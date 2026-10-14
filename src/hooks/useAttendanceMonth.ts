import { useEffect, useState } from 'react';
import { getAttendanceWindow } from '@/utils/attendanceWindow';

// Remount live filters at the Vietnam month boundary, including tabs left open.
export function useAttendanceMonth() {
  const [monthKey, setMonthKey] = useState(
    () => getAttendanceWindow().monthKey
  );
  useEffect(() => {
    const update = () => setMonthKey(getAttendanceWindow().monthKey);
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return monthKey;
}
