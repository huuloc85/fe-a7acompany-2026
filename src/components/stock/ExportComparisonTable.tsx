import AppSearchInput from '@/components/common/AppSearchInput';
import {
  DatePicker,
  Table,
  TableColumnsType,
  TableProps,
  Tag,
  Tooltip
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';

import AppButton from '@/components/common/AppButton';
import { ProductType } from '@/types/productType';
import {
  ApiErrorResponse,
  StockTransaction,
  TransactionListResponse
} from '@/types/stockTransaction.types';
import { customTableProps } from '@components/custom/TableProps.custom';
import { useCrudList } from '@hooks/useCrudList';
import { useIsMobile } from '@hooks/useIsMobile';
import { productService } from '@services/ProductService';
import { StockTransactionService } from '@services/StockTransactionService';

type TransactionWithFlatProduct = StockTransaction & {
  product_id?: number | string;
  product_code?: string;
  product_name?: string;
};

type DayComparison = {
  poQuantity: number;
  actualQuantity: number;
  difference: number;
  shortageQuantity: number;
  surplusQuantity: number;
};

type ExportComparisonRow = {
  id: string;
  code: string;
  name: string;
  totalPoQuantity: number;
  totalActualQuantity: number;
  totalDifference: number;
  totalShortageQuantity: number;
  totalSurplusQuantity: number;
  times: Record<string, DayComparison>;
};

const formatQuantity = (value: number) =>
  value.toLocaleString('vi-VN', {
    maximumFractionDigits: 5,
    minimumFractionDigits: 0
  });

const measureColumnWidth = (
  values: string[],
  header: string,
  minWidth: number
) => {
  const content = [header, ...values];
  const longest = content.reduce(
    (max, value) => Math.max(max, value.length),
    0
  );

  return Math.max(minWidth, Math.min(160, longest * 8 + 28));
};

const formatDifferenceCell = (
  value: number,
  oppositeValue: number,
  colorClass: string
) => {
  if (value <= 0 || oppositeValue > 0) return '-';

  return (
    <span className={value > 0 ? colorClass : ''}>{formatQuantity(value)}</span>
  );
};

const formatDailyQuantityCell = (value: number, poQuantity: number) => {
  if (poQuantity <= 0) return '-';
  return formatQuantity(value);
};

const getStatusTag = (difference: number) => {
  if (difference < 0) {
    return <Tag color="red">Thiếu</Tag>;
  }

  if (difference > 0) {
    return <Tag color="orange">Dư</Tag>;
  }

  return <Tag color="green">Đủ</Tag>;
};

const getComparisonEndDate = (month: Dayjs) => {
  const today = dayjs();
  const monthEnd = month.endOf('month');

  return monthEnd.isAfter(today, 'day') ? today : monthEnd;
};

const getTransactionProductId = (transaction: TransactionWithFlatProduct) => {
  return (
    transaction.product_id ??
    transaction.storage_product?.product?.id ??
    transaction.storage_product?.product_id
  );
};

const fetchStockOutTransactions = async (monthValue: string) => {
  const selectedMonth = dayjs(monthValue);
  const fromDate = selectedMonth.startOf('month');
  const toDate = getComparisonEndDate(selectedMonth);

  if (fromDate.isAfter(toDate, 'day')) {
    return [];
  }

  const pageSize = 500;
  const maxPages = 50;
  const transactions: TransactionWithFlatProduct[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await StockTransactionService.getTransactions({
      type: 'out',
      from_date: fromDate.format('YYYY-MM-DD'),
      to_date: toDate.format('YYYY-MM-DD'),
      page,
      per_page: pageSize,
      include: 'storage_product.product'
    });

    if ('success' in response && response.success === false) {
      throw new Error(
        (response as ApiErrorResponse).message ||
          'Không thể tải dữ liệu thực xuất'
      );
    }

    const pageData = response as TransactionListResponse;
    transactions.push(
      ...((pageData.data || []) as TransactionWithFlatProduct[])
    );

    if (!pageData.last_page || page >= pageData.last_page) {
      break;
    }
  }

  return transactions;
};

const buildActualQuantityMap = (transactions: TransactionWithFlatProduct[]) => {
  const actualMap = new Map<string, number>();

  transactions.forEach((transaction) => {
    const productId = getTransactionProductId(transaction);
    if (!productId || transaction.type !== 'out') return;

    const dateKey = dayjs(transaction.created_at).format('DD-MM-YYYY');
    const key = `${productId}-${dateKey}`;
    const quantity = Number(transaction.quantity) || 0;

    actualMap.set(key, (actualMap.get(key) || 0) + quantity);
  });

  return actualMap;
};

const buildComparisonRows = (
  products: ProductType[],
  dayList: string[],
  actualMap: Map<string, number>
) => {
  return products.map((product) => {
    const poMap = new Map<string, number>();

    (product.totaldailyquantitiespo || [])
      .filter((item) => item.status === 8)
      .forEach((item) => {
        const dateKey = dayjs(item.date).format('DD-MM-YYYY');
        poMap.set(dateKey, (poMap.get(dateKey) || 0) + item.totalQuan);
      });

    const times: ExportComparisonRow['times'] = {};
    let totalPoQuantity = 0;
    let totalActualQuantity = 0;

    dayList.forEach((date) => {
      const poQuantity = poMap.get(date) || 0;
      const actualQuantity = actualMap.get(`${product.id}-${date}`) || 0;
      const difference = actualQuantity - poQuantity;
      const shortageQuantity = Math.max(poQuantity - actualQuantity, 0);
      const surplusQuantity = Math.max(actualQuantity - poQuantity, 0);

      times[date] = {
        poQuantity,
        actualQuantity,
        difference,
        shortageQuantity,
        surplusQuantity
      };

      totalPoQuantity += poQuantity;
      totalActualQuantity += actualQuantity;
    });

    const totalDifference = totalActualQuantity - totalPoQuantity;

    return {
      id: product.id,
      code: product.code,
      name: product.name,
      totalPoQuantity,
      totalActualQuantity,
      totalDifference,
      totalShortageQuantity: Math.max(-totalDifference, 0),
      totalSurplusQuantity: Math.max(totalDifference, 0),
      times
    };
  });
};

const ExportComparisonTable: React.FC = () => {
  const isMobile = useIsMobile();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [search, setSearch] = useState('');
  const [dayList, setDayList] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const comparisonMonth = month.format('YYYY-MM');

  const { data: tableData, queryResult } = useCrudList({
    service: productService,
    queryKey: 'products-export-comparison',
    initialFilters: {
      limit: 0,
      include: ['totaldailyquantitiespo'],
      month: comparisonMonth
    }
  });

  const stockOutQuery = useQuery({
    queryKey: ['stock-out-export-comparison', comparisonMonth],
    queryFn: () => fetchStockOutTransactions(comparisonMonth)
  });

  useEffect(() => {
    setPage(1);
  }, [month, search]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / limit));

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [limit, page, total]);

  useEffect(() => {
    const fromDate = month.startOf('month');
    const toDate = getComparisonEndDate(month);

    if (fromDate.isAfter(toDate, 'day')) {
      setDayList([]);
      return;
    }

    const daysInRange = toDate.diff(fromDate, 'day') + 1;
    const days = Array.from({ length: daysInRange }, (_, i) =>
      fromDate.add(i, 'day').format('DD-MM-YYYY')
    );

    setDayList(days);
  }, [month]);

  const actualMap = useMemo(
    () => buildActualQuantityMap(stockOutQuery.data || []),
    [stockOutQuery.data]
  );

  const comparisonRows = useMemo(
    () =>
      buildComparisonRows(tableData, dayList, actualMap).filter(
        (item) => item.totalPoQuantity > 0
      ),
    [actualMap, dayList, tableData]
  );

  const visibleDayList = useMemo(
    () =>
      dayList.filter((date) =>
        comparisonRows.some((item) => (item.times[date]?.poQuantity || 0) > 0)
      ),
    [comparisonRows, dayList]
  );

  const dataSource = useMemo(() => {
    let rows = comparisonRows.map((item) => {
      const times = Object.fromEntries(
        visibleDayList.map((date) => [date, item.times[date]])
      );

      return {
        ...item,
        times
      };
    });

    if (search) {
      const keyword = search.toLowerCase().trim();
      rows = rows.filter((item) => item.name.toLowerCase().includes(keyword));
    }

    return rows;
  }, [comparisonRows, search, visibleDayList]);

  const filteredVisibleDayList = useMemo(
    () =>
      visibleDayList.filter((date) =>
        dataSource.some((item) => (item.times[date]?.poQuantity || 0) > 0)
      ),
    [dataSource, visibleDayList]
  );

  const tableDataSource = useMemo(() => {
    return dataSource.map((item) => {
      const times = Object.fromEntries(
        filteredVisibleDayList.map((date) => [date, item.times[date]])
      );

      return {
        ...item,
        times
      };
    });
  }, [dataSource, filteredVisibleDayList]);

  useEffect(() => {
    setTotal(tableDataSource.length);
  }, [tableDataSource.length]);

  const nameColumnWidth = Math.min(
    240,
    Math.max(
      120,
      ...tableDataSource.map((item) => (item.name?.length || 0) * 6.2 + 28)
    )
  );

  const dateColumns: TableColumnsType<ExportComparisonRow> =
    filteredVisibleDayList.map((date, index) => {
      const dateObj = dayjs(date, 'DD-MM-YYYY');
      const isToday = dateObj.isSame(dayjs(), 'day');
      const dayColumnClass = isToday
        ? 'product-day-current'
        : index % 2 === 0
          ? 'product-day-alt'
          : '';
      const poWidth = measureColumnWidth(
        tableDataSource.map((item) =>
          formatQuantity(item.times[date]?.poQuantity || 0)
        ),
        'PO cần xuất',
        92
      );
      const actualWidth = measureColumnWidth(
        tableDataSource.map((item) =>
          formatQuantity(item.times[date]?.actualQuantity || 0)
        ),
        'Đã xuất',
        82
      );
      const shortageWidth = measureColumnWidth(
        tableDataSource.map((item) =>
          formatQuantity(item.times[date]?.shortageQuantity || 0)
        ),
        'Thiếu',
        72
      );
      const surplusWidth = measureColumnWidth(
        tableDataSource.map((item) =>
          formatQuantity(item.times[date]?.surplusQuantity || 0)
        ),
        'Dư',
        72
      );

      return {
        title: (
          <div className={`product-day-pill ${isToday ? 'is-today' : ''}`}>
            {dateObj.format('DD/MM')}
          </div>
        ),
        width: poWidth + actualWidth + shortageWidth + surplusWidth,
        align: 'center',
        children: [
          {
            title: <span className="product-shift-label">PO cần xuất</span>,
            dataIndex: ['times', date, 'poQuantity'],
            align: 'center',
            className: dayColumnClass,
            width: poWidth,
            key: `${date}_po`,
            render: (value, record) =>
              formatDailyQuantityCell(
                Number(value) || 0,
                record.times[date]?.poQuantity || 0
              )
          },
          {
            title: <span className="product-shift-label">Đã xuất</span>,
            dataIndex: ['times', date, 'actualQuantity'],
            align: 'center',
            className: dayColumnClass,
            width: actualWidth,
            key: `${date}_actual`,
            render: (value, record) =>
              formatDailyQuantityCell(
                Number(value) || 0,
                record.times[date]?.poQuantity || 0
              )
          },
          {
            title: <span className="product-shift-label">Thiếu</span>,
            dataIndex: ['times', date, 'shortageQuantity'],
            align: 'center',
            className: dayColumnClass,
            width: shortageWidth,
            key: `${date}_shortage`,
            render: (value, record) => {
              const day = record.times[date];
              if (!day?.poQuantity) return '-';
              return formatDifferenceCell(
                Number(value) || 0,
                day.surplusQuantity || 0,
                'text-red-600'
              );
            }
          },
          {
            title: <span className="product-shift-label">Dư</span>,
            dataIndex: ['times', date, 'surplusQuantity'],
            align: 'center',
            className: dayColumnClass,
            width: surplusWidth,
            key: `${date}_surplus`,
            render: (value, record) => {
              const day = record.times[date];
              if (!day?.poQuantity) return '-';
              return formatDifferenceCell(
                Number(value) || 0,
                day.shortageQuantity || 0,
                'text-orange-600'
              );
            }
          }
        ]
      };
    });

  const columns: TableColumnsType<ExportComparisonRow> = [
    {
      title: <div className="capitalize">STT</div>,
      rowScope: 'row',
      width: 64,
      align: 'center',
      render: (_value, _record, index) => index + 1 + limit * (page - 1)
    },
    {
      title: <div>Tên sản phẩm</div>,
      width: nameColumnWidth,
      fixed: 'left',
      dataIndex: 'name'
    },
    {
      title: <div>PO đến hôm nay</div>,
      align: 'center',
      width: 130,
      dataIndex: 'totalPoQuantity',
      fixed: 'left',
      render: (value) => formatQuantity(Number(value) || 0)
    },
    {
      title: <div>Thực xuất</div>,
      align: 'center',
      width: 110,
      dataIndex: 'totalActualQuantity',
      fixed: 'left',
      render: (value) => formatQuantity(Number(value) || 0)
    },
    {
      title: (
        <Tooltip title="Thiếu = PO cần xuất - Đã xuất, chỉ tính đến ngày hiện tại">
          <div>Thiếu</div>
        </Tooltip>
      ),
      align: 'center',
      width: 100,
      dataIndex: 'totalShortageQuantity',
      fixed: 'left',
      render: (value, record) =>
        formatDifferenceCell(
          Number(value) || 0,
          record.totalSurplusQuantity,
          'text-red-600'
        )
    },
    {
      title: (
        <Tooltip title="Dư = Đã xuất - PO cần xuất, chỉ tính đến ngày hiện tại">
          <div>Dư</div>
        </Tooltip>
      ),
      align: 'center',
      width: 90,
      dataIndex: 'totalSurplusQuantity',
      fixed: 'left',
      render: (value, record) =>
        formatDifferenceCell(
          Number(value) || 0,
          record.totalShortageQuantity,
          'text-orange-600'
        )
    },
    {
      title: <div>Đối chiếu</div>,
      align: 'center',
      width: 105,
      dataIndex: 'totalDifference',
      fixed: 'left',
      render: (value) => getStatusTag(Number(value) || 0)
    },
    ...dateColumns
  ];

  const tableProps: TableProps<ExportComparisonRow> = {
    ...(customTableProps as unknown as TableProps<ExportComparisonRow>),
    tableLayout: 'fixed',
    className: 'product-sticky-table admin-page-sticky-table',
    rowKey: (record) => ['export-comparison', record.id].join('-'),
    columns,
    dataSource: tableDataSource,
    loading: queryResult.isLoading || stockOutQuery.isLoading,
    sticky: {
      offsetHeader: 0
    },
    scroll: {
      x: 'max-content',
      scrollToFirstRowOnChange: false
    },
    pagination: {
      ...customTableProps.pagination,
      position: ['bottomRight'],
      pageSize: limit,
      current: page,
      total,
      onShowSizeChange: (_current, size) => {
        setLimit(size);
      },
      onChange: (currentPage) => {
        setPage(currentPage);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="min-w-0 flex-1 sm:flex-none">
          <AppSearchInput
            placeholder="Tìm sản phẩm..."
            className="!w-full sm:!w-56"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 sm:w-auto dark:border-gray-600 dark:bg-gray-800">
          <span className="text-xs text-gray-500">Tháng:</span>
          <DatePicker
            format="DD/MM/YYYY"
            picker="month"
            value={month}
            size={isMobile ? 'small' : 'middle'}
            className="!rounded-lg"
            onChange={(date) => setMonth(date || dayjs())}
          />
        </div>
        <span className="text-xs text-gray-500">
          Tính đến {getComparisonEndDate(month).format('DD/MM/YYYY')}
        </span>
      </div>

      <div className="hidden sm:block">
        <Table {...tableProps} />
      </div>

      <div className="block sm:hidden">
        {queryResult.isLoading || stockOutQuery.isLoading ? (
          <div className="py-8 text-center text-gray-400">Đang tải...</div>
        ) : dataSource.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Không có dữ liệu</div>
        ) : (
          <>
            <div className="space-y-2">
              {tableDataSource
                .slice((page - 1) * limit, page * limit)
                .map((item) => {
                  const activeDays = filteredVisibleDayList
                    .map((date) => ({
                      date,
                      ...item.times[date]
                    }))
                    .filter((day) => day.poQuantity > 0);

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-100 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-800">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {item.code}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {getStatusTag(item.totalDifference)}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-blue-50 px-2 py-1.5">
                          <div className="text-gray-400">PO cần xuất</div>
                          <div className="text-sm font-bold text-blue-600">
                            {formatQuantity(item.totalPoQuantity)}
                          </div>
                        </div>
                        <div className="rounded bg-emerald-50 px-2 py-1.5">
                          <div className="text-gray-400">Đã xuất</div>
                          <div className="text-sm font-bold text-emerald-600">
                            {formatQuantity(item.totalActualQuantity)}
                          </div>
                        </div>
                        <div className="rounded bg-red-50 px-2 py-1.5">
                          <div className="text-gray-400">Thiếu</div>
                          <div className="text-sm font-bold text-red-600">
                            {formatDifferenceCell(
                              item.totalShortageQuantity,
                              item.totalSurplusQuantity,
                              'text-red-600'
                            )}
                          </div>
                        </div>
                        <div className="rounded bg-orange-50 px-2 py-1.5">
                          <div className="text-gray-400">Dư</div>
                          <div className="text-sm font-bold text-orange-600">
                            {formatDifferenceCell(
                              item.totalSurplusQuantity,
                              item.totalShortageQuantity,
                              'text-orange-600'
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {activeDays.length > 0 ? (
                          activeDays.map((day) => (
                            <div
                              key={`${item.id}-${day.date}`}
                              className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5"
                            >
                              <div className="mb-1 text-xs font-semibold text-gray-700">
                                {dayjs(day.date, 'DD-MM-YYYY').format('DD/MM')}
                              </div>
                              <div className="grid grid-cols-4 gap-1 text-[11px]">
                                <div>
                                  <div className="text-gray-400">PO</div>
                                  <div className="font-semibold text-blue-600">
                                    {formatDailyQuantityCell(
                                      day.poQuantity,
                                      day.poQuantity
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Xuất</div>
                                  <div className="font-semibold text-emerald-600">
                                    {formatDailyQuantityCell(
                                      day.actualQuantity,
                                      day.poQuantity
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Thiếu</div>
                                  <div className="font-semibold text-red-600">
                                    {formatDifferenceCell(
                                      day.shortageQuantity,
                                      day.surplusQuantity,
                                      'text-red-600'
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Dư</div>
                                  <div className="font-semibold text-orange-600">
                                    {formatDifferenceCell(
                                      day.surplusQuantity,
                                      day.shortageQuantity,
                                      'text-orange-600'
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded bg-gray-50 px-2 py-2 text-center text-xs text-gray-400">
                            Không có phát sinh đến ngày đối chiếu
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {total > limit && (
              <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
                <span>
                  {(page - 1) * limit + 1}-{Math.min(page * limit, total)} /{' '}
                  {total}
                </span>
                <div className="flex items-center gap-1">
                  <AppButton
                    size="small"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    ‹
                  </AppButton>
                  <span className="px-1.5 text-xs font-medium text-gray-600">
                    {page} / {Math.ceil(total / limit)}
                  </span>
                  <AppButton
                    size="small"
                    disabled={page * limit >= total}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    ›
                  </AppButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExportComparisonTable;
