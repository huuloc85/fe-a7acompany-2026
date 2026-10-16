import { ProductHistoryStatusType } from '@/types/productType';
import { customTableProps } from '@components/custom/TableProps.custom';
import { fetchProductHistoryDetail } from '@services/ProductService';
import { useQuery } from '@tanstack/react-query';
import {
  DatePicker,
  Table,
  TableColumnsType,
  TableProps,
  Tabs,
  TabsProps,
  Tag,
  List,
  Empty
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  FaCalendarAlt,
  FaIndustry,
  FaCheckCircle,
  FaTruck,
  FaExclamationTriangle
} from 'react-icons/fa';
import { DeleteModal, EditModal } from './ActionModal';
import { UpdateQuantityModal } from './UpdateQuantityModal';
import { InlineEditQuantity } from './InlineEditQuantity';
import { ActionGroup } from '@components/common/ActionButtons';
import { dateTimeToShift } from '@utils/dateTimeToShift';
import { useIsMobile } from '@hooks/useIsMobile';
import { motion } from 'framer-motion';

interface ProductDetailProps {
  /** Product ID — passed directly as prop */
  id: string;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ id }) => {
  const isMobile = useIsMobile();
  const [month, setMonth] = useState<Dayjs>(dayjs());

  const HistoryMobileCard: React.FC<{
    record: ProductHistoryStatusType;
    index: number;
    productId?: string;
    hideShift?: boolean;
  }> = ({ record, index, productId, hideShift }) => {
    const shiftValue = record.shift
      ? record.shift
      : dateTimeToShift(
            dayjs(record.date).format('DD-MM-YYYY'),
            record.created_at
          ) === 2
        ? 'Ca 2'
        : 'Ca 1';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {index + 1}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {record.employee?.name || (
                  <span className="text-gray-400 italic">Chưa có tên</span>
                )}
              </div>
              <Tag color="blue" className="!m-0 !text-[10px]">
                {record.employee?.id ?? record.employee_id}
              </Tag>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">
              <InlineEditQuantity
                id={record.id}
                quantity={record.quantity}
                productId={productId ?? ''}
                status={record.status}
              />
            </div>
            <div className="text-[10px] text-gray-400">Số lượng</div>
          </div>
        </div>

        <div
          className={`mt-3 mb-3 grid gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/30 ${hideShift ? 'grid-cols-1' : 'grid-cols-2'}`}
        >
          <div>
            <div className="text-[10px] text-gray-500">Ngày làm việc</div>
            <div className="text-xs font-medium">
              {dayjs(record.date).format('DD-MM-YYYY')}
            </div>
          </div>
          {!hideShift && (
            <div>
              <div className="text-[10px] text-gray-500">Ca làm việc</div>
              <Tag
                color={shiftValue === 'Ca 1' ? 'blue' : 'purple'}
                className="!m-0 !text-[10px]"
              >
                {shiftValue}
              </Tag>
            </div>
          )}
          <div className={hideShift ? 'col-span-1' : 'col-span-2'}>
            <div className="text-[10px] text-gray-500">Lần cuối cập nhật</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {dayjs(record.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          </div>
        </div>

        <ActionGroup className="!justify-end border-t border-gray-100 pt-2 dark:border-gray-700">
          <EditModal
            id={record.id}
            quantity={record.quantity}
            productId={productId ?? ''}
            status={record.status}
          />
          <DeleteModal
            id={record.id}
            status={record.status}
            description={
              <p>
                Hành động không thể khôi phục!!
                <br />
                Bạn có chắc muốn xoá lịch sử cập nhật của{' '}
                <strong>
                  {record.employee?.name ?? record.employee_id}
                </strong>{' '}
                không?
              </p>
            }
          />
        </ActionGroup>
      </motion.div>
    );
  };

  const { data: productHistoryDetail } = useQuery({
    queryKey: ['productDetail', id, month],
    queryFn: async () => {
      return await fetchProductHistoryDetail(id, month.format('MM-YYYY'));
    }
  });

  const dataSourceMap: { [key: string]: ProductHistoryStatusType[] } = {
    status1: productHistoryDetail?.status1 ?? [],
    status2: productHistoryDetail?.status2 ?? [],
    status8:
      productHistoryDetail?.status8 ??
      productHistoryDetail?.product.daily_quantities_po?.filter(
        (item) => item.status === 8
      ) ??
      [],
    status6: productHistoryDetail?.status6 ?? []
  };

  const tableColumns: TableColumnsType<ProductHistoryStatusType> = [
    {
      title: 'STT',
      align: 'center',
      width: 60,
      render: (_value, _record, index) => (
        <span className="font-mono text-xs text-gray-500">{index + 1}</span>
      )
    },
    {
      title: 'Tên nhân viên',
      key: 'employeeName',
      dataIndex: ['employee', 'name'],
      render: (value) => (
        <span className="font-medium text-gray-800 dark:text-white/90">
          {value || (
            <span className="text-gray-400 italic">Chưa có thông tin</span>
          )}
        </span>
      )
    },
    {
      title: 'Mã nhân viên',
      align: 'center',
      key: 'employeeCode',
      dataIndex: ['employee', 'id'],
      render: (value) => (
        <Tag color="blue" className="!font-mono !text-xs">
          {value}
        </Tag>
      )
    },
    {
      title: 'Thời gian cập nhật',
      align: 'center',
      key: 'date',
      dataIndex: ['date'],
      render: (value) => (
        <span className="text-sm">{dayjs(value).format('YYYY-MM-DD')}</span>
      )
    },
    {
      title: 'Ca',
      align: 'center',
      key: 'shift',
      width: 80,
      render: (_value, record) => {
        // Dùng shift từ BE nếu có, fallback dateTimeToShift cho records cũ
        const shiftValue = record.shift
          ? record.shift
          : dateTimeToShift(
                dayjs(record.date).format('DD-MM-YYYY'),
                record.created_at
              ) === 2
            ? 'Ca 2'
            : 'Ca 1';
        return (
          <Tag color={shiftValue === 'Ca 1' ? 'blue' : 'purple'}>
            {shiftValue}
          </Tag>
        );
      }
    },
    {
      title: 'Lần cuối cập nhật',
      key: 'lastUpdate',
      align: 'center',
      dataIndex: ['updated_at'],
      render: (value) => (
        <span className="text-xs text-gray-500">
          {dayjs(value).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      )
    },
    {
      title: 'Số lượng',
      align: 'center',
      key: 'quantity',
      dataIndex: ['quantity'],
      render: (value, record) => {
        if (!value) return <span className="text-gray-300">—</span>;
        return (
          <InlineEditQuantity
            id={record.id}
            quantity={record.quantity}
            productId={productHistoryDetail?.product.id ?? ''}
            status={record.status}
          />
        );
      }
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center',
      width: 200,
      render: (_value, record, index) => (
        <ActionGroup className="!justify-center">
          <EditModal
            id={record.id}
            quantity={record.quantity}
            productId={productHistoryDetail?.product.id ?? ''}
            status={record.status}
          />
          <DeleteModal
            id={record.id}
            status={record.status}
            description={
              <p>
                Hành động không thể khôi phục!!
                <br />
                Bạn có chắc muốn xoá lịch sử cập{' '}
                <strong>
                  #{index + 1} - {record.employee?.name ?? record.employee_id} (
                  {dayjs(record.updated_at).format('YYYY-MM-DD HH:mm:ss')})
                </strong>{' '}
                nhật sản phẩm không?
              </p>
            }
          />
        </ActionGroup>
      )
    }
  ];

  const tableProps: TableProps<ProductHistoryStatusType> = {
    ...(customTableProps as unknown as TableProps<ProductHistoryStatusType>),
    rowKey: (record) =>
      [record.employee?.id ?? record.employee_id, record.id].join('-'),
    columns: tableColumns,
    size: isMobile ? 'small' : 'middle',
    scroll: { x: 'max-content' },
    pagination: {
      ...customTableProps.pagination
    }
  };

  const renderTabContent = (
    data: ProductHistoryStatusType[],
    statusKey: string
  ) => {
    if (isMobile) {
      if (!data || data.length === 0)
        return <Empty description="Không có dữ liệu" />;
      return (
        <List
          dataSource={data}
          pagination={{ pageSize: 10, size: 'small', align: 'center' }}
          renderItem={(record, index) => (
            <List.Item className="!border-b-0 !px-0 !py-1">
              <HistoryMobileCard
                record={record}
                index={index}
                productId={productHistoryDetail?.product.id}
                hideShift={statusKey === 'status8'}
              />
            </List.Item>
          )}
        />
      );
    }

    const cols =
      statusKey === 'status8'
        ? tableColumns.filter((col) => col.key !== 'shift')
        : tableColumns;

    return <Table {...tableProps} columns={cols} dataSource={data} />;
  };

  const productTabs: TabsProps['items'] = [
    {
      key: 'status1',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaIndustry className="text-emerald-500" />
          Sản xuất (100%)
        </span>
      ),
      children: renderTabContent(dataSourceMap['status1'], 'status1')
    },
    {
      key: 'status2',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaCheckCircle className="text-cyan-500" />
          Kiểm (200%)
        </span>
      ),
      children: renderTabContent(dataSourceMap['status2'], 'status2')
    },
    {
      key: 'status8',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaTruck className="text-amber-500" />
          Xuất hàng (200%)
        </span>
      ),
      children: renderTabContent(dataSourceMap['status8'], 'status8')
    },
    {
      key: 'status6',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaExclamationTriangle className="text-red-500" />
          Hàng lỗi
        </span>
      ),
      children: renderTabContent(dataSourceMap['status6'], 'status6')
    }
  ];

  return (
    <div className={isMobile ? 'space-y-3' : 'space-y-5'}>
      {/* ── Product Info Header ─────────────────────────────────── */}
      <div
        className={`flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-gray-700 dark:from-blue-900/20 dark:to-indigo-900/20 ${isMobile ? 'p-3' : 'p-5'}`}
      >
        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {productHistoryDetail?.product.name ?? 'N/A'}
          </h4>
          <div className="flex items-center gap-2">
            <Tag color="blue" className="!font-mono">
              {productHistoryDetail?.product.code ?? 'N/A'}
            </Tag>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {productHistoryDetail?.product && (
            <UpdateQuantityModal product={productHistoryDetail.product} />
          )}
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div
        className={`rounded-xl border border-gray-100 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50 ${isMobile ? 'p-3' : 'p-4'}`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              <FaCalendarAlt className="mr-1 inline-block text-blue-500" />
              Tháng
            </label>
            <DatePicker
              format="DD/MM/YYYY"
              value={month}
              picker="month"
              className="!rounded-lg"
              onChange={(date) => (date ? setMonth(date) : setMonth(dayjs()))}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs
        items={productTabs}
        type={isMobile ? 'line' : 'card'}
        size={isMobile ? 'small' : 'large'}
        tabPosition="top"
        animated
      />
    </div>
  );
};
