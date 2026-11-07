import { DatePicker, type DatePickerProps } from 'antd';
import { useLocation } from '@tanstack/react-router';

/** Employee calendar formats and mobile popup; values remain full Dayjs dates. */
export default function AppDatePicker(props: DatePickerProps) {
  const { pathname } = useLocation();
  const employee = pathname.startsWith('/employee/');
  const compact =
    employee && (!props.picker || props.picker === 'date') && !props.showTime;
  const employeeMonth = employee && props.picker === 'month';

  return (
    <DatePicker
      {...props}
      format={employeeMonth ? 'MM/YYYY' : compact ? 'DD/MM' : props.format}
      classNames={
        compact || employeeMonth
          ? {
              ...props.classNames,
              popup: {
                ...props.classNames?.popup,
                root: [props.classNames?.popup?.root, 'user-date-picker-popup']
                  .filter(Boolean)
                  .join(' ')
              }
            }
          : props.classNames
      }
    />
  );
}
