import { useDailyScheduleUpdateFields } from '@/configs/dailyScheduleForm.config';
import { DailyScheduleType } from '@/types/dailyScheduleType';
import { QueryParams } from '@/types/queryParams';
import ComponentCard from '@components/common/ComponentCard';
import { ActionGroup } from '@components/common/ActionButtons';
import { customTableProps } from '@components/custom/TableProps.custom';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { UpdateModal } from '@components/ui/CRUD/UpdateModal';
import { productStatusOptions } from '@constants/productStatus.enum';
import { dailyScheduleSchema } from '@schemas/dailyScheduleSchema.schema';
import { dailyScheduleService } from '@services/DailyScheduleService';
import { uiStore } from '@stores/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import {
  DatePicker,
  Empty,
  Pagination,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

export default function DailySchedule() {
  const { isMobile } = useStore(uiStore);
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 50,
    'filter[date]': dayjs().format('YYYY-MM-DD')
  });

  const dailyScheduleUpdateFields = useDailyScheduleUpdateFields();

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin', 'daily-schedule', params],
    queryFn: () => dailyScheduleService.list(params)
  });

  const columns: TableColumnsType<DailyScheduleType> = [
    {
      title: 'STT',
      align: 'center',
      width: 50,
      render: (_v, _r, i) =>
        i + 1 + (params.limit ?? 50) * ((params.page ?? 1) - 1)
    },
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_v, record) => (
        <div>
          <div className="font-medium text-gray-800 dark:text-white/90">
            {record.employee?.name || (
              <span className="text-gray-400 italic">Chưa có</span>
            )}
          </div>
          <span className="text-xs text-gray-400">{record.employee_id}</span>
        </div>
      )
    },
    {
      title: 'Sản phẩm',
      key: 'product_name',
      dataIndex: ['product', 'name'],
      render: (value) => value || <span className="text-gray-300">—</span>
    },
    {
      title: 'Ca',
      dataIndex: 'shift',
      align: 'center',
      width: 70,
      render: (value) => {
        const v = String(value);
        if (v === '1' || v === 'Ca 1') return <Tag color="blue">Ca 1</Tag>;
        if (v === '2' || v === 'Ca 2') return <Tag color="purple">Ca 2</Tag>;
        return '—';
      }
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      align: 'center',
      width: 110,
      render: (value) => dayjs(value).format('DD-MM-YYYY')
    },
    {
      title: 'Bắt đầu',
      dataIndex: 'created_at',
      align: 'center',
      width: 90,
      render: (value) =>
        value ? (
          <span className="font-medium text-emerald-600">
            {dayjs(value).format('HH:mm:ss')}
          </span>
        ) : (
          '—'
        )
    },
    {
      title: 'Sản lượng',
      key: 'quantities',
      align: 'center',
      render: (_v, record) => {
        if (!record.dailyQuantities?.length) return '—';
        return (
          <div className="space-y-0.5 text-xs">
            {record.dailyQuantities.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-center gap-2"
              >
                <span className="text-gray-500">
                  {productStatusOptions.find((o) => o.value === q.status)
                    ?.label || 'N/A'}
                </span>
                <span className="font-semibold text-blue-600">
                  {q.quantity?.toLocaleString()}
                </span>
                {q.created_at_formatted && (
                  <span className="text-gray-400">
                    →{' '}
                    {dayjs(q.created_at_formatted, 'HH:mm:ss').format(
                      'HH:mm:ss'
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      width: 100,
      render: (_v, record) =>
        record.dailyQuantities?.length ? (
          <Tag color="green-inverse" className="font-bold uppercase">
            Đã nhập
          </Tag>
        ) : (
          <Tag color="red-inverse" className="font-bold uppercase">
            Chưa nhập
          </Tag>
        )
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 100,
      render: (_value, record) => (
        <ActionGroup>
          <UpdateModal
            id={record.id}
            service={dailyScheduleService}
            schema={dailyScheduleSchema}
            fields={dailyScheduleUpdateFields}
          />
          <ConfirmButton
            id={record.id}
            service={dailyScheduleService}
            content={
              <span>
                Bạn có chắc chắn muốn xóa bản ghi <strong>{record.id}</strong>{' '}
                không?
              </span>
            }
          />
        </ActionGroup>
      )
    }
  ];

  const tableProps: TableProps<DailyScheduleType> = {
    ...(customTableProps as unknown as TableProps<DailyScheduleType>),
    rowKey: (record) => ['admin', 'daily-schedule', record.id].join('-'),
    columns: columns,
    dataSource: response?.data || [],
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      current: response?.current_page || 1,
      pageSize: response?.per_page || 50,
      total: response?.total || 0,
      onShowSizeChange: (_current, size) => {
        setParams((prev) => ({
          ...prev,
          limit: size
        }));
      },
      onChange: (page) => {
        setParams((prev) => ({
          ...prev,
          page: page
        }));
      }
    }
  };

  const pagination = {
    ...tableProps.pagination
  };

  return (
    <ComponentCard title="Danh sách nhân viên đang làm việc">
      <div className="space-y-5">
        {/* ── Filter Bar ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-blue-500" />
            <DatePicker
              format="DD/MM/YYYY"
              id="admin-date-picker"
              placeholder="Chọn ngày"
              value={dayjs(params['filter[date]'])}
              className="!rounded-lg"
              onChange={(date) => {
                setParams((prev) => ({
                  ...prev,
                  'filter[date]': date ? date.format('YYYY-MM-DD') : undefined
                }));
              }}
            />
          </div>
          <div className="ml-auto text-xs text-gray-500">
            📅 {dayjs(params['filter[date]']).format('DD/MM/YYYY')}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        {isMobile ? (
          <Spin spinning={isLoading}>
            <Pagination {...pagination} />
            <div className="my-6 flex flex-col gap-4">
              {response?.data && response.data.length > 0 ? (
                response.data.map((item) => (
                  <div
                    key={`admin_activity_card-${item.id}`}
                    className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {(item.dailyQuantities?.length ?? 0) > 0 ? (
                        <Tag
                          color="green-inverse"
                          className="font-bold uppercase"
                        >
                          Đã nhập
                        </Tag>
                      ) : (
                        <Tag
                          color="red-inverse"
                          className="font-bold uppercase"
                        >
                          Chưa nhập
                        </Tag>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">
                          Nhân viên:
                        </span>{' '}
                        <span className="font-medium text-gray-800">
                          {item.employee?.name || 'Chưa có thông tin'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">
                          Sản phẩm:
                        </span>{' '}
                        {item.product?.name || 'Chưa xác định'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Ca:</span>{' '}
                        {String(item.shift) === '1' ||
                        String(item.shift) === 'Ca 1' ? (
                          <Tag color="blue">Ca 1</Tag>
                        ) : (
                          <Tag color="purple">Ca 2</Tag>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Ngày:</span>{' '}
                        {dayjs(item.date).format('DD-MM-YYYY')}
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">
                          Bắt đầu:
                        </span>{' '}
                        {item.created_at ? (
                          <Tag color="cyan" className="!text-xs">
                            {dayjs(item.created_at).format('HH:mm:ss')}
                          </Tag>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </div>
                    {(item.dailyQuantities?.length ?? 0) > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <span className="text-xs font-medium text-gray-500">
                          Sản lượng:
                        </span>
                        <ul className="mt-1 space-y-1">
                          {item.dailyQuantities?.map((quantity) => (
                            <li
                              key={quantity.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <Tag color="geekblue" className="!text-xs">
                                {productStatusOptions.find(
                                  (opt) => opt.value === quantity.status
                                )?.label || 'Chưa xác định'}
                              </Tag>
                              <span className="font-semibold text-blue-600">
                                {quantity.quantity?.toLocaleString()}
                              </span>
                              <span className="text-gray-400">
                                lúc {quantity.created_at_formatted}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <Empty />
              )}
            </div>
            <Pagination {...pagination} />
          </Spin>
        ) : (
          <Table<DailyScheduleType> {...tableProps} />
        )}
      </div>
    </ComponentCard>
  );
}
