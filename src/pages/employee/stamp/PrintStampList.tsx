import { QueryParams } from '@/types/queryParams';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { customTableProps } from '@components/custom/TableProps.custom';
import { UserInfo } from '@components/UserInfo';
import {
  fetchEmpStampHistory,
  HistoryPrintStampType
} from '@services/StampService';
import { uiStore } from '@stores/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { DatePicker, Spin, Table, TableColumnsType, Tag, Empty } from 'antd';
import { TableProps } from 'antd/lib';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from 'react-icons/fa';
import { FaStamp } from 'react-icons/fa6';
import { StampDetailCard } from './StampDetailCard';

export const PrintStampList = () => {
  const { isMobile } = useStore(uiStore);

  const [date, setDate] = useState<Dayjs>(dayjs());
  const [params, setParams] = useState<QueryParams>({
    limit: 0,
    include: ['employee', 'manager', 'product'],
    'filter[created_at]': dayjs().format('YYYY-MM-DD')
  });

  const {
    data: historyData,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['historyPrintStamp', params],
    queryFn: async () => await fetchEmpStampHistory(params)
  });

  const approvedData =
    historyData?.data.filter((item) => item.status === 'approve') || [];

  const rejectedData =
    historyData?.data.filter((item) => item.status === 'rejected') || [];
  const pendingData =
    historyData?.data.filter((item) => item.status === 'pending') || [];

  const columns: TableColumnsType<HistoryPrintStampType> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      width: 60,
      render: (_value, _record, index) => (
        <span className="font-mono text-xs text-gray-500">{index + 1}</span>
      )
    },
    {
      title: 'Tên sản phẩm',
      key: 'product_name',
      dataIndex: ['product', 'name'],
      render: (value) => (
        <span className="font-medium text-gray-800 dark:text-white/90">
          {value}
        </span>
      )
    },
    {
      title: 'Số Lot',
      key: 'lot_number',
      dataIndex: ['date'],
      render: (value) => (
        <span className="text-sm">{dayjs(value).format('DD-MM-YYYY')}</span>
      )
    },
    {
      title: 'Ca',
      key: 'shift',
      dataIndex: 'shift',
      align: 'center',
      render: (value) => (
        <Tag color={value === 1 ? 'blue' : 'purple'} className="!text-xs">
          Ca {value}
        </Tag>
      )
    },
    {
      title: 'Số lượng in',
      key: 'print_quantity',
      dataIndex: 'binCount',
      align: 'center',
      render: (value) => (
        <span className="font-semibold text-blue-600">{value}</span>
      )
    },
    {
      title: 'Tem từ',
      key: 'bin_start',
      dataIndex: 'binStart',
      align: 'center',
      render: (value, record) => {
        const startStr = String(value || '');
        if (!startStr) return <span className="text-gray-300">—</span>;
        let display = startStr;
        if (!startStr.includes(',')) {
          const startNum = Number(startStr);
          const countNum = Number(record.binCount || 1);
          if (!isNaN(startNum) && !isNaN(countNum) && countNum > 1) {
            display = `${startNum} → ${startNum + countNum - 1}`;
          }
        }
        return (
          <Tag color="geekblue" className="!font-mono !text-xs">
            {display}
          </Tag>
        );
      }
    },
    {
      title: 'Loại tem',
      key: 'stamp_type',
      dataIndex: 'type',
      render: (value) => {
        if (!value) return <span className="text-gray-300">—</span>;
        const typeMap: Record<string, { label: string; color: string }> = {
          box: { label: 'Tem thùng', color: 'cyan' },
          bag: { label: 'Tem bịch', color: 'orange' }
        };
        const info = typeMap[value];
        return info ? (
          <Tag color={info.color}>{info.label}</Tag>
        ) : (
          <span>{value}</span>
        );
      }
    },
    {
      title: 'Mục đích in',
      key: 'purpose',
      dataIndex: 'purpose',
      render: (value) => {
        if (!value) return <span className="text-gray-300">—</span>;
        const purposeMap: Record<string, { label: string; color: string }> = {
          new: { label: 'In mới', color: 'green' },
          additional: { label: 'In thêm', color: 'blue' },
          reprint: { label: 'In lại', color: 'orange' }
        };
        const info = purposeMap[value];
        return info ? (
          <Tag color={info.color}>{info.label}</Tag>
        ) : (
          <span>{value}</span>
        );
      }
    },
    {
      title: 'Ngày tạo',
      key: 'print_day',
      dataIndex: 'created_at',
      render: (value) => (
        <span className="text-sm">{dayjs(value).format('DD-MM-YYYY')}</span>
      )
    },
    {
      title: 'Thời gian tạo',
      key: 'print_time',
      dataIndex: 'created_at',
      render: (value) => (
        <Tag className="!text-xs">{dayjs(value).format('HH:mm:ss')}</Tag>
      )
    },

    {
      title: 'Tên nhân viên duyệt',
      key: 'name',
      dataIndex: ['manager', 'name'],
      render: (value) => (
        <span className="font-medium text-gray-800 dark:text-white/90">
          {value || <span className="text-gray-400 italic">—</span>}
        </span>
      )
    },
    {
      title: 'Thời gian in',
      key: 'manager_time',
      dataIndex: 'manager_time',
      align: 'center',
      render: (value) => {
        if (!value) return <span className="text-gray-300">—</span>;
        return (
          <Tag color="green" className="!text-xs">
            {dayjs(value, 'HH:mm:ss').format('HH:mm:ss')}
          </Tag>
        );
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      dataIndex: 'status',
      align: 'center',
      render: (value) => {
        if (value === 'pending') {
          return (
            <Tag color="default" className="font-bold uppercase">
              Chờ in
            </Tag>
          );
        }
        if (value === 'approve') {
          return (
            <Tag color="green-inverse" className="font-bold uppercase">
              Đã in
            </Tag>
          );
        }
        if (value === 'rejected') {
          return (
            <Tag color="red-inverse" className="font-bold uppercase">
              Từ chối
            </Tag>
          );
        }
        return value;
      }
    }
  ];

  const createTableProps = (
    data: HistoryPrintStampType[]
  ): TableProps<HistoryPrintStampType> => ({
    ...(customTableProps as unknown as TableProps<HistoryPrintStampType>),
    rowKey: (record) =>
      [
        'employee',
        'stamp',
        'history',
        record.id,
        record.employee_id,
        record.date
      ].join('-'),
    columns: columns,
    dataSource: data,
    loading: isLoading,
    pagination: false
  });

  const SectionHeader = ({
    icon,
    label,
    count,
    colorClass
  }: {
    icon: React.ReactNode;
    label: string;
    count: number;
    colorClass: string;
  }) => (
    <div
      className={`flex items-center gap-2 rounded-t-xl border-b p-3 ${colorClass}`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
      <Tag className="!m-0 ml-auto !text-xs">{count}</Tag>
    </div>
  );

  return (
    <>
      <BackButton to="/employee/stamps/request" />
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaStamp className="text-indigo-500" />
            <span>Bảng Trạng Thái In Tem</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── User Info ──────────────────────────────────────── */}
          <UserInfo />

          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton isLoading={isFetching} refresh={refetch} />

            <div className="flex flex-1 items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaCalendarAlt className="mr-1 inline-block text-blue-500" />
                Ngày:
              </label>
              <DatePicker
                value={date}
                className="!w-full !rounded-lg sm:!w-auto"
                onChange={(value) => {
                  if (value) {
                    setParams((prev) => ({
                      ...prev,
                      'filter[created_at]': dayjs(value).format('YYYY-MM-DD')
                    }));
                    setDate(dayjs(value));
                  } else {
                    setParams((prev) => ({
                      ...prev,
                      'filter[created_at]': dayjs().format('YYYY-MM-DD')
                    }));
                    setDate(dayjs());
                  }
                }}
                allowClear
              />
            </div>

            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <Tag color="blue" className="!m-0 !text-xs">
                📅 {date.format('DD/MM/YYYY')}
              </Tag>
            </div>
          </div>

          {/* ── Empty State ────────────────────────────────────── */}
          {!isLoading &&
            pendingData.length === 0 &&
            approvedData.length === 0 &&
            rejectedData.length === 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-800/50">
                <Empty description="Không có dữ liệu in tem cho ngày này" />
              </div>
            )}

          {/* ── Pending Stamps ─────────────────────────────────── */}
          {(isLoading || pendingData.length > 0) && (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <SectionHeader
                icon={<FaClock className="text-gray-500" />}
                label="Tem đang chờ in"
                count={pendingData.length}
                colorClass="border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
              />
              {isMobile ? (
                <div className="p-3">
                  <Spin spinning={isLoading}>
                    <StampDetailCard data={pendingData} />
                  </Spin>
                </div>
              ) : (
                <Table {...createTableProps(pendingData)} />
              )}
            </div>
          )}

          {/* ── Approved Stamps ────────────────────────────────── */}
          {(isLoading || approvedData.length > 0) && (
            <div className="overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800">
              <SectionHeader
                icon={<FaCheckCircle className="text-emerald-500" />}
                label="Tem đã in"
                count={approvedData.length}
                colorClass="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              />
              {isMobile ? (
                <div className="p-3">
                  <Spin spinning={isLoading}>
                    <StampDetailCard data={approvedData} />
                  </Spin>
                </div>
              ) : (
                <Table {...createTableProps(approvedData)} />
              )}
            </div>
          )}

          {/* ── Rejected Stamps ────────────────────────────────── */}
          {(isLoading || rejectedData.length > 0) && (
            <div className="overflow-hidden rounded-xl border border-red-200 dark:border-red-800">
              <SectionHeader
                icon={<FaTimesCircle className="text-red-500" />}
                label="Tem bị từ chối"
                count={rejectedData.length}
                colorClass="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              />
              {isMobile ? (
                <div className="p-3">
                  <Spin spinning={isLoading}>
                    <StampDetailCard data={rejectedData} />
                  </Spin>
                </div>
              ) : (
                <Table {...createTableProps(rejectedData)} />
              )}
            </div>
          )}
        </div>
      </ComponentCard>
    </>
  );
};
