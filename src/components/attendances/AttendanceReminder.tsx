import { ArrowRightOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';

export function AttendanceReminder({
  dates,
  kind
}: {
  dates: string[];
  kind: 'incomplete' | 'overtime';
}) {
  if (!dates.length) return null;
  const isIncomplete = kind === 'incomplete';
  const title = isIncomplete ? 'Chưa đủ chấm công' : 'Tăng ca chưa làm đơn';

  return (
    <section
      aria-label={title}
      className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 dark:border-amber-800 dark:bg-amber-950"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ClockCircleOutlined
          aria-hidden
          className="mt-0.5 shrink-0 !text-lg !text-amber-700 dark:!text-amber-300"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="!m-0 !text-sm !leading-5 !font-semibold !text-amber-950 dark:!text-amber-100">
              {title}
            </h3>
            <span className="text-xs font-medium whitespace-nowrap text-amber-800 tabular-nums dark:text-amber-200">
              {dates.length} ngày
            </span>
          </div>
          <p className="mt-1 mb-0 text-xs leading-5 text-amber-800 dark:text-amber-200">
            {isIncomplete
              ? 'Vui lòng báo tổ trưởng để được xác nhận giờ vào/ra.'
              : 'Cần bổ sung đơn cho các ngày:'}
          </p>
          <ul
            aria-label={
              isIncomplete ? 'Ngày chưa đủ chấm công' : 'Ngày cần làm đơn'
            }
            className="mt-1.5 mb-0 flex max-h-24 list-none flex-wrap gap-x-3 gap-y-1 overflow-y-auto p-0 text-sm leading-5 font-medium text-amber-950 tabular-nums dark:text-amber-100"
          >
            {dates.map((date) => (
              <li key={date}>
                <time dateTime={date}>{dayjs(date).format('DD/MM')}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link
        to={isIncomplete ? '/employee/attendances' : '/employee/request-forms'}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-stretch rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold !text-amber-900 no-underline transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:self-center dark:border-amber-700 dark:bg-amber-900 dark:!text-amber-50 dark:hover:bg-amber-800"
      >
        {isIncomplete ? 'Xem chi tiết' : 'Làm đơn tăng ca'}{' '}
        <ArrowRightOutlined aria-hidden className="text-xs" />
      </Link>
    </section>
  );
}
