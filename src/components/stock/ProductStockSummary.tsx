import AppSearchInput from '@/components/common/AppSearchInput';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Typography,
  message,
  Spin,
  Select,
  Drawer,
  DatePicker
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import AppButton from '@/components/common/AppButton';
import RefreshButton from '@/components/common/RefreshButton';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  customPaginationProps,
  DEFAULT_PAGE_SIZE_OPTIONS
} from '@components/custom/PaginationProps.custom';

import { StockTransactionService } from '@/services/StockTransactionService';
import { productService } from '@/services/ProductService';
import {
  ApiErrorResponse,
  TransactionListResponse
} from '@/types/stockTransaction.types';

const { Text } = Typography;

interface CurrentStockApiResponse {
  summary: {
    total_products: number;
    total_bins: number;
    total_quantity: number;
  };
  stocks: {
    product_id: number;
    product_code: string;
    product_name: string;
    material: string;
    color: string;
    lot: string;
    bins: string;
    bin_count: number;
    current_quantity: number;
    opening_quantity?: number;
    opening_stock?: number;
    stock_start_quantity?: number;
    stockStartQuantity?: number;
  }[];
}

interface LotDetail {
  lot: string;
  quantity: number;
  bins: string;
  bin_count: number;
}

interface ExportLotDetail {
  lot: string;
  quantity: number;
  bins: number[];
  export_dates: string[];
  export_date_details: ExportDateDetail[];
}

interface ExportDateDetail {
  date: string;
  quantity: number;
  bins: number[];
}

interface ProductSummaryRow {
  key: number;
  product_id: number;
  product_code: string;
  product_name: string;
  lot_count: number;
  opening_quantity: number;
  production_quantity: number;
  scanned_quantity: number;
  unscanned_quantity: number;
  over_scanned_quantity: number;
  negative_stock_quantity: number;
  total_quantity: number;
  total_bins: number;
  exported_quantity: number;
  exported_bins: number;
  exported_bin_numbers: number[];
  exported_lots: ExportLotDetail[];
  lots: LotDetail[];
}

const getOpening200Quantity = (source: unknown): number => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = source as any;
  const directValue =
    item?.opening_quantity_200 ??
    item?.openingQuantity200 ??
    item?.opening_stock_200 ??
    item?.stock_start_quantity_200 ??
    item?.stockStartQuantity200 ??
    item?.stock_quantity_200 ??
    item?.stockQuantity200 ??
    item?.stock_quantity200 ??
    item?.stockQuan200;

  if (Number.isFinite(Number(directValue))) return Number(directValue);

  const stockStart200 = item?.totalmonthquantities?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (quantity: any) => Number(quantity?.status) === 5
  );

  return Number(stockStart200?.totalQuan || 0);
};

const getMonthlyQuantityByStatus = (
  source: unknown,
  status: number
): number => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = source as any;
  const quantity = item?.totalmonthquantities?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry: any) => Number(entry?.status) === status
  );

  return Number(quantity?.totalQuan || 0);
};

const getCompactCellFontSize = (text: string) => {
  if (text.length > 28) return 11;
  if (text.length > 24) return 12;
  if (text.length > 20) return 13;
  return 14;
};

const getLotMonthKey = (lot: string) => {
  const parts = lot?.split('-') || [];
  const dateStr = parts[1];
  if (!dateStr || dateStr.length !== 8) return '';

  return `${dateStr.substring(4, 8)}-${dateStr.substring(2, 4)}`;
};

const isLotInMonth = (lot: string, month: Dayjs) => {
  const lotMonth = getLotMonthKey(lot);
  return Boolean(lotMonth) && lotMonth === month.format('YYYY-MM');
};

const isOpeningStockExport = (record: ProductSummaryRow) =>
  record.opening_quantity > 0 &&
  record.production_quantity === 0 &&
  record.scanned_quantity === 0 &&
  record.exported_quantity > 0 &&
  record.negative_stock_quantity === 0;

