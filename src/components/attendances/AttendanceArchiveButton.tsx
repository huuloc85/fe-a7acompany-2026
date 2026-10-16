import AppSearchInput from '@/components/common/AppSearchInput';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OvertimeApprovalStatus } from './OvertimeApprovalStatus';
import { OvertimeApprovalActions } from './OvertimeApprovalActions';
import { getOvertimeApprovalMessages } from '@/utils/overtimeApproval';
import {
  Alert,
  Button,
  DatePicker,
  Modal,
  Select,
  Space,
  Table,
  message
} from 'antd';
import type { TableColumnsType } from 'antd';
import { DatabaseOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import AppButton from '@/components/common/AppButton';
import { fetchAttendanceDailyResults } from '@/services/AttendanceService';
import type { AttendanceDailyResult } from '@/services/AttendanceService';
import { getAttendanceWindow } from '@/utils/attendanceWindow';

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY HH:mm:ss') : '—';

export default function AttendanceArchiveButton() {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => getAttendanceWindow().month);
  const [searchType, setSearchType] = useState<
    'employee_id' | 'employees.name'
  >('employee_id');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [exporting, setExporting] = useState(false);
  const params = {
    'filter[date_between]': `${month.startOf('month').format('YYYY-MM-DD')},${month.endOf('month').format('YYYY-MM-DD')}`,
    [`filter[${searchType}]`]: search.trim() || undefined,
    sort: 'date,employee_id',
    page,
    limit
  };
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['attendance-daily-results', params],
    queryFn: () => fetchAttendanceDailyResults(params),
    enabled: open
  });
  const columns: TableColumnsType<AttendanceDailyResult> = [
    { title: 'Mã nhân viên', dataIndex: 'employee_id', width: 125 },
    { title: 'Tên nhân viên', dataIndex: 'name', width: 180 },
    { title: 'Công ty', dataIndex: 'company', width: 90 },
    {
      title: 'Ngày công',
      dataIndex: 'date',
      width: 115,
      render: (value) => dayjs(value).format('DD/MM/YYYY')
    },
    {
      title: 'Giờ vào',
      dataIndex: 'time_in',
      width: 180,
      render: formatDateTime
    },
    {
      title: 'Giờ ra',
      dataIndex: 'time_out',
      width: 180,
      render: formatDateTime
    },
    { title: 'Loại ngày', dataIndex: 'day_type', width: 160 },
    { title: 'Tổng giờ', dataIndex: 'total_hours', width: 95 },
    { title: 'Giờ chính', dataIndex: 'administrative_hours', width: 95 },
    {
      title: 'Tăng ca',
      dataIndex: 'overtime_hours',
      width: 220,
      render: (hours, row) => (
        <div>
          {hours}h
          <OvertimeApprovalStatus
            date={row.date}
            hours={hours}
            approval={row.overtime_approval}
          />
          <OvertimeApprovalActions record={row} />
        </div>
      )
    },
    {
      title: 'Lần lưu gần nhất',
      dataIndex: 'calculated_at',
      width: 180,
      render: formatDateTime
    }
  ];
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: AttendanceDailyResult[] = [];
      let lastPage = 1;
      for (let nextPage = 1; nextPage <= lastPage; nextPage++) {
        const response = await fetchAttendanceDailyResults({
          ...params,
          page: nextPage,
          limit: 500
        });
        rows.push(...response.data);
        lastPage = response.last_page;
      }
      if (!rows.length) {
        message.info('Không có hồ sơ đã lưu theo bộ lọc này.');
        return;
      }
      // Quote all values and neutralize spreadsheet formulas in saved text.
      const cell = (value: unknown) =>
        `"${String(value ?? '')
          .replace(/^[=+@\-\t\r]/, "'$&")
          .replace(/"/g, '""')}"`;
      const csv = [
        [
          'Mã nhân viên',
          'Tên nhân viên',
          'Công ty',
          'Ngày công',
          'Giờ vào',
          'Giờ ra',
          'Loại ngày',
          'Tổng giờ',
          'Giờ chính',
          'Tăng ca',
          'Duyệt tăng ca',
          'Lần lưu gần nhất'
        ],
        ...rows.map((row) => [
          row.employee_id,
          row.name,
          row.company,
          row.date,
          row.time_in,
          row.time_out,
          row.day_type,
          row.total_hours,
          row.administrative_hours,
          row.overtime_hours,
          getOvertimeApprovalMessages(row.overtime_hours, row.overtime_approval)
            .map((item) => item.text)
            .join('; '),
          row.calculated_at
        ])
      ]
        .map((row) => row.map(cell).join(','))
        .join('\r\n');
      saveAs(
        new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
        `cong-luu-tru-${month.format('YYYY-MM')}.csv`
      );
    } catch {
      message.error(
        'Không tải được đầy đủ hồ sơ. Chưa tạo file, vui lòng thử lại.'
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <AppButton
        tone="info"
        icon={<DatabaseOutlined />}
        onClick={() => setOpen(true)}
      >
        Tra cứu công lưu trữ
      </AppButton>
      <Modal
        title="Hồ sơ công đã lưu"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={1200}
      >
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="Tra cứu mọi tháng đã lưu, không giới hạn 3 tháng."
            description="Chỉ đọc dữ liệu lưu trữ, không tính lại. File CSV tải toàn bộ kết quả theo bộ lọc, không chỉ trang đang xem. Đây là bản tổng hợp công, không phải bản sao từng lượt quẹt máy."
          />
          <Space wrap>
            <DatePicker
              format="MM/YYYY"
              aria-label="Tháng lưu trữ"
              picker="month"
              value={month}
              allowClear={false}
              disabled={exporting}
              onChange={(value) => {
                if (value) {
                  setMonth(value);
                  setPage(1);
                }
              }}
            />
            <Select
              aria-label="Tìm hồ sơ theo"
              value={searchType}
              disabled={exporting}
              style={{ width: 160 }}
              options={[
                { value: 'employee_id', label: 'Mã nhân viên' },
                { value: 'employees.name', label: 'Tên nhân viên' }
              ]}
              onChange={(value) => {
                setSearchType(value);
                setSearch('');
                setPage(1);
              }}
            />
            <AppSearchInput
              aria-label="Tìm nhân viên lưu trữ"
              placeholder="Nhập mã hoặc tên…"
              value={search}
              disabled={exporting}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Button loading={isFetching} onClick={() => void refetch()}>
              Làm mới
            </Button>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              disabled={isFetching || isError || !data?.total}
              onClick={() => void exportCsv()}
            >
              Tải CSV
            </Button>
          </Space>
          {isError ? (
            <Alert
              type="error"
              showIcon
              message="Không tải được hồ sơ lưu trữ. Kiểm tra kết nối/quyền truy cập rồi bấm Làm mới."
            />
          ) : (
            <Table<AttendanceDailyResult>
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={data?.data ?? []}
              loading={isFetching}
              scroll={{ x: 1500 }}
              locale={{
                emptyText: 'Chưa có hồ sơ đã lưu cho tháng/bộ lọc này.'
              }}
              pagination={{
                current: page,
                pageSize: limit,
                total: data?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100],
                showTotal: (total) => `${total} hồ sơ`,
                onChange: (nextPage, size) => {
                  setPage(size === limit ? nextPage : 1);
                  setLimit(size);
                }
              }}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
