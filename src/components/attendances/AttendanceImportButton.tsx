import { useEffect, useRef, useState } from 'react';
import { Alert, Button, DatePicker, Modal, Progress, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import viVN from 'antd/es/date-picker/locale/vi_VN';
import 'dayjs/locale/vi';
import {
  fetchAttendanceImports,
  requestAttendanceImport
} from '@services/AttendanceImportService';

dayjs.extend(utc);

// Calendar dates stay in Vietnam time, independent of the device timezone.
const vietnamToday = () => dayjs(dayjs().utcOffset(7).format('YYYY-MM-DD'));

const statusLabels = {
  pending: 'Đang chờ',
  processing: 'Đang lấy dữ liệu',
  succeeded: 'Đã hoàn tất',
  failed: 'Chưa hoàn tất'
};

export default function AttendanceImportButton() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => {
    const today = vietnamToday();
    return [today, today];
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState('');
  const client = useQueryClient();
  const previousResults = useRef('');
  const query = useQuery({
    queryKey: ['attendance-device-imports'],
    queryFn: fetchAttendanceImports,
    enabled: open,
    refetchInterval: open ? 3000 : false
  });
  const requests = query.data ?? [];
  // Refresh history and calculated attendance after a checkpoint, including partial failures.
  useEffect(() => {
    if (!query.data) return;
    const signature = JSON.stringify(
      query.data.map((job) => [job.id, job.completed_days, job.updated_at])
    );
    if (signature !== previousResults.current) {
      previousResults.current = signature;
      void client.invalidateQueries({ queryKey: ['attendances'] });
    }
  }, [query.data, client]);

  const selectedDays =
    range[1].startOf('day').diff(range[0].startOf('day'), 'day') + 1;
  const validRange =
    selectedDays >= 1 &&
    selectedDays <= 31 &&
    !range[1].isAfter(vietnamToday(), 'day');
  const sameRangeWaiting = requests.some(
    (job) =>
      ['pending', 'processing'].includes(job.status) &&
      job.start_date === range[0].format('YYYY-MM-DD') &&
      job.end_date === range[1].format('YYYY-MM-DD')
  );

  const submit = async () => {
    if (
      !validRange ||
      sending ||
      sameRangeWaiting ||
      query.isPending ||
      query.isError
    )
      return;
    setSending(true);
    setError('');
    setSubmitted('');
    try {
      await requestAttendanceImport(
        range[0].format('YYYY-MM-DD'),
        range[1].format('YYYY-MM-DD')
      );
      setSubmitted(
        `${range[0].format('DD/MM/YYYY')} – ${range[1].format('DD/MM/YYYY')}`
      );
      await query.refetch();
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(
        apiError.response?.data?.message ||
          'Chưa xác nhận được yêu cầu. Hãy tải lại trạng thái trước khi thử lại.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button icon={<DownloadOutlined />} onClick={() => setOpen(true)}>
        Lấy dữ liệu máy chấm công
      </Button>
      <Modal
        title="Lấy dữ liệu máy chấm công"
        open={open}
        width={520}
        centered
        styles={{
          body: { maxHeight: 'calc(100dvh - 200px)', overflowY: 'auto' }
        }}
        onCancel={() => {
          if (!sending) setOpen(false);
        }}
        onOk={submit}
        okText="Lấy dữ liệu"
        cancelText="Đóng"
        confirmLoading={sending}
        okButtonProps={{
          style: { minHeight: 44 },
          disabled:
            !validRange || sameRangeWaiting || query.isPending || query.isError
        }}
        cancelButtonProps={{ disabled: sending, style: { minHeight: 44 } }}
        closable={!sending}
        maskClosable={!sending}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Đảm bảo máy bridge đang bật và kết nối máy chấm công.
          </p>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Chọn tối đa 31 ngày · Giờ Việt Nam
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([0, 1] as const).map((index) => (
                <div key={index}>
                  <label
                    htmlFor={`attendance-import-date-${index}`}
                    className="mb-1 block text-sm"
                  >
                    {index === 0 ? 'Từ ngày' : 'Đến ngày'}
                  </label>
                  <DatePicker
                    id={`attendance-import-date-${index}`}
                    className="w-full"
                    style={{ minHeight: 44 }}
                    locale={viVN}
                    format="DD/MM/YYYY"
                    placeholder="DD/MM/YYYY"
                    value={range[index]}
                    inputReadOnly={false}
                    allowClear={false}
                    needConfirm={false}
                    getPopupContainer={(trigger) => trigger.ownerDocument.body}
                    transitionName=""
                    disabled={sending}
                    maxDate={
                      index === 0 ||
                      range[0].add(30, 'day').isAfter(vietnamToday(), 'day')
                        ? vietnamToday()
                        : range[0].add(30, 'day')
                    }
                    minDate={index === 1 ? range[0] : undefined}
                    onChange={(value) => {
                      if (!value) return;
                      setRange((previous) => {
                        if (index === 1) return [previous[0], value];
                        const end = previous[1].isBefore(value, 'day')
                          ? value
                          : previous[1].isAfter(value.add(30, 'day'), 'day')
                            ? value.add(30, 'day')
                            : previous[1];
                        return [value, end];
                      });
                      setSubmitted('');
                      setError('');
                    }}
                  />
                </div>
              ))}
            </div>
            {validRange && (
              <p
                className="mt-3 text-xs text-gray-500 dark:text-gray-400"
                aria-live="polite"
              >
                {selectedDays} ngày được chọn
              </p>
            )}
            {!validRange && (
              <p className="mt-2 text-red-600">
                Ngày kết thúc phải từ ngày bắt đầu trở đi, tối đa 31 ngày và
                không chọn ngày tương lai.
              </p>
            )}
          </div>
          {submitted && (
            <Alert
              showIcon
              type="success"
              message="Đã gửi yêu cầu lấy dữ liệu."
            />
          )}
          {error && <Alert showIcon type="error" message={error} />}
          {query.isError && (
            <Alert
              type="error"
              message="Không đọc được trạng thái từ host."
              action={
                <Button size="small" onClick={() => void query.refetch()}>
                  Tải lại
                </Button>
              }
            />
          )}
          {sameRangeWaiting && !submitted && (
            <p
              role="status"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              Khoảng ngày này đang được xử lý.
            </p>
          )}
          <div className="max-h-56 space-y-3 overflow-y-auto">
            <h4 className="text-sm font-medium">Yêu cầu gần đây</h4>
            {query.isPending && (
              <p role="status" className="text-sm text-gray-500">
                Đang tải…
              </p>
            )}
            {!query.isPending && !query.isError && requests.length === 0 && (
              <p className="text-sm text-gray-500">
                Chưa có yêu cầu lấy dữ liệu.
              </p>
            )}
            {requests.map((job) => {
              const days =
                dayjs(job.end_date).diff(dayjs(job.start_date), 'day') + 1;
              return (
                <div
                  key={job.id}
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {dayjs(job.start_date).format('DD/MM/YYYY')} –{' '}
                      {dayjs(job.end_date).format('DD/MM/YYYY')}
                    </span>
                    <Tag
                      color={
                        job.status === 'succeeded'
                          ? 'green'
                          : job.status === 'failed'
                            ? 'red'
                            : 'blue'
                      }
                    >
                      {statusLabels[job.status]}
                    </Tag>
                  </div>
                  {job.status === 'processing' && (
                    <Progress
                      size="small"
                      percent={Math.round((job.completed_days / days) * 100)}
                      showInfo={false}
                      status="active"
                    />
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {job.status === 'processing'
                      ? `${job.completed_days}/${days} ngày · `
                      : ''}
                    {job.status === 'pending'
                      ? 'Chờ máy bridge tiếp nhận'
                      : `Thêm ${job.inserted} bản ghi mới`}
                  </p>
                  {job.status === 'failed' && (
                    <Button
                      size="small"
                      className="mt-2 min-h-11"
                      disabled={sending}
                      onClick={() => {
                        setRange([dayjs(job.start_date), dayjs(job.end_date)]);
                        setSubmitted('');
                      }}
                    >
                      Chọn lại để thử lại
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}