const ProductStockSummary: React.FC = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<CurrentStockApiResponse | null>(
    null
  );
  const [allProducts, setAllProducts] = useState<
    {
      id: number;
      code: string;
      name: string;
      opening_quantity: number;
      production_quantity: number;
    }[]
  >([]);
  const [exportData, setExportData] = useState<
    Map<
      number,
      {
        qty: number;
        current_month_lot_qty: number;
        bins: number[];
        lots: ExportLotDetail[];
      }
    >
  >(new Map());
  const [searchText, setSearchText] = useState('');
  const [filterProductId, setFilterProductId] = useState<number | undefined>();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [tablePagination, setTablePagination] = useState({
    current: 1,
    pageSize: 50
  });
  const [detailRecord, setDetailRecord] = useState<ProductSummaryRow | null>(
    null
  );
  const [exportDetailRecord, setExportDetailRecord] =
    useState<ProductSummaryRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all products, current stock, and export transactions in parallel
      const [stockResult, productsResult, exportResult] = await Promise.all([
        StockTransactionService.getCurrentStock() as Promise<{
          success?: boolean;
          data?: CurrentStockApiResponse;
        }>,
        productService.list({
          limit: 0,
          month: month.format('YYYY-MM'),
          include: ['totalmonthquantities']
        }),
        StockTransactionService.getTransactions({
          type: 'out',
          from_date: month.startOf('month').format('YYYY-MM-DD'),
          to_date: month.endOf('month').format('YYYY-MM-DD'),
          per_page: 10000
        })
      ]);

      // Handle stock data
      if (stockResult?.success === false) {
        message.error(
          (stockResult as unknown as ApiErrorResponse).message ||
            'Có lỗi xảy ra'
        );
        setStockData(null);
      } else {
        const data = stockResult?.data as CurrentStockApiResponse;
        setStockData(data || null);
      }

      // Handle products data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawProducts = (productsResult as any)?.data || productsResult || [];
      const productList = (Array.isArray(rawProducts) ? rawProducts : []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => ({
          id: Number(p.id),
          code: String(p.code || ''),
          name: String(p.name || ''),
          opening_quantity: getOpening200Quantity(p),
          production_quantity: getMonthlyQuantityByStatus(p, 2)
        })
      );
      setAllProducts(productList);

      // Handle export data - aggregate by product_id
      if (
        exportResult &&
        !(
          'success' in exportResult &&
          (exportResult as unknown as ApiErrorResponse).success === false
        )
      ) {
        const txData = (exportResult as TransactionListResponse).data || [];
        const expMap = new Map<
          number,
          {
            qty: number;
            currentMonthLotQty: number;
            bins: Set<number>;
            lots: Map<
              string,
              {
                qty: number;
                bins: Set<number>;
                exportDates: Set<string>;
                exportDateDetails: Map<
                  string,
                  { qty: number; bins: Set<number> }
                >;
              }
            >;
          }
        >();
        txData.forEach((tx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flat = tx as any;
          const pId = Number(flat.product_id || tx.storage_product?.product_id);
          const bin = flat.bin ?? tx.storage_product?.bin;
          const lot = String(flat.lot || tx.storage_product?.lot || '');
          const qty = Number(tx.quantity || 0);
          const exportDate = tx.created_at
            ? dayjs(tx.created_at).format('DD/MM/YYYY')
            : '';
          if (pId) {
            const existing = expMap.get(pId) || {
              qty: 0,
              currentMonthLotQty: 0,
              bins: new Set<number>(),
              lots: new Map<
                string,
                {
                  qty: number;
                  bins: Set<number>;
                  exportDates: Set<string>;
                  exportDateDetails: Map<
                    string,
                    { qty: number; bins: Set<number> }
                  >;
                }
              >()
            };
            existing.qty += qty;
            if (lot && isLotInMonth(lot, month)) {
              existing.currentMonthLotQty += qty;
            }
            if (bin != null && !Number.isNaN(Number(bin))) {
              existing.bins.add(Number(bin));
            }
            if (lot) {
              const lotInfo = existing.lots.get(lot) || {
                qty: 0,
                bins: new Set<number>(),
                exportDates: new Set<string>(),
                exportDateDetails: new Map<
                  string,
                  { qty: number; bins: Set<number> }
                >()
              };
              lotInfo.qty += qty;
              if (exportDate) {
                lotInfo.exportDates.add(exportDate);
                const dateDetail = lotInfo.exportDateDetails.get(
                  exportDate
                ) || {
                  qty: 0,
                  bins: new Set<number>()
                };
                dateDetail.qty += qty;
                if (bin != null && !Number.isNaN(Number(bin))) {
                  dateDetail.bins.add(Number(bin));
                }
                lotInfo.exportDateDetails.set(exportDate, dateDetail);
              }
              if (bin != null && !Number.isNaN(Number(bin))) {
                lotInfo.bins.add(Number(bin));
              }
              existing.lots.set(lot, lotInfo);
            }
            expMap.set(pId, existing);
          }
        });
        const resultMap = new Map<
          number,
          {
            qty: number;
            current_month_lot_qty: number;
            bins: number[];
            lots: ExportLotDetail[];
          }
        >();
        expMap.forEach((v, k) => {
          const lots = Array.from(v.lots.entries())
            .map(([lot, info]) => ({
              lot,
              quantity: info.qty,
              bins: Array.from(info.bins).sort((a, b) => a - b),
              export_dates: Array.from(info.exportDates),
              export_date_details: Array.from(
                info.exportDateDetails.entries()
              ).map(([date, detail]) => ({
                date,
                quantity: detail.qty,
                bins: Array.from(detail.bins).sort((a, b) => a - b)
              }))
            }))
            .sort((a, b) => a.lot.localeCompare(b.lot));
          const exportedBinsByLot = lots.flatMap((lot) => lot.bins);

          resultMap.set(k, {
            qty: v.qty,
            current_month_lot_qty: v.currentMonthLotQty,
            bins: exportedBinsByLot,
            lots
          });
        });
        setExportData(resultMap);
      } else {
        setExportData(new Map());
      }
    } catch {
      message.error('Có lỗi xảy ra khi tải dữ liệu');
      setStockData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build product options for filter (from all products)
  const productOptions = useMemo(() => {
    if (allProducts.length > 0) {
      return allProducts.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.code})`
      }));
    }
    if (!stockData?.stocks) return [];
    const seen = new Map<number, string>();
    stockData.stocks
      .filter((item) => isLotInMonth(item.lot, month))
      .forEach((item) => {
        if (!seen.has(item.product_id)) {
          seen.set(
            item.product_id,
            `${item.product_name} (${item.product_code})`
          );
        }
      });
    return Array.from(seen.entries()).map(([id, label]) => ({
      value: id,
      label
    }));
  }, [stockData, allProducts, month]);

  // Aggregate: group all lots by product → 1 row per product, include ALL products
  const summaryData = useMemo((): ProductSummaryRow[] => {
    // Build stock map from current stock data
    const stockItems =
      stockData?.stocks?.filter(
        (s) => s.current_quantity > 0 && isLotInMonth(s.lot, month)
      ) || [];

    const map = new Map<
      number,
      {
        code: string;
        name: string;
        qty: number;
        bins: number;
        lots: Set<string>;
        lotDetails: LotDetail[];
      }
    >();

    stockItems.forEach((item) => {
      const existing = map.get(item.product_id);
      const lotDetail: LotDetail = {
        lot: item.lot,
        quantity: Number(item.current_quantity || 0),
        bins: item.bins || '',
        bin_count: Number(item.bin_count || 0)
      };
      if (existing) {
        existing.qty += Number(item.current_quantity || 0);
        existing.bins += Number(item.bin_count || 0);
        existing.lots.add(item.lot);
        existing.lotDetails.push(lotDetail);
      } else {
        map.set(item.product_id, {
          code: item.product_code,
          name: item.product_name,
          qty: Number(item.current_quantity || 0),
          bins: Number(item.bin_count || 0),
          lots: new Set([item.lot]),
          lotDetails: [lotDetail]
        });
      }
    });

    // Merge all products - products without stock get 0 values
    let rows: ProductSummaryRow[];
    if (allProducts.length > 0) {
      rows = allProducts.map((product) => {
        const stockInfo = map.get(product.id);
        const expInfo = exportData.get(product.id);
        const openingQuantity = product.opening_quantity || 0;
        const productionQuantity = product.production_quantity || 0;
        const monthlyQuantity = openingQuantity + productionQuantity;
        const scannedQuantity = stockInfo?.qty || 0;
        const exportedQuantity = expInfo?.qty || 0;
        const currentMonthLotExportedQuantity =
          expInfo?.current_month_lot_qty || 0;
        const currentMonthAccountedQuantity =
          scannedQuantity + currentMonthLotExportedQuantity;
        const unscannedQuantity = Math.max(
          productionQuantity - currentMonthAccountedQuantity,
          0
        );
        const overScannedQuantity = Math.max(
          currentMonthAccountedQuantity - productionQuantity,
          0
        );
        const remainingQuantity = Math.max(
          monthlyQuantity - exportedQuantity,
          0
        );
        const negativeStockQuantity = Math.max(
          exportedQuantity - monthlyQuantity,
          0
        );
        return {
          key: product.id,
          product_id: product.id,
          product_code: stockInfo?.code || product.code,
          product_name: stockInfo?.name || product.name,
          lot_count: stockInfo?.lots.size || 0,
          opening_quantity: openingQuantity,
          production_quantity: productionQuantity,
          scanned_quantity: scannedQuantity,
          unscanned_quantity: unscannedQuantity,
          over_scanned_quantity: overScannedQuantity,
          negative_stock_quantity: negativeStockQuantity,
          total_quantity: remainingQuantity,
          total_bins: stockInfo?.bins || 0,
          exported_quantity: exportedQuantity,
          exported_bins: expInfo?.bins.length || 0,
          exported_bin_numbers: expInfo?.bins || [],
          exported_lots: expInfo?.lots || [],
          lots: stockInfo?.lotDetails || []
        };
      });
    } else {
      rows = Array.from(map.entries()).map(([id, data]) => {
        const expInfo = exportData.get(id);
        const openingQuantity = 0;
        const productionQuantity = 0;
        const monthlyQuantity = openingQuantity + productionQuantity;
        const scannedQuantity = data.qty || 0;
        const exportedQuantity = expInfo?.qty || 0;
        const currentMonthLotExportedQuantity =
          expInfo?.current_month_lot_qty || 0;
        const currentMonthAccountedQuantity =
          scannedQuantity + currentMonthLotExportedQuantity;
        const unscannedQuantity = Math.max(
          productionQuantity - currentMonthAccountedQuantity,
          0
        );
        const overScannedQuantity = Math.max(
          currentMonthAccountedQuantity - productionQuantity,
          0
        );
        const remainingQuantity = Math.max(
          monthlyQuantity - exportedQuantity,
          0
        );
        const negativeStockQuantity = Math.max(
          exportedQuantity - monthlyQuantity,
          0
        );
        return {
          key: id,
          product_id: id,
          product_code: data.code,
          product_name: data.name,
          lot_count: data.lots.size,
          opening_quantity: openingQuantity,
          production_quantity: productionQuantity,
          scanned_quantity: scannedQuantity,
          unscanned_quantity: unscannedQuantity,
          over_scanned_quantity: overScannedQuantity,
          negative_stock_quantity: negativeStockQuantity,
          total_quantity: remainingQuantity,
          total_bins: data.bins,
          exported_quantity: exportedQuantity,
          exported_bins: expInfo?.bins.length || 0,
          exported_bin_numbers: expInfo?.bins || [],
          exported_lots: expInfo?.lots || [],
          lots: data.lotDetails
        };
      });
    }

    // Apply filters
    if (filterProductId) {
      rows = rows.filter((r) => r.product_id === filterProductId);
    }
    if (searchText) {
      const s = searchText.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.product_name || '').toLowerCase().includes(s) ||
          (r.product_code || '').toLowerCase().includes(s)
      );
    }

    // Sort by product ID
    return rows.sort((a, b) => a.product_id - b.product_id);
  }, [stockData, filterProductId, searchText, allProducts, exportData, month]);

  // Total row
  const totals = useMemo(() => {
    return summaryData.reduce(
      (acc, r) => ({
        qty: acc.qty + r.total_quantity,
        openingQty: acc.openingQty + r.opening_quantity,
        productionQty: acc.productionQty + r.production_quantity,
        scannedQty: acc.scannedQty + r.scanned_quantity,
        unscannedQty: acc.unscannedQty + r.unscanned_quantity,
        overScannedQty: acc.overScannedQty + r.over_scanned_quantity,
        negativeStockQty: acc.negativeStockQty + r.negative_stock_quantity,
        bins: acc.bins + r.total_bins,
        lots: acc.lots + r.lot_count,
        expQty: acc.expQty + r.exported_quantity,
        expBins: acc.expBins + r.exported_bins
      }),
      {
        qty: 0,
        openingQty: 0,
        productionQty: 0,
        scannedQty: 0,
        unscannedQty: 0,
        overScannedQty: 0,
        negativeStockQty: 0,
        bins: 0,
        lots: 0,
        expQty: 0,
        expBins: 0
      }
    );
  }, [summaryData]);

  const mobileSummaryData = useMemo(() => {
    const startIndex = (tablePagination.current - 1) * tablePagination.pageSize;
    return summaryData.slice(startIndex, startIndex + tablePagination.pageSize);
  }, [summaryData, tablePagination]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(summaryData.length / tablePagination.pageSize)
    );

    if (tablePagination.current > maxPage) {
      setTablePagination((prev) => ({ ...prev, current: maxPage }));
    }
  }, [summaryData.length, tablePagination]);

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 45,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => index + 1
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 160,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.product_id - b.product_id,
      defaultSortOrder: 'ascend' as const,
      render: (record: ProductSummaryRow) => (
        <div>
          <Text strong>{record.product_name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.product_code}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: (
        <div className="leading-tight">
          <div>Lots / Thùng đã quét</div>
          <div className="text-[10px] font-normal text-gray-400">
            đang còn tồn
          </div>
        </div>
      ),
      key: 'lot_count',
      width: 180,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.lot_count - b.lot_count,
      render: (_: number, record: ProductSummaryRow) => {
        if (record.lot_count > 0 || record.total_bins > 0) {
          const label = `${record.lot_count} lots · ${record.total_bins} thùng còn tồn`;
          return (
            <span
              onClick={() => setDetailRecord(record)}
              className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap text-blue-500 hover:text-blue-700"
              style={{
                borderBottom: '1px dashed currentColor',
                fontSize: getCompactCellFontSize(label)
              }}
            >
              <span>{label}</span>
              <InfoCircleOutlined
                className="shrink-0"
                style={{ fontSize: 10 }}
              />
            </span>
          );
        }

        return <Text style={{ color: '#d9d9d9' }}>Chưa có thùng đã quét</Text>;
      }
    },
    {
      title: (
        <div className="leading-tight">
          <div>Tồn đầu kỳ</div>
          <div className="text-[10px] font-normal text-gray-400">200%</div>
        </div>
      ),
      dataIndex: 'opening_quantity',
      key: 'opening_quantity',
      width: 120,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.opening_quantity - b.opening_quantity,
      render: (v: number) => (
        <Text
          strong
          style={{ color: v > 0 ? '#2563eb' : '#d9d9d9', fontSize: '14px' }}
        >
          {Number(v || 0).toLocaleString('vi-VN')}
        </Text>
      )
    },
    {
      title: (
        <div className="leading-tight">
          <div>Đã kiểm</div>
          <div>200%</div>
        </div>
      ),
      dataIndex: 'production_quantity',
      key: 'production_quantity',
      width: 120,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.production_quantity - b.production_quantity,
      render: (v: number) => (
        <Text
          strong
          style={{ color: v > 0 ? '#0f766e' : '#d9d9d9', fontSize: '14px' }}
        >
          {Number(v || 0).toLocaleString('vi-VN')}
        </Text>
      )
    },
    {
      title: (
        <div className="leading-tight">
          <div>Đã quét</div>
          <div className="text-[10px] font-normal text-gray-400">còn tồn</div>
        </div>
      ),
      dataIndex: 'scanned_quantity',
      key: 'scanned_quantity',
      width: 110,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.scanned_quantity - b.scanned_quantity,
      render: (v: number) => (
        <Text
          strong
          style={{ color: v > 0 ? '#52c41a' : '#d9d9d9', fontSize: '14px' }}
        >
          {Number(v || 0).toLocaleString('vi-VN')}
        </Text>
      )
    },
    {
      title: 'Chưa quét',
      dataIndex: 'unscanned_quantity',
      key: 'unscanned_quantity',
      width: 120,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.unscanned_quantity - b.unscanned_quantity,
      render: (v: number) => (
        <Text
          strong
          style={{ color: v > 0 ? '#ea580c' : '#16a34a', fontSize: '14px' }}
        >
          {Number(v || 0).toLocaleString('vi-VN')}
        </Text>
      )
    },
    {
      title: 'Kết quả kiểm',
      key: 'scan_status',
      width: 135,
      align: 'center' as const,
      render: (_: unknown, record: ProductSummaryRow) => (
        <>
          {record.negative_stock_quantity > 0 ? (
            <div className="inline-flex min-w-[78px] flex-col rounded border border-red-400 bg-red-100 px-2 py-1 text-red-800">
              <span className="text-[11px] font-semibold">Âm tồn</span>
              <span className="text-xs font-bold">
                -{record.negative_stock_quantity.toLocaleString('vi-VN')}
              </span>
            </div>
          ) : record.unscanned_quantity > 0 ? (
            <div className="inline-flex min-w-[78px] flex-col rounded border border-orange-300 bg-orange-50 px-2 py-1 text-orange-700">
              <span className="text-[11px] font-semibold">Còn thiếu</span>
              <span className="text-xs font-bold">
                {record.unscanned_quantity.toLocaleString('vi-VN')}
              </span>
            </div>
          ) : record.over_scanned_quantity > 0 ? (
            <div className="inline-flex min-w-[78px] flex-col rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">
              <span className="text-[11px] font-semibold">Vượt tổng 200%</span>
              <span className="text-xs font-bold">
                +{record.over_scanned_quantity.toLocaleString('vi-VN')}
              </span>
            </div>
          ) : isOpeningStockExport(record) ? (
            <span className="inline-flex min-w-[96px] justify-center rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
              Xuất tồn đầu kỳ
            </span>
          ) : (
            <span className="inline-flex min-w-[78px] justify-center rounded border border-green-300 bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
              Đủ
            </span>
          )}
        </>
      )
    },
    {
      title: 'Tồn còn lại',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 130,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.total_quantity - b.total_quantity,
      render: (v: number) => (
        <Text
          strong
          style={{ color: v > 0 ? '#52c41a' : '#d9d9d9', fontSize: '14px' }}
        >
          {Number(v || 0).toLocaleString('vi-VN')}
        </Text>
      )
    },
    {
      title: 'SL xuất',
      dataIndex: 'exported_quantity',
      key: 'exported_quantity',
      width: 100,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.exported_quantity - b.exported_quantity,
      render: (v: number) => (
        <Text
          strong
          style={{ color: v > 0 ? '#fa8c16' : '#d9d9d9', fontSize: '14px' }}
        >
          {Number(v || 0).toLocaleString('vi-VN')}
        </Text>
      )
    },
    {
      title: 'Thùng xuất',
      key: 'exported_bins',
      width: 180,
      align: 'center' as const,
      sorter: (a: ProductSummaryRow, b: ProductSummaryRow) =>
        a.exported_bins - b.exported_bins,
      render: (_: unknown, record: ProductSummaryRow) => {
        if (record.exported_bins > 0) {
          const label = `${record.exported_lots.length} lots · ${record.exported_bins} thùng đã xuất`;
          return (
            <span
              onClick={() => setExportDetailRecord(record)}
              className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap text-orange-500 hover:text-orange-700"
              style={{
                borderBottom: '1px dashed currentColor',
                fontSize: getCompactCellFontSize(label)
              }}
            >
              <span>{label}</span>
              <InfoCircleOutlined
                className="shrink-0"
                style={{ fontSize: 10 }}
              />
            </span>
          );
        }

        return <Text style={{ color: '#d9d9d9' }}>Chưa xuất thùng</Text>;
      }
    }
  ];

  if (loading && !stockData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="large">
          <div className="text-center">
            <div className="mt-4">
              <Text type="secondary">Đang tải dữ liệu...</Text>
            </div>
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary + Filters */}
      <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
        {/* Stats */}
        <div className="hidden flex-wrap items-center gap-x-5 gap-y-1 sm:flex">
          <span className="text-xs font-medium text-gray-500">
            Tổng hợp theo sản phẩm
          </span>
          <div className="hidden h-4 w-px bg-gray-200 sm:block" />
          <div>
            <span className="text-xs text-gray-400">Sản phẩm</span>
            <span className="ml-1.5 text-base font-bold text-purple-600">
              {summaryData.length.toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Tồn đầu kỳ 200%</span>
            <span className="ml-1.5 text-base font-bold text-blue-600">
              {totals.openingQty.toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Đã kiểm 200%</span>
            <span className="ml-1.5 text-base font-bold text-teal-600">
              {totals.productionQty.toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Đã quét còn tồn</span>
            <span className="ml-1.5 text-base font-bold text-emerald-600">
              {totals.scannedQty.toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Chưa quét</span>
            <span className="ml-1.5 text-base font-bold text-orange-600">
              {totals.unscannedQty.toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Tồn còn lại</span>
            <span className="ml-1.5 text-base font-bold text-green-600">
              {totals.qty.toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Thùng còn tồn</span>
            <span className="ml-1.5 text-base font-bold text-blue-600">
              {totals.bins.toLocaleString('vi-VN')}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Tổng lots</span>
            <span className="ml-1.5 text-base font-bold text-orange-500">
              {totals.lots.toLocaleString('vi-VN')}
            </span>
          </div>
          {totals.overScannedQty > 0 && (
            <div>
              <span className="text-xs text-gray-400">Vượt tổng 200%</span>
              <span className="ml-1.5 text-base font-bold text-amber-600">
                +{totals.overScannedQty.toLocaleString('vi-VN')}
              </span>
            </div>
          )}
          {totals.negativeStockQty > 0 && (
            <div>
              <span className="text-xs text-gray-400">Âm tồn</span>
              <span className="ml-1.5 text-base font-bold text-red-700">
                -{totals.negativeStockQty.toLocaleString('vi-VN')}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 sm:hidden">
          <span className="text-xs font-medium text-gray-500">
            Tổng hợp theo sản phẩm
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Sản phẩm</div>
              <div className="text-base font-bold text-purple-600">
                {summaryData.length.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Tồn đầu kỳ 200%</div>
              <div className="text-base font-bold text-blue-600">
                {totals.openingQty.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Đã kiểm 200%</div>
              <div className="text-base font-bold text-teal-600">
                {totals.productionQty.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Đã quét còn tồn</div>
              <div className="text-base font-bold text-emerald-600">
                {totals.scannedQty.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Chưa quét</div>
              <div className="text-base font-bold text-orange-600">
                {totals.unscannedQty.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Tồn còn lại</div>
              <div className="text-base font-bold text-green-600">
                {totals.qty.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Thùng còn tồn</div>
              <div className="text-base font-bold text-blue-600">
                {totals.bins.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
              <div className="text-[10px] text-gray-500">Tổng lots</div>
              <div className="text-base font-bold text-orange-500">
                {totals.lots.toLocaleString('vi-VN')}
              </div>
            </div>
            {totals.overScannedQty > 0 && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                <div className="text-[10px] text-gray-500">Vượt tổng 200%</div>
                <div className="text-base font-bold text-amber-600">
                  +{totals.overScannedQty.toLocaleString('vi-VN')}
                </div>
              </div>
            )}
            {totals.negativeStockQty > 0 && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <div className="text-[10px] text-gray-500">Âm tồn</div>
                <div className="text-base font-bold text-red-700">
                  -{totals.negativeStockQty.toLocaleString('vi-VN')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            placeholder="Lọc sản phẩm"
            allowClear
            size="small"
            className="!w-full sm:!w-[200px]"
            options={productOptions}
            onChange={(value) => setFilterProductId(value || undefined)}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <DatePicker
            picker="month"
            value={month}
            allowClear={false}
            size="small"
            className="!w-full sm:!w-[130px]"
            format="MM/YYYY"
            onChange={(value) => setMonth(value || dayjs())}
          />
          <AppSearchInput
            placeholder="Tìm..."
            className="!w-full sm:!w-[160px]"
            onChange={(e) => setSearchText(e.target.value)}
          />
          <RefreshButton refresh={loadData} isLoading={loading} size="small" />
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden sm:block">
        <Table
          columns={columns}
          dataSource={summaryData}
          rowKey="key"
          loading={loading}
          pagination={{
            ...customPaginationProps,
            current: tablePagination.current,
            pageSize: tablePagination.pageSize,
            pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
            size: 'small',
            onChange: (page, pageSize) =>
              setTablePagination({ current: page, pageSize })
          }}
          size="small"
          scroll={{ x: 1330 }}
        />
      </div>

      {/* Mobile: Card list */}
      <div className="block sm:hidden">
        {loading ? (
          <div className="py-8 text-center text-gray-400">Đang tải...</div>
        ) : summaryData.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Không có dữ liệu</div>
        ) : (
          <>
            <div className="space-y-2">
              {mobileSummaryData.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-lg border border-gray-100 bg-white px-3 py-2.5"
                >
                  {/* Row 1: Index + Product name */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[10px] font-medium text-gray-400">
                          #
                          {(tablePagination.current - 1) *
                            tablePagination.pageSize +
                            index +
                            1}
                        </span>
                        <Text strong className="text-sm">
                          {item.product_name}
                        </Text>
                      </div>
                      <div className="ml-5 text-[10px] text-gray-400">
                        {item.product_code}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Text
                        strong
                        style={{
                          color:
                            item.total_quantity > 0 ? '#52c41a' : '#d9d9d9',
                          fontSize: '16px'
                        }}
                      >
                        {Number(item.total_quantity || 0).toLocaleString(
                          'vi-VN'
                        )}
                      </Text>
                      <div className="text-[10px] text-gray-400">
                        tồn còn lại
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Stats grid */}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-blue-50 p-2">
                      <div className="text-gray-400">Đầu kỳ 200%</div>
                      <div className="text-sm font-bold text-blue-600">
                        {Number(item.opening_quantity || 0).toLocaleString(
                          'vi-VN'
                        )}
                      </div>
                    </div>
                    <div className="rounded bg-teal-50 p-2">
                      <div className="text-gray-400">Đã kiểm 200%</div>
                      <div className="text-sm font-bold text-teal-600">
                        {Number(item.production_quantity || 0).toLocaleString(
                          'vi-VN'
                        )}
                      </div>
                    </div>
                    <div className="rounded bg-emerald-50 p-2">
                      <div className="text-gray-400">Đã quét</div>
                      <div className="text-sm font-bold text-emerald-600">
                        {Number(item.scanned_quantity || 0).toLocaleString(
                          'vi-VN'
                        )}
                      </div>
                    </div>
                    <div className="rounded bg-orange-50 p-2">
                      <div className="text-gray-400">Chưa quét</div>
                      <div className="text-sm font-bold text-orange-600">
                        {Number(item.unscanned_quantity || 0).toLocaleString(
                          'vi-VN'
                        )}
                      </div>
                    </div>
                    <div className="rounded bg-amber-50 p-2">
                      <div className="text-gray-400">Vượt/Âm</div>
                      <div className="text-sm font-bold text-amber-600">
                        {isOpeningStockExport(item)
                          ? 'Xuất tồn đầu kỳ'
                          : Math.max(
                              item.over_scanned_quantity,
                              item.negative_stock_quantity
                            ) || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Export & Scan status */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between rounded bg-orange-50 px-2 py-1.5">
                      <span className="text-xs font-medium text-gray-600">
                        Đã xuất
                      </span>
                      {item.exported_bins > 0 ? (
                        <span
                          onClick={() => setExportDetailRecord(item)}
                          className="cursor-pointer text-xs font-semibold text-orange-600 hover:text-orange-700"
                        >
                          {item.exported_lots.length} lots ·{' '}
                          {item.exported_bins} thùng
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Chưa xuất</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1.5">
                      <span className="text-xs font-medium text-gray-600">
                        Đã quét còn tồn
                      </span>
                      {item.lot_count > 0 || item.total_bins > 0 ? (
                        <span
                          onClick={() => setDetailRecord(item)}
                          className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {item.lot_count} lots · {item.total_bins} thùng
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Chưa có</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {summaryData.length > tablePagination.pageSize && (
              <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
                <span>
                  {(tablePagination.current - 1) * tablePagination.pageSize + 1}
                  -
                  {Math.min(
                    tablePagination.current * tablePagination.pageSize,
                    summaryData.length
                  )}{' '}
                  / {summaryData.length}
                </span>
                <div className="flex items-center gap-1">
                  <AppButton
                    size="small"
                    disabled={tablePagination.current <= 1}
                    onClick={() =>
                      setTablePagination((prev) => ({
                        ...prev,
                        current: prev.current - 1
                      }))
                    }
                  >
                    ‹
                  </AppButton>
                  <span className="px-1.5 text-xs font-medium text-gray-600">
                    {tablePagination.current} /{' '}
                    {Math.ceil(summaryData.length / tablePagination.pageSize)}
                  </span>
                  <AppButton
                    size="small"
                    disabled={
                      tablePagination.current * tablePagination.pageSize >=
                      summaryData.length
                    }
                    onClick={() =>
                      setTablePagination((prev) => ({
                        ...prev,
                        current: prev.current + 1
                      }))
                    }
                  >
                    ›
                  </AppButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Drawer
        rootClassName="stock-lot-scroll-drawer stock-lot-scroll-drawer--inventory"
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <InfoCircleOutlined />
            </div>
            <span className="text-gray-800">
              Lots / thùng đã quét còn tồn: {detailRecord?.product_name}
            </span>
          </div>
        }
        placement="right"
        onClose={() => setDetailRecord(null)}
        open={!!detailRecord}
        width={isMobile ? '100vw' : 450}
        styles={{
          body: {
            backgroundColor: '#f8fafc',
            padding: isMobile ? '10px' : '16px',
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch'
          },
          header: { borderBottom: '2px solid #e2e8f0' }
        }}
      >
        {detailRecord && (
          <div className="flex flex-col gap-4">
            {detailRecord.lots.map((lot, index) => (
              <div
                key={lot.lot}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
              >
                {/* Header Card */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-200 text-xs font-bold text-indigo-700">
                      {index + 1}
                    </span>
                    <Text className="font-semibold text-gray-700">Mã Lot:</Text>
                    <Text
                      code
                      className="border border-green-200 bg-green-50 text-sm font-bold text-green-700"
                    >
                      {lot.lot}
                    </Text>
                  </div>
                  <div className="text-right">
                    <Text strong className="block text-sm text-emerald-600">
                      {Number(lot.quantity || 0).toLocaleString('vi-VN')} SP
                    </Text>
                    <div className="text-[10px] text-gray-400">còn tồn</div>
                  </div>
                </div>

                {/* Body Card */}
                <div className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between space-x-2">
                    <Text
                      type="secondary"
                      className="text-xs font-bold text-gray-500 uppercase"
                    >
                      Thùng đã quét còn tồn
                    </Text>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {lot.bin_count} thùng
                    </span>
                  </div>
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5">
                    {lot.bins ? (
                      <div className="flex flex-wrap gap-1.5">
                        {lot.bins.split(',').map((bin, i) => (
                          <div
                            key={`${bin}-${i}`}
                            className="min-w-[28px] rounded border border-gray-300 bg-white px-1.5 py-0.5 text-center text-[12px] font-semibold text-gray-800 shadow-sm"
                          >
                            {bin.trim()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text className="text-[13px] text-gray-400 italic">
                        Không có dữ liệu thùng
                      </Text>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Footer Summary */}
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <Text strong className="text-[13px] text-blue-800 uppercase">
                  Tồn còn lại:
                </Text>
                <Text strong className="text-base leading-none text-green-600">
                  {Number(detailRecord.total_quantity || 0).toLocaleString(
                    'vi-VN'
                  )}{' '}
                  SP
                </Text>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded bg-white/70 px-2 py-1">
                  <div className="text-[10px] text-gray-400">Đầu kỳ 200%</div>
                  <Text strong className="text-[13px] text-blue-600">
                    {Number(detailRecord.opening_quantity || 0).toLocaleString(
                      'vi-VN'
                    )}
                  </Text>
                </div>
                <div className="rounded bg-white/70 px-2 py-1">
                  <div className="text-[10px] text-gray-400">Đã kiểm 200%</div>
                  <Text strong className="text-[13px] text-teal-600">
                    {Number(
                      detailRecord.production_quantity || 0
                    ).toLocaleString('vi-VN')}
                  </Text>
                </div>
                <div className="rounded bg-white/70 px-2 py-1">
                  <div className="text-[10px] text-gray-400">
                    Đã quét còn tồn
                  </div>
                  <Text strong className="text-[13px] text-emerald-600">
                    {Number(detailRecord.scanned_quantity || 0).toLocaleString(
                      'vi-VN'
                    )}
                  </Text>
                </div>
                <div className="rounded bg-white/70 px-2 py-1">
                  <div className="text-[10px] text-gray-400">Chưa quét</div>
                  <Text strong className="text-[13px] text-orange-600">
                    {Number(
                      detailRecord.unscanned_quantity || 0
                    ).toLocaleString('vi-VN')}
                  </Text>
                </div>
              </div>
              {detailRecord.over_scanned_quantity > 0 && (
                <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-center text-xs font-semibold text-amber-700">
                  Đã đối soát nhiều hơn tổng 200%:{' '}
                  {detailRecord.over_scanned_quantity.toLocaleString('vi-VN')}
                </div>
              )}
              {detailRecord.negative_stock_quantity > 0 && (
                <div className="mt-2 rounded bg-red-50 px-2 py-1 text-center text-xs font-semibold text-red-700">
                  Đã xuất nhiều hơn tồn có thể đối soát:{' '}
                  {detailRecord.negative_stock_quantity.toLocaleString('vi-VN')}
                </div>
              )}
              {isOpeningStockExport(detailRecord) && (
                <div className="mt-2 rounded bg-blue-50 px-2 py-1 text-center text-xs font-semibold text-blue-700">
                  Có xuất kho từ tồn đầu kỳ, không phát sinh kiểm/quét 200%
                  trong tháng.
                </div>
              )}
              <div className="mt-2 text-center">
                <Text strong className="text-[13px] leading-none text-blue-600">
                  {detailRecord.total_bins} thùng đã quét còn tồn
                </Text>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        rootClassName="stock-lot-scroll-drawer stock-lot-scroll-drawer--export"
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <InfoCircleOutlined />
            </div>
            <span className="text-gray-800">
              Thùng đã xuất: {exportDetailRecord?.product_name}
            </span>
          </div>
        }
        placement="right"
        onClose={() => setExportDetailRecord(null)}
        open={!!exportDetailRecord}
        width={isMobile ? '100vw' : 420}
        footer={
          exportDetailRecord ? (
            <div className="rounded-lg border border-orange-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <Text strong className="text-[13px] text-orange-800 uppercase">
                  Tổng lots:
                </Text>
                <Text strong className="text-sm text-orange-600">
                  {exportDetailRecord.exported_lots.length} lots
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text strong className="text-[13px] text-orange-800 uppercase">
                  Số lượng đã xuất:
                </Text>
                <Text strong className="text-base text-orange-600">
                  {Number(
                    exportDetailRecord.exported_quantity || 0
                  ).toLocaleString('vi-VN')}{' '}
                  SP
                </Text>
              </div>
            </div>
          ) : null
        }
        styles={{
          body: {
            backgroundColor: '#fff7ed',
            padding: isMobile ? '10px' : '16px',
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'auto'
          },
          header: { borderBottom: '2px solid #fed7aa' },
          footer: {
            backgroundColor: '#fff7ed',
            borderTop: '1px solid #fed7aa',
            padding: isMobile ? '10px' : '12px 16px'
          }
        }}
      >
        {exportDetailRecord && (
          <div className="flex flex-col gap-4">
            {exportDetailRecord.exported_lots.map((lot, index) => (
              <div
                key={`${exportDetailRecord.product_id}-export-lot-${lot.lot}`}
                className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-700">
                      {index + 1}
                    </span>
                    <Text
                      code
                      className="border border-orange-200 bg-white text-sm font-bold text-orange-700"
                    >
                      Lot:{lot.lot}
                    </Text>
                  </div>
                  <div className="text-right">
                    <Text strong className="block text-sm text-orange-600">
                      {Number(lot.quantity || 0).toLocaleString('vi-VN')} SP
                    </Text>
                    <div className="text-[10px] text-gray-400">đã xuất</div>
                  </div>
                </div>

                <div className="px-4 py-3">
                  {(lot.export_date_details || []).length > 0 && (
                    <div className="mb-2 space-y-1">
                      {(lot.export_date_details || []).map((detail) => (
                        <div
                          key={`${exportDetailRecord.product_id}-${lot.lot}-export-date-${detail.date}`}
                          className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-700"
                        >
                          <Text strong className="mr-1 text-xs text-orange-800">
                            Ngày xuất {detail.date}:
                          </Text>
                          {detail.bins.length} thùng ·{' '}
                          {Number(detail.quantity || 0).toLocaleString('vi-VN')}{' '}
                          SP
                          {detail.bins.length > 0 && (
                            <div className="mt-1 text-orange-600">
                              Thùng:{' '}
                              {[...detail.bins]
                                .sort((a, b) => a - b)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ProductStockSummary;
