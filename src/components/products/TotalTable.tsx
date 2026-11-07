import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  Table,
  TableColumnsType,
  TableProps,
  Tooltip,
  Pagination,
  Spin,
  Empty,
  Tag
} from 'antd';
import React, { useState } from 'react';

import { ProductType } from '@/types/productType';
import { QueryParams } from '@/types/queryParams';
import { PaginatedResponse } from '@/types/responseTypes';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import { getMonthlyQuantities } from '@services/TotalQuantityService';
import { calculateTotalProduct } from '@utils/calculateTotalProduct';
import { RowTableActions } from './RowTableActions';
import { useProductDrawer } from '@/contexts/ProductDrawerContext';
import { useIsMobile } from '@hooks/useIsMobile';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';

export type TotalTableType = {
  id: string;
  name: string;
  code: string;
  stockMOQ: number;
  catonQuantity: number;
  planTime: number;
  realTime: number;
  FAPV: boolean;
  FASV: boolean;
  FAVV: boolean;
  stockStartQuantity: number;
  realityQuantity: number;
  exportQuantity: number;
  checked200: number;
  notCheck200: number;
  stockEndQuantity: number;
  storageTime: number;
  times: {
    [date: string]: {
      quantity: number;
    };
  };
};

interface TotalTableProps {
  months?: string[];
  queryResult: UseQueryResult<PaginatedResponse<ProductType>>;
  params: QueryParams;
  setParams: React.Dispatch<React.SetStateAction<QueryParams>>;
  displayMode: string;
}

/* ── Mobile Stat Item ────────────────────────────────────────── */
const StatItem: React.FC<{
  label: string;
  value: string | number;
  color?: string;
}> = ({ label, value, color = 'text-gray-900 dark:text-white' }) => (
  <div className="ui-record-stat rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-700/40">
    <div className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">
      {label}
    </div>
    <div className={`text-sm font-bold ${color}`}>{value}</div>
  </div>
);

const TotalHeaderTitle: React.FC<{
  lines: React.ReactNode[];
  align?: 'left' | 'center';
}> = ({ lines, align = 'center' }) => (
  <div
    className={`product-total-header-title ${
      align === 'left' ? 'is-left' : ''
    }`}
  >
    {lines.map((line, index) => (
      <span className="product-total-header-title__line" key={index}>
        {line}
      </span>
    ))}
  </div>
);

