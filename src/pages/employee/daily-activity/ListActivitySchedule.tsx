import { useDailyScheduleUpdateFields } from '@/configs/dailyScheduleForm.config';
import { DailyQuantitiesType } from '@/types/dailyQuantitiesType';
import { DailyScheduleType } from '@/types/dailyScheduleType';
import { QueryParams } from '@/types/queryParams';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { customTableProps } from '@components/custom/TableProps.custom';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { UpdateModal } from '@components/ui/CRUD/UpdateModal';
import { ActionGroup } from '@components/common/ActionButtons';
import { productStatusOptions } from '@constants/productStatus.enum';
import { dailyScheduleSchema } from '@schemas/dailyScheduleSchema.schema';
import {
  empDailyScheduleService,
  fetchEmpDailyActivities
} from '@services/DailyScheduleService';
import { uiStore } from '@stores/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import {
  DatePicker,
  Empty,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import { FaClipboardList } from 'react-icons/fa6';
import { ActivityCard } from './ActivityCard';

export const ListActivity = () => {
  const { isMobile } = useStore(uiStore);
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 10,
    'filter[date]': dayjs().format('YYYY-MM-DD')
  });

  const dailyScheduleUpdateFields = useDailyScheduleUpdateFields();

  const {
    data: response,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['employee', 'daily-activities', params],
    queryFn: () => fetchEmpDailyActivities(params)
  });

  const columns: TableColumnsType<DailyScheduleType> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      width: 60,
      render: (_value, _record, index) => (
        <span className="font-mono text-xs text-gray-500">
          {index + 1 + (params.limit ?? 10) * ((params.page ?? 1) - 1)}
        </span>
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
      title: 'Ca làm việc',
      key: 'shift',
      dataIndex: ['shift'],
      align: 'center',
      render: (value) => (
        <Tag color={value === 'Ca 1' ? 'blue' : 'purple'} className="!text-xs">
          {value}
        </Tag>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      render: (_value, record) => {
        if (record.dailyQuantities) {
          return (
            <Tag color="green-inverse" className="font-bold uppercase">
              Đã nhập
            </Tag>
          );
        } else {
          return (
            <Tag color="red-inverse" className="font-bold uppercase">
              Chưa nhập
            </Tag>
          );
        }
      }
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
            service={empDailyScheduleService}
            schema={dailyScheduleSchema}
            fields={dailyScheduleUpdateFields}
          />
          <ConfirmButton
            id={record.id}
            service={empDailyScheduleService}
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

  const expandColumns: TableColumnsType<DailyQuantitiesType> = [
    {
      title: 'Loại sản phẩm',
      key: 'working',
      dataIndex: ['status'],
      render: (value) => (
        <Tag color="geekblue">
          {productStatusOptions.find((item) => item.value === value)?.label ||
            'Chưa xác định'}
        </Tag>
      )
    },
    {
      title: 'Số lượng',
      key: 'quantity',
      dataIndex: ['quantity'],
      render: (value) => {
        if (!value) return <span className="text-gray-300">—</span>;
        return (
          <span className="font-semibold text-blue-600">
            {value.toLocaleString('en-US', {
              maximumFractionDigits: 0
            })}
          </span>
        );
      }
    },
    {
      title: 'Thời gian kết thúc',
      key: 'end_time',
      align: 'center',
      dataIndex: ['created_at_formatted'],
      render: (value) => {
        return (
          <Tag color="green" className="!text-xs">
            {dayjs(value, 'HH:mm:ss').format('HH:mm:ss')}
          </Tag>
        );
      }
    }
  ];

  const tableProps: TableProps<DailyScheduleType> = {
    // TODO: Fix type casting issue
    ...(customTableProps as unknown as TableProps<DailyScheduleType>),
    rowKey: (record) => ['activity', record.id].join('-'),
    columns: columns,
    expandable: {
      expandedRowRender: (record) => (
        <Table<DailyQuantitiesType>
          rowKey={(record) => ['expanded', 'activity', record.id].join('-')}
          columns={expandColumns}
          dataSource={record.dailyQuantities || []}
          pagination={false}
        />
      ),
      defaultExpandAllRows: true
    },
    dataSource: response?.data || [],
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      current: response?.current_page || 1,
      pageSize: response?.per_page || 10,
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

  return (
    <>
      <BackButton to="/" />
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaClipboardList className="text-blue-500" />
            <span>Lịch sử bản ghi của nhân viên</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton isLoading={isFetching} refresh={refetch} />
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <Tag color="blue" className="!m-0 !text-xs">
                <FaCalendarAlt className="mr-1 inline-block" />
                {dayjs(params['filter[date]']).format('DD/MM/YYYY')}
              </Tag>
            </div>
          </div>

          {/* ── Filter Bar ──────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaCalendarAlt className="mr-1 inline-block text-blue-500" />
                Chọn ngày
              </label>
              <DatePicker
                format="DD/MM/YYYY"
                id="month-picker"
                placeholder="Chọn ngày"
                value={dayjs(params['filter[date]'])}
                className="!max-w-xs !rounded-lg"
                onChange={(date) => {
                  setParams((prev) => ({
                    ...prev,
                    'filter[date]': date ? date.format('YYYY-MM-DD') : undefined
                  }));
                }}
              />
            </div>
          </div>

          {/* ── Table / Mobile Cards ───────────────────────────── */}
          {isMobile ? (
            <Spin spinning={isLoading}>
              {response?.data && response.data.length > 0 ? (
                <>
                  <div className="flex flex-col gap-2.5">
                    {response.data.map((item) => (
                      <ActivityCard
                        key={`activity_card-${item.id}`}
                        id={item.id}
                        productName={item.product?.name || 'Chưa xác định'}
                        shift={item.shift}
                        startDate={dayjs(item.date).format('DD-MM-YYYY')}
                        isStatus={(item.dailyQuantities?.length ?? 0) > 0}
                        quantities={item.dailyQuantities?.map((quantity) => ({
                          type: quantity.status,
                          quantity: quantity.quantity,
                          time: quantity.created_at_formatted ?? ''
                        }))}
                      />
                    ))}
                  </div>

                  {/* Mobile pagination */}
                  {(response?.total || 0) > (params.limit ?? 10) && (
                    <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
                      <span>
                        {((params.page ?? 1) - 1) * (params.limit ?? 10) + 1}-
                        {Math.min(
                          (params.page ?? 1) * (params.limit ?? 10),
                          response?.total || 0
                        )}{' '}
                        / {response?.total || 0}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40 dark:border-gray-600"
                          disabled={(params.page ?? 1) <= 1}
                          onClick={() =>
                            setParams((prev) => ({
                              ...prev,
                              page: (prev.page ?? 1) - 1
                            }))
                          }
                        >
                          ‹
                        </button>
                        <span className="px-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                          {params.page ?? 1} /{' '}
                          {Math.ceil(
                            (response?.total || 0) / (params.limit ?? 10)
                          )}
                        </span>
                        <button
                          className="rounded border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40 dark:border-gray-600"
                          disabled={
                            (params.page ?? 1) * (params.limit ?? 10) >=
                            (response?.total || 0)
                          }
                          onClick={() =>
                            setParams((prev) => ({
                              ...prev,
                              page: (prev.page ?? 1) + 1
                            }))
                          }
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Empty description="Không có dữ liệu" />
              )}
            </Spin>
          ) : (
            <Table<DailyScheduleType> {...tableProps} />
          )}
        </div>
      </ComponentCard>
    </>
  );
};