/* ── Mobile Card ─────────────────────────────────────────────── */
const TotalMobileCard: React.FC<{
  record: TotalTableType;
  months?: string[];
  index: number;
  displayMode: string;
}> = ({ record, months, index, displayMode }) => {
  const [expanded, setExpanded] = useState(false);
  const { openProduct } = useProductDrawer();

  const fmt = (v: number) => (v ? v.toLocaleString() : '0');
  const fmtDec = (v: number) =>
    v ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '0';

  // Month export data (only months with data)
  const monthsWithData = (months ?? []).filter((m) => {
    if (displayMode !== 'hide' && !m.endsWith(`-${displayMode}`)) return false;
    const entry = record.times[m];
    return entry && entry.quantity > 0;
  });

  return (
    <div className="ui-record-card rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* ── Header ── */}
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => openProduct(record.id)}
            className="text-left text-sm leading-tight font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            {record.name}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Tag color="default" className="!m-0 !text-[10px]">
              {record.code}
            </Tag>
            {Boolean(record.FAPV) && (
              <Tag color="green" className="!m-0 !text-[10px]">
                FAPV
              </Tag>
            )}
            {Boolean(record.FASV) && (
              <Tag color="blue" className="!m-0 !text-[10px]">
                FASV
              </Tag>
            )}
            {Boolean(record.FAVV) && (
              <Tag color="purple" className="!m-0 !text-[10px]">
                FAVV
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* ── Key stats - always visible ── */}
      <div className="grid grid-cols-3 gap-1.5 border-t border-gray-100 px-3 py-2 dark:border-gray-700">
        <StatItem
          label="Tồn ĐK"
          value={fmt(record.stockStartQuantity)}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatItem
          label="Thực tế SX"
          value={fmt(record.realityQuantity)}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatItem
          label="Đã xuất"
          value={fmt(record.exportQuantity)}
          color="text-amber-600 dark:text-amber-400"
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-3 pb-2 dark:border-gray-700">
        <StatItem
          label="Đã kiểm 200%"
          value={fmt(record.checked200)}
          color="text-cyan-600 dark:text-cyan-400"
        />
        <StatItem
          label="Chưa kiểm 200%"
          value={fmt(record.notCheck200)}
          color="text-red-600 dark:text-red-400"
        />
        <StatItem
          label="Tồn CK"
          value={fmt(record.stockEndQuantity)}
          color="text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* ── Expand toggle ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 py-2 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 dark:border-gray-700 dark:text-gray-500"
      >
        {expanded ? (
          <>
            Thu gọn <FaChevronUp className="text-[8px]" />
          </>
        ) : (
          <>
            Thêm chi tiết <FaChevronDown className="text-[8px]" />
          </>
        )}
      </button>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="space-y-2 border-t border-gray-100 px-3 pt-2 pb-3 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-1.5">
            <StatItem label="SL MOQ" value={fmt(record.stockMOQ)} />
            <StatItem
              label="Thùng CATON/tháng"
              value={fmt(record.catonQuantity)}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <StatItem
              label="TG dự định (ngày)"
              value={fmtDec(record.planTime)}
            />
            <StatItem
              label="TG thực tế (ngày)"
              value={fmtDec(record.realTime)}
            />
            <StatItem label="Ngày tồn kho" value={fmtDec(record.storageTime)} />
          </div>

          {displayMode !== 'hide' && monthsWithData.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                Xuất theo từng tháng
              </div>
              <div className="mt-1 space-y-0.5">
                {monthsWithData.map((m) => (
                  <div
                    key={m}
                    className="grid grid-cols-2 gap-1.5 rounded-md px-1 py-1.5 text-xs odd:bg-gray-50 dark:odd:bg-gray-700/30"
                  >
                    <div className="font-medium text-gray-600 dark:text-gray-300">
                      Tháng {m}
                    </div>
                    <div className="text-right font-semibold text-blue-600 dark:text-blue-400">
                      {record.times[m]?.quantity?.toLocaleString() || '0'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────── */
export const TotalTable: React.FC<TotalTableProps> = ({
  months,
  queryResult,
  params,
  setParams,
  displayMode
}) => {
  const isMobile = useIsMobile();
  const { openProduct } = useProductDrawer();

  const { data: response } = queryResult;
  const tableData = response?.data || [];
  const total = response?.total || 0;

  /**
   * Query cả 2 status song song:
   * - status 3: dữ liệu cũ (trước tháng 05-2026) — BE chưa migrate
   * - status 8: dữ liệu mới (từ tháng 05-2026 trở đi)
   *
   * TODO (BE): Sau khi BE thống nhất 1 status duy nhất thì xoá query status3.
   */
  const { data: monthlyQuantitiesStatus8 } = useQuery({
    queryKey: ['month-quantities', 'po-export', 8],
    queryFn: () => getMonthlyQuantities({ limit: 0, status: 8 })
  });

  const { data: monthlyQuantitiesStatus3 } = useQuery({
    queryKey: ['month-quantities', 'po-export', 3],
    queryFn: () => getMonthlyQuantities({ limit: 0, status: 3 })
  });

  // Merge cả 2 nguồn dữ liệu xuất hàng
  const monthlyQuantities = [
    ...(monthlyQuantitiesStatus8 ?? []),
    ...(monthlyQuantitiesStatus3 ?? [])
  ];

  const dataSource = calculateTotalProduct(
    tableData,
    monthlyQuantities,
    params.month?.toString()
  ) as TotalTableType[];

  /* ── Mobile view ── */
  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{total} sản phẩm</span>
        </div>

        {queryResult.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spin size="large" />
          </div>
        ) : dataSource.length === 0 ? (
          <Empty description="Không có dữ liệu" />
        ) : (
          <>
            <div className="space-y-2">
              {dataSource.map((record, index) => (
                <TotalMobileCard
                  key={record.id}
                  record={record}
                  months={months}
                  index={
                    index + (params.limit ?? 50) * ((params.page ?? 1) - 1)
                  }
                  displayMode={displayMode}
                />
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <Pagination
                {...customPaginationProps}
                size="small"
                current={params.page}
                pageSize={params.limit}
                total={total}
                showSizeChanger={false}
                onChange={(page) => {
                  setParams((prev) => ({ ...prev, page }));
                }}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Desktop table (unchanged) ── */
  const dateColumns: TableColumnsType<TotalTableType> = (months ?? []).map(
    (month) => {
      return {
        key: `${month}_quantity`,
        title: (
          <TotalHeaderTitle lines={['Số lượng', 'Đã xuất', `tháng ${month}`]} />
        ),
        width: 100,
        align: 'center',
        className: 'bg-indigo-300',
        dataIndex: ['times', month, 'quantity'],
        render: (value) => {
          if (!value) return 0;
          return value.toLocaleString();
        }
      };
    }
  );

  const monthlyCols = dateColumns
    .filter(
      (col) =>
        typeof col.key === 'string' &&
        col.key.includes(`-${displayMode}_quantity`)
    )
    .reverse();
  const exportCols = displayMode !== 'hide' ? monthlyCols : [];

  const columns: TableColumnsType<TotalTableType> = [
    {
      title: <TotalHeaderTitle lines={['STT']} />,
      rowScope: 'row',
      width: 50,
      align: 'center',
      responsive: ['md'],
      render: (_value, _record, index) =>
        index + 1 + (params.limit ?? 50) * ((params.page ?? 1) - 1)
    },
    {
      title: <TotalHeaderTitle align="left" lines={['Tên sản phẩm']} />,
      width: 100,
      fixed: 'left',
      dataIndex: 'name',
      ellipsis: true,
      render: (value, record) => {
        return (
          <Tooltip title={value} placement="topLeft">
            <button
              onClick={() => openProduct(record.id)}
              className="text-left font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              {value}
            </button>
          </Tooltip>
        );
      }
    },
    {
      title: <TotalHeaderTitle lines={['Mã SP']} />,
      width: 90,
      dataIndex: 'code',
      responsive: ['lg']
    },
    {
      title: <TotalHeaderTitle lines={['Sản Lượng', '(MOQ)']} />,
      width: 100,
      className: 'bg-indigo-300',
      align: 'right',
      dataIndex: 'stockMOQ',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: <TotalHeaderTitle lines={['Thùng', 'CATON/tháng', '(MOQ)']} />,
      width: 120,
      className: 'bg-indigo-300',
      align: 'right',
      dataIndex: 'catonQuantity',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: (
        <TotalHeaderTitle
          lines={[
            'Dự định',
            'Thời gian',
            'hoạt động',
            'thiết bị',
            '(ngày/tháng)'
          ]}
        />
      ),
      width: 200,
      align: 'right',
      dataIndex: 'planTime',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString('en-US', {
          maximumFractionDigits: 1
        });
      }
    },
    {
      title: (
        <TotalHeaderTitle
          lines={[
            'Thực tế',
            'Thời gian',
            'hoạt động',
            'thiết bị',
            '(ngày/tháng)'
          ]}
        />
      ),
      width: 200,
      align: 'right',
      dataIndex: 'realTime',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString('en-US', {
          maximumFractionDigits: 1
        });
      }
    },
    {
      title: <TotalHeaderTitle lines={['FAPV出荷']} />,
      className: 'bg-indigo-300',
      width: 50,
      align: 'center',
      dataIndex: 'FAPV',
      render: (value) => {
        if (!value) return '';
        return value ? '〇' : '';
      }
    },
    {
      title: <TotalHeaderTitle lines={['FASV出荷']} />,
      className: 'bg-indigo-300',
      width: 50,
      align: 'center',
      dataIndex: 'FASV',
      render: (value) => {
        if (!value) return '';
        return value ? '〇' : '';
      }
    },
    {
      title: <TotalHeaderTitle lines={['FAVV出荷']} />,
      className: 'bg-indigo-300',
      width: 50,
      align: 'center',
      dataIndex: 'FAVV',
      render: (value) => {
        if (!value) return '';
        return value ? '〇' : '';
      }
    },
    {
      title: <TotalHeaderTitle lines={['Số lượng', 'tồn đầu kỳ']} />,
      width: 100,
      align: 'right',
      dataIndex: 'stockStartQuantity',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: (
        <TotalHeaderTitle lines={['Thực tế', 'sản xuất', '(cái/tháng)']} />
      ),
      width: 100,
      align: 'right',
      dataIndex: 'realityQuantity',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: <TotalHeaderTitle lines={['Số Lượng', 'đã xuất']} />,
      width: 100,
      align: 'right',
      dataIndex: 'exportQuantity',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: <TotalHeaderTitle lines={['Số lượng', 'đã kiểm', '200%']} />,
      width: 100,
      align: 'right',
      dataIndex: 'checked200',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: <TotalHeaderTitle lines={['Số lượng', 'chưa kiểm', '200%']} />,
      width: 100,
      align: 'right',
      dataIndex: 'notCheck200',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: <TotalHeaderTitle lines={['Số lượng', 'tồn cuối kỳ']} />,
      width: 100,
      align: 'right',
      dataIndex: 'stockEndQuantity',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString();
      }
    },
    {
      title: <TotalHeaderTitle lines={['Số ngày', 'tồn kho']} />,
      width: 100,
      align: 'right',
      dataIndex: 'storageTime',
      render: (value) => {
        if (!value) return 0;
        return value.toLocaleString('en-US', {
          maximumFractionDigits: 1
        });
      }
    },
    ...exportCols,
    {
      title: <TotalHeaderTitle lines={['Thao tác']} />,
      width: 100,
      align: 'center',
      render: (_, record) => {
        return <RowTableActions productId={record.id} />;
      }
    }
  ];

  const tableProps: TableProps<TotalTableType> = {
    ...(customTableProps as unknown as TableProps<TotalTableType>),
    tableLayout: 'fixed',
    className:
      'product-sticky-table product-total-table admin-page-sticky-table',
    rowKey: (record) => ['product', record.id].join('-'),
    columns: columns,
    dataSource: dataSource,
    loading: queryResult.isLoading,
    sticky: {
      offsetHeader: 0
    },
    scroll: {
      x: 'max-content',
      scrollToFirstRowOnChange: false
    },
    pagination: {
      ...customTableProps.pagination,
      pageSize: params.limit,
      current: params.page,
      total: total,
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

  return <Table {...tableProps} />;
};
