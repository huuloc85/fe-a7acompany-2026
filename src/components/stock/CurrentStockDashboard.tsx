import AppSearchInput from '@/components/common/AppSearchInput';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Typography, message, Spin, Select, Drawer } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AppButton from '@/components/common/AppButton';
import RefreshButton from '@/components/common/RefreshButton';
import ResearchStockPanel from '@/components/stock/ResearchStockPanel';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  customPaginationProps,
  DEFAULT_PAGE_SIZE_OPTIONS
} from '@components/custom/PaginationProps.custom';

import { StockTransactionService } from '@/services/StockTransactionService';
import {
  ApiErrorResponse,
  TransactionListResponse
} from '@/types/stockTransaction.types';

const { Text } = Typography;

// Match the new BE response format from GET /current-stock
interface CurrentStockApiResponse {
  summary: {
    total_products: number;
    total_bins: number;
    total_quantity: number;
  };
  stocks: CurrentStockRow[];
}

interface CurrentStockRow {
  product_id: number;
  product_code: string;
  product_name: string;
  material: string;
  color: string;
  lot: string;
  bins: string; // "1,2,3,4,5"
  bin_count: number;
  current_quantity: number;
}

// Interface for table display
interface GroupedStockItem {
  key: string;
  product_id: number;
  product_code: string;
  product_name: string;
  lot: string;
  lotDate: string; // yyyy-mm-dd for sorting
  lotDateDisplay: string; // dd/mm/yyyy for display
  shift: string;
  bins: number[];
  total_quantity: number;
  bin_count: number;
  exported_quantity: number;
  exported_bins: number[];
  export_date_displays: string[];
  export_date_details: ExportDateDetail[];
  total_bins_init: number;
  has_exported: boolean;
  is_export_only?: boolean;
}

interface ExportDateDetail {
  date: string;
  quantity: number;
  bins: number[];
}

interface ExportInfo {
  product_id: number;
  product_code: string;
  product_name: string;
  lot: string;
  qty: number;
  bins: number[];
  export_dates: string[];
  export_date_details: ExportDateDetail[];
}

interface ProductStockGroup {
  key: string;
  product_id: number;
  product_code: string;
  product_name: string;
  lots: GroupedStockItem[];
  exported_lots: GroupedStockItem[];
  lot_count: number;
  total_quantity: number;
  total_bins_init: number;
  remaining_bins: number;
  exported_quantity: number;
  exported_bins_count: number;
  exported_lot_count: number;
}

// Parse lot code "A-ddmmyyyy-shift" → { date, shift, sortableDate }
const parseLotInfo = (lot: string) => {
  const parts = lot?.split('-') || [];
  if (parts.length >= 3) {
    const dateStr = parts[1]; // ddmmyyyy
    if (dateStr?.length === 8) {
      const dd = dateStr.substring(0, 2);
      const mm = dateStr.substring(2, 4);
      const yyyy = dateStr.substring(4, 8);
      return {
        sortableDate: `${yyyy}-${mm}-${dd}`,
        displayDate: `${dd}/${mm}/${yyyy}`,
        shift: parts[2]
      };
    }
  }
  return { sortableDate: '', displayDate: '', shift: '' };
};

const isLotInMonth = (lot: string, monthValue = dayjs()) => {
  const lotDate = parseLotInfo(lot).sortableDate;
  return Boolean(lotDate) && dayjs(lotDate).isSame(monthValue, 'month');
};

const compareLotsNewestFirst = (a: string, b: string) => {
  const lotPattern = /^[A-Z]-(\d{2})(\d{2})(\d{4})-([12])$/;
  const matchA = a.match(lotPattern);
  const matchB = b.match(lotPattern);

  if (matchA && matchB) {
    const dateA = Number(`${matchA[3]}${matchA[2]}${matchA[1]}`);
    const dateB = Number(`${matchB[3]}${matchB[2]}${matchB[1]}`);
    if (dateA !== dateB) return dateB - dateA;

    const shiftA = Number(matchA[4]);
    const shiftB = Number(matchB[4]);
    if (shiftA !== shiftB) return shiftB - shiftA;
  }

  return b.localeCompare(a, 'vi');
};

const CurrentStockDashboard: React.FC = () => {
  const isMobile = useIsMobile();
  const currentMonth = useMemo(() => dayjs(), []);
  const [loading, setLoading] = useState(false);
  const [tablePagination, setTablePagination] = useState({
    current: 1,
    pageSize: 50
  });
  const [stockData, setStockData] = useState<CurrentStockApiResponse | null>(
    null
  );
  const [filters, setFilters] = useState<{
    productId?: number;
    lot?: string;
    showEmpty?: boolean;
  }>({ showEmpty: false });
  const [exportData, setExportData] = useState<Map<string, ExportInfo>>(
    new Map()
  );
  const [detailRecord, setDetailRecord] = useState<ProductStockGroup | null>(
    null
  );
  const [exportedDetailRecord, setExportedDetailRecord] =
    useState<ProductStockGroup | null>(null);
  const [researchProductId, setResearchProductId] = useState<number>();
  const [researchLot, setResearchLot] = useState<string>();
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{
    productName: string;
    productCode: string;
    lot: string;
    quantity: number;
    bins: number[];
  } | null>(null);

  // Build product options for filter dropdown
  const productOptions = useMemo(() => {
    if (!stockData?.stocks) return [];
    const seen = new Map<number, string>();
    stockData.stocks
      .filter((item) => isLotInMonth(item.lot, currentMonth))
      .forEach((item) => {
        if (!seen.has(item.product_id)) {
          seen.set(
            item.product_id,
            `${item.product_name || `SP #${item.product_id}`} (${item.product_code || ''})`
          );
        }
      });
    exportData.forEach((item) => {
      if (!seen.has(item.product_id)) {
        seen.set(
          item.product_id,
          `${item.product_name || `SP #${item.product_id}`} (${item.product_code || ''})`
        );
      }
    });
    return Array.from(seen.entries()).map(([id, label]) => ({
      value: id,
      label
    }));
  }, [stockData, currentMonth, exportData]);

  const currentMonthStockRows = useMemo(() => {
    return (
      stockData?.stocks?.filter((item) =>
        isLotInMonth(item.lot, currentMonth)
      ) || []
    );
  }, [stockData, currentMonth]);

  const currentMonthSummary = useMemo(() => {
    const totalQuantity = currentMonthStockRows.reduce(
      (sum, item) => sum + Number(item.current_quantity || 0),
      0
    );
    const productIds = new Set(
      currentMonthStockRows.map((item) => item.product_id)
    );

    return {
      total_products: productIds.size,
      total_bins: currentMonthStockRows.reduce(
        (sum, item) => sum + Number(item.bin_count || 0),
        0
      ),
      total_quantity: totalQuantity
    };
  }, [currentMonthStockRows]);

  const loadCurrentStock = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await StockTransactionService.getCurrentStock(
        filters.productId
      )) as {
        success?: boolean;
        message?: string;
        data?: CurrentStockApiResponse;
      };

      if (
        result &&
        typeof result === 'object' &&
        'success' in result &&
        result.success === false
      ) {
        message.error(
          (result as unknown as ApiErrorResponse).message ||
            'Có lỗi xảy ra khi tải dữ liệu'
        );
        setStockData(null);
        return;
      }

      // Extract the actual data from the response
      const data = result?.data as CurrentStockApiResponse;
      if (data) {
        setStockData(data);
      } else {
        setStockData(null);
      }
    } catch (error: unknown) {
      console.error('Load current stock error:', error);
      message.error('Có lỗi xảy ra khi tải dữ liệu tồn kho');
      setStockData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.productId]);

  useEffect(() => {
    loadCurrentStock();
  }, [loadCurrentStock]);

  useEffect(() => {
    // Setup polling - refresh every 60 seconds
    const interval = setInterval(() => {
      loadCurrentStock();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadCurrentStock]);

  // Load export (out) transactions to show exported qty/bins per lot
  const loadExportData = useCallback(async () => {
    try {
      const result = await StockTransactionService.getTransactions({
        type: 'out',
        from_date: currentMonth.startOf('month').format('YYYY-MM-DD'),
        to_date: currentMonth.endOf('month').format('YYYY-MM-DD'),
        per_page: 10000,
        include: 'storage_product.product'
      });
      if (
        result &&
        !('success' in result && (result as ApiErrorResponse).success === false)
      ) {
        const txData = (result as TransactionListResponse).data || [];
        const map = new Map<string, ExportInfo>();
        txData.forEach((tx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flat = tx as any;
          const pId = flat.product_id || tx.storage_product?.product_id;
          const lot = flat.lot || tx.storage_product?.lot;
          const bin = flat.bin ?? tx.storage_product?.bin;
          const qty = Number(tx.quantity || 0);
          const exportDate = tx.created_at
            ? dayjs(tx.created_at).format('DD/MM/YYYY')
            : '';
          if (pId && lot) {
            const key = `${pId}_${lot}`;
            const product = tx.storage_product?.product;
            const existing: ExportInfo = map.get(key) ?? {
              product_id: Number(pId),
              product_code:
                flat.product_code || flat.product?.code || product?.code || '',
              product_name:
                flat.product_name ||
                flat.product?.name ||
                product?.name ||
                `SP #${pId}`,
              lot,
              qty: 0,
              bins: [],
              export_dates: [],
              export_date_details: []
            };
            existing.qty += qty;
            if (exportDate && !existing.export_dates.includes(exportDate)) {
              existing.export_dates.push(exportDate);
            }
            if (exportDate) {
              const dateDetail =
                existing.export_date_details.find(
                  (detail) => detail.date === exportDate
                ) || null;
              if (dateDetail) {
                dateDetail.quantity += qty;
                if (bin != null && !dateDetail.bins.includes(Number(bin))) {
                  dateDetail.bins.push(Number(bin));
                }
              } else {
                existing.export_date_details.push({
                  date: exportDate,
                  quantity: qty,
                  bins: bin != null ? [Number(bin)] : []
                });
              }
            }
            if (bin != null && !existing.bins.includes(Number(bin))) {
              existing.bins.push(Number(bin));
            }
            map.set(key, existing);
          }
        });
        setExportData(map);
      }
    } catch (error) {
      console.error('Load export data error:', error);
    }
  }, [currentMonth]);

  const productInfoById = useMemo(() => {
    const map = new Map<
      number,
      { product_code: string; product_name: string }
    >();

    stockData?.stocks?.forEach((item) => {
      if (!map.has(item.product_id)) {
        map.set(item.product_id, {
          product_code: item.product_code || '',
          product_name: item.product_name || `SP #${item.product_id}`
        });
      }
    });

    exportData.forEach((item) => {
      if (!map.has(item.product_id)) {
        map.set(item.product_id, {
          product_code: item.product_code,
          product_name: item.product_name
        });
      }
    });

    return map;
  }, [stockData, exportData]);

  useEffect(() => {
    loadExportData();
  }, [loadExportData]);

  // Transform API response to table data (lot-by-lot, memoized for stable pagination)
  const groupedStockItems = useMemo((): GroupedStockItem[] => {
    let items = currentMonthStockRows;

    // Client-side product filter
    if (filters.productId) {
      items = items.filter((item) => item.product_id === filters.productId);
    }

    // Client-side text search
    if (filters.lot) {
      const search = filters.lot.toLowerCase();
      items = items.filter(
        (item: CurrentStockRow) =>
          item.lot?.toLowerCase().includes(search) ||
          item.product_name?.toLowerCase().includes(search) ||
          item.product_code?.toLowerCase().includes(search)
      );
    }

    // Filter empty bins
    if (!filters.showEmpty) {
      items = items.filter(
        (item: CurrentStockRow) => item.current_quantity > 0
      );
    }

    const stockItems = items.map((item: CurrentStockRow) => {
      const lotInfo = parseLotInfo(item.lot);
      const expInfo = exportData.get(`${item.product_id}_${item.lot}`);
      const currentQuantity = Number(item.current_quantity || 0);
      const binCount = Number(item.bin_count || 0);
      const exportedQty = expInfo?.qty || 0;
      const exportedBins = expInfo?.bins || [];
      const exportDateDisplays = expInfo?.export_dates || [];
      const exportDateDetails = expInfo?.export_date_details || [];

      return {
        key: `${item.product_id}_${item.lot}`,
        product_id: item.product_id,
        product_code: item.product_code || '',
        product_name: item.product_name || `SP #${item.product_id}`,
        lot: item.lot,
        lotDate: lotInfo.sortableDate,
        lotDateDisplay: lotInfo.displayDate,
        shift: lotInfo.shift,
        bins: item.bins
          ? item.bins
              .split(',')
              .map((b) => parseInt(b.trim()))
              .filter((n) => !isNaN(n))
          : [],
        total_quantity: currentQuantity,
        bin_count: binCount,
        exported_quantity: exportedQty,
        exported_bins: exportedBins,
        export_date_displays: exportDateDisplays,
        export_date_details: exportDateDetails,
        total_bins_init: binCount + exportedBins.length,
        has_exported: exportedQty > 0
      };
    });

    const stockKeys = new Set(stockItems.map((item) => item.key));
    const exportOnlyItems = Array.from(exportData.values())
      .filter((item) => !stockKeys.has(`${item.product_id}_${item.lot}`))
      .filter((item) => {
        if (filters.productId && item.product_id !== filters.productId) {
          return false;
        }
        if (!filters.lot) return true;

        const search = filters.lot.toLowerCase();
        return (
          item.lot?.toLowerCase().includes(search) ||
          item.product_name?.toLowerCase().includes(search) ||
          item.product_code?.toLowerCase().includes(search)
        );
      })
      .map((item): GroupedStockItem => {
        const lotInfo = parseLotInfo(item.lot);
        const productInfo = productInfoById.get(item.product_id);

        return {
          key: `${item.product_id}_${item.lot}`,
          product_id: item.product_id,
          product_code: item.product_code || productInfo?.product_code || '',
          product_name:
            item.product_name ||
            productInfo?.product_name ||
            `SP #${item.product_id}`,
          lot: item.lot,
          lotDate: lotInfo.sortableDate,
          lotDateDisplay: lotInfo.displayDate,
          shift: lotInfo.shift,
          bins: [],
          total_quantity: 0,
          bin_count: 0,
          exported_quantity: item.qty,
          exported_bins: item.bins,
          export_date_displays: item.export_dates,
          export_date_details: item.export_date_details,
          total_bins_init: 0,
          has_exported: item.qty > 0,
          is_export_only: true
        };
      });

    return (
      [...stockItems, ...exportOnlyItems]
        // Default sort: product name → newest date first
        .sort((a, b) => {
          const nameCompare = (a.product_name || '').localeCompare(
            b.product_name || '',
            'vi'
          );
          if (nameCompare !== 0) return nameCompare;
          return b.lotDate.localeCompare(a.lotDate); // newest first
        })
    );
  }, [currentMonthStockRows, filters, exportData, productInfoById]);

  const productStockGroups = useMemo((): ProductStockGroup[] => {
    const map = new Map<number, ProductStockGroup>();

    groupedStockItems.forEach((item) => {
      const existing = map.get(item.product_id);
      if (existing) {
        if (!item.is_export_only) {
          existing.lots.push(item);
          existing.lot_count += 1;
          existing.total_quantity += item.total_quantity;
          existing.total_bins_init += item.total_bins_init;
          existing.remaining_bins += item.bin_count;
        }
        existing.exported_quantity += item.exported_quantity;
        existing.exported_bins_count += item.exported_bins.length;
        if (item.has_exported) {
          existing.exported_lots.push(item);
          existing.exported_lot_count += 1;
        }
      } else {
        map.set(item.product_id, {
          key: String(item.product_id),
          product_id: item.product_id,
          product_code: item.product_code || '',
          product_name: item.product_name || `SP #${item.product_id}`,
          lots: item.is_export_only ? [] : [item],
          exported_lots: item.has_exported ? [item] : [],
          lot_count: item.is_export_only ? 0 : 1,
          total_quantity: item.is_export_only ? 0 : item.total_quantity,
          total_bins_init: item.is_export_only ? 0 : item.total_bins_init,
          remaining_bins: item.is_export_only ? 0 : item.bin_count,
          exported_quantity: item.exported_quantity,
          exported_bins_count: item.exported_bins.length,
          exported_lot_count: item.has_exported ? 1 : 0
        });
      }
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        lots: [...group.lots].sort((a, b) => {
          const dateCompare = b.lotDate.localeCompare(a.lotDate);
          if (dateCompare !== 0) return dateCompare;
          return a.lot.localeCompare(b.lot);
        }),
        exported_lots: [...group.exported_lots].sort((a, b) => {
          const dateCompare = b.lotDate.localeCompare(a.lotDate);
          if (dateCompare !== 0) return dateCompare;
          return a.lot.localeCompare(b.lot);
        })
      }))
      .sort((a, b) => a.product_id - b.product_id);
  }, [groupedStockItems]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(productStockGroups.length / tablePagination.pageSize)
    );

    if (tablePagination.current > maxPage) {
      setTablePagination((prev) => ({ ...prev, current: maxPage }));
    }
  }, [productStockGroups.length, tablePagination]);

  const handleRefresh = () => {
    loadCurrentStock();
    loadExportData();
  };

  const handleLotSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, lot: value || undefined }));
  };

  const researchLotOptions = useMemo(() => {
    if (!researchProductId) return [];

    const uniqueLots = Array.from(
      new Set(
        (stockData?.stocks || [])
          .filter(
            (item) => Number(item.product_id) === Number(researchProductId)
          )
          .map((item) => item.lot)
          .filter((lot): lot is string => Boolean(lot))
      )
    );

    return uniqueLots.sort(compareLotsNewestFirst).map((lot) => ({
      value: lot,
      label: lot.replace(/^[A-Z]-/, '')
    }));
  }, [researchProductId, stockData]);

  const handleResearchStock = async () => {
    if (!researchProductId) {
      message.warning('Vui lòng chọn mã sản phẩm để tìm kiếm');
      return;
    }

    if (!researchLot) {
      message.warning('Vui lòng chọn lot trong danh sách');
      return;
    }

    setIsResearching(true);
    try {
      const result = (await StockTransactionService.getCurrentStock(
        researchProductId,
        researchLot,
        false,
        1000
      )) as {
        success?: boolean;
        message?: string;
        data?: CurrentStockApiResponse;
      };

      if (
        result &&
        typeof result === 'object' &&
        'success' in result &&
        result.success === false
      ) {
        message.error(result.message || 'Tìm kiếm thất bại');
        return;
      }

      const matched = (result?.data?.stocks || []).find(
        (item) =>
          Number(item.product_id) === Number(researchProductId) &&
          item.lot === researchLot
      );

      const productFallback = productOptions.find(
        (item) => Number(item.value) === Number(researchProductId)
      );

      const bins =
        matched?.bins
          ?.split(',')
          .map((value) => parseInt(value.trim(), 10))
          .filter((value) => !isNaN(value))
          .sort((a, b) => a - b) || [];

      setResearchResult({
        productName:
          matched?.product_name ||
          String(productFallback?.label || `SP #${researchProductId}`),
        productCode: matched?.product_code || '',
        lot: researchLot,
        quantity: Number(matched?.current_quantity || 0),
        bins
      });
      message.success(`Đã tìm kiếm số liệu kho cho lot ${researchLot}`);
    } catch {
      message.error('Không thể tìm kiếm số liệu kho');
    } finally {
      setIsResearching(false);
    }
  };

  const handleChangeResearchProduct = (value: number) => {
    setResearchProductId(value);
    setResearchLot(undefined);
    setResearchResult(null);
  };

  const productColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 220,
      sorter: (a: ProductStockGroup, b: ProductStockGroup) =>
        a.product_id - b.product_id,
      defaultSortOrder: 'ascend' as const,
      render: (record: ProductStockGroup) => (
        <div>
          <div>
            <Text strong>{record.product_name}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.product_code}
          </Text>
        </div>
      )
    },
    {
      title: 'Lots',
      dataIndex: 'lot_count',
      key: 'lot_count',
      width: 90,
      align: 'center' as const,
      sorter: (a: ProductStockGroup, b: ProductStockGroup) =>
        a.lot_count - b.lot_count,
      render: (_: number, record: ProductStockGroup) => (
        <span
          onClick={() => setDetailRecord(record)}
          className="cursor-pointer text-blue-500 hover:text-blue-700"
          style={{ borderBottom: '1px dashed currentColor' }}
        >
          {record.lot_count} lots{' '}
          <InfoCircleOutlined style={{ fontSize: 10 }} />
        </span>
      )
    },
    {
      title: 'Tồn kho',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 110,
      align: 'center' as const,
      sorter: (a: ProductStockGroup, b: ProductStockGroup) =>
        a.total_quantity - b.total_quantity,
      render: (quantity: number) => (
        <Text
          strong
          className="whitespace-nowrap"
          style={{ color: quantity > 0 ? '#52c41a' : '#f5222d' }}
        >
          {Number(quantity || 0).toLocaleString('vi-VN')}
        </Text>
      )
    },
    {
      title: 'Tổng thùng',
      dataIndex: 'total_bins_init',
      key: 'total_bins_init',
      width: 120,
      align: 'center' as const,
      sorter: (a: ProductStockGroup, b: ProductStockGroup) =>
        a.total_bins_init - b.total_bins_init,
      render: (count: number) => <Text strong>{count} thùng</Text>
    },
    {
      title: 'Thùng còn',
      dataIndex: 'remaining_bins',
      key: 'remaining_bins',
      width: 110,
      align: 'center' as const,
      sorter: (a: ProductStockGroup, b: ProductStockGroup) =>
        a.remaining_bins - b.remaining_bins,
      render: (_: number, record: ProductStockGroup) => (
        <span
          onClick={() => setDetailRecord(record)}
          className="cursor-pointer font-semibold text-blue-500 hover:text-blue-700"
          style={{ borderBottom: '1px dashed currentColor' }}
        >
          {record.remaining_bins} thùng{' '}
          <InfoCircleOutlined style={{ fontSize: 10 }} />
        </span>
      )
    },
    {
      title: 'Đã xuất',
      key: 'exported',
      width: 140,
      align: 'center' as const,
      render: (_: unknown, record: ProductStockGroup) => {
        if (record.exported_lot_count > 0) {
          const label = `${record.exported_lot_count} lots`;
          return (
            <span
              onClick={() => {
                const exportedLots = record.exported_lots;
                const exportedRecord: ProductStockGroup = {
                  ...record,
                  lots: exportedLots,
                  exported_lots: exportedLots,
                  lot_count: exportedLots.length,
                  total_quantity: exportedLots.reduce(
                    (sum, lot) => sum + lot.exported_quantity,
                    0
                  ),
                  total_bins_init: exportedLots.reduce(
                    (sum, lot) => sum + lot.exported_bins.length,
                    0
                  ),
                  remaining_bins: exportedLots.reduce(
                    (sum, lot) => sum + lot.bin_count,
                    0
                  ),
                  exported_quantity: exportedLots.reduce(
                    (sum, lot) => sum + lot.exported_quantity,
                    0
                  ),
                  exported_bins_count: exportedLots.reduce(
                    (sum, lot) => sum + lot.exported_bins.length,
                    0
                  ),
                  exported_lot_count: exportedLots.length
                };
                setExportedDetailRecord(exportedRecord);
              }}
              className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap text-orange-500 hover:text-orange-700"
              style={{
                borderBottom: '1px dashed currentColor'
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
        return <Text style={{ color: '#d9d9d9' }}>Chưa có lot đã xuất</Text>;
      }
    }
  ];

  if (loading && !stockData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="large">
          <div className="text-center">
            <div className="mt-4">
              <Text type="secondary">Đang tải dữ liệu tồn kho...</Text>
            </div>
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Summary + Controls */}
      <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
        {/* Row 1: Summary stats */}
        {loading ? (
          <div className="flex items-center gap-2">
            <Spin size="small" />
            <Text type="secondary" className="text-xs">
              Đang tải...
            </Text>
          </div>
        ) : stockData ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="text-xs font-medium text-gray-500">
              Tháng {currentMonth.format('MM/YYYY')}
            </span>
            <div className="hidden h-4 w-px bg-gray-200 sm:block" />
            <div>
              <span className="text-xs text-gray-400">Thùng tháng</span>
              <span className="ml-1.5 text-base font-bold text-blue-600">
                {Number(currentMonthSummary.total_bins || 0).toLocaleString(
                  'vi-VN'
                )}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400">Sản phẩm tháng</span>
              <span className="ml-1.5 text-base font-bold text-purple-600">
                {Number(currentMonthSummary.total_products || 0).toLocaleString(
                  'vi-VN'
                )}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400">SL lot tháng</span>
              <span className="ml-1.5 text-base font-bold text-green-600">
                {Number(currentMonthSummary.total_quantity || 0).toLocaleString(
                  'vi-VN'
                )}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400">Lots tháng</span>
              <span className="ml-1.5 text-base font-bold text-orange-500">
                {Number(
                  currentMonthStockRows
                    ? new Set(
                        currentMonthStockRows.map(
                          (item) => `${item.product_id}_${item.lot}`
                        )
                      ).size
                    : 0
                ).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        ) : (
          <Text type="secondary">Không có dữ liệu</Text>
        )}

        {/* Row 2: Filters */}
        <div className="stock-filter-row flex flex-wrap items-center gap-2">
          <Select
            placeholder="Lọc sản phẩm"
            allowClear
            size="small"
            className="stock-filter-control !w-full sm:!w-[200px]"
            options={productOptions}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, productId: value || undefined }))
            }
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <AppSearchInput
            placeholder="Tìm lot..."
            className="!w-full sm:!w-[160px]"
            onChange={(e) => handleLotSearch(e.target.value)}
          />
          <RefreshButton
            refresh={handleRefresh}
            isLoading={loading}
            size="small"
            className="stock-filter-control"
          />
        </div>

        <ResearchStockPanel
          productOptions={productOptions}
          lotOptions={researchLotOptions}
          productId={researchProductId}
          lotValue={researchLot}
          loading={isResearching}
          result={researchResult}
          onProductChange={handleChangeResearchProduct}
          onLotChange={setResearchLot}
          onSubmit={() => void handleResearchStock()}
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden sm:block">
        <Table
          columns={productColumns}
          dataSource={productStockGroups}
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
          scroll={{ x: 900 }}
        />
      </div>

      {/* Mobile: Card list */}
      <div className="block sm:hidden">
        {loading ? (
          <div className="py-8 text-center text-gray-400">Đang tải...</div>
        ) : productStockGroups.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Không có dữ liệu</div>
        ) : (
          <>
            <div className="space-y-2">
              {productStockGroups
                .slice(
                  (tablePagination.current - 1) * tablePagination.pageSize,
                  tablePagination.current * tablePagination.pageSize
                )
                .map((product) => (
                  <div
                    key={product.key}
                    className="rounded-lg border border-gray-100 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Text strong className="text-sm">
                          {product.product_name}
                        </Text>
                        <div className="text-[10px] text-gray-400">
                          {product.product_code}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Text
                          strong
                          style={{
                            color:
                              product.total_quantity > 0
                                ? '#52c41a'
                                : '#f5222d',
                            fontSize: '15px'
                          }}
                        >
                          {Number(product.total_quantity || 0).toLocaleString(
                            'vi-VN'
                          )}
                        </Text>
                        <div className="text-[10px] text-gray-400">tồn kho</div>
                      </div>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>{product.lot_count} lots</span>
                      <span>{product.total_bins_init} thùng tổng</span>
                      <span className="font-semibold text-blue-600">
                        {product.remaining_bins} thùng còn
                      </span>
                      {product.exported_bins_count > 0 && (
                        <span className="text-xs font-medium text-orange-600">
                          {product.exported_bins_count} thùng xuất
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-2">
                      {product.lots.map((lot) => (
                        <div
                          key={lot.key}
                          className="rounded border border-gray-100 bg-gray-50 px-2 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <Text code className="!text-[12px] !font-bold">
                                {lot.lot}
                              </Text>
                              {lot.lotDateDisplay && (
                                <div className="text-[10px] text-gray-400">
                                  {lot.lotDateDisplay}
                                  {lot.shift ? ` · Ca ${lot.shift}` : ''}
                                </div>
                              )}
                            </div>
                            <Text strong style={{ color: '#16a34a' }}>
                              {Number(lot.total_quantity || 0).toLocaleString(
                                'vi-VN'
                              )}
                            </Text>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-500">
                              Còn: {lot.bin_count} thùng
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-500">
                              Tổng: {lot.total_bins_init} thùng
                            </span>
                            {lot.exported_quantity > 0 && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-orange-600">
                                  Xuất:{' '}
                                  {Number(
                                    lot.exported_quantity || 0
                                  ).toLocaleString('vi-VN')}
                                </span>
                              </>
                            )}
                          </div>

                          {lot.bins.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1 border-t border-dashed border-gray-200 pt-1">
                              <span className="mr-1 text-[10px] text-gray-500">
                                Thùng còn:
                              </span>
                              {lot.bins.map((bin) => (
                                <span
                                  key={`${lot.key}-bin-${bin}`}
                                  className="rounded border border-gray-300 bg-white px-1 text-[10px] font-semibold text-gray-700"
                                >
                                  {bin}
                                </span>
                              ))}
                            </div>
                          )}

                          {lot.exported_bins.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1 border-t border-dashed border-orange-100 pt-1">
                              <span className="mr-1 text-[10px] text-orange-500">
                                Thùng xuất:
                              </span>
                              {lot.exported_bins.map((bin) => (
                                <span
                                  key={`${lot.key}-export-bin-${bin}`}
                                  className="rounded border border-orange-200 bg-orange-50 px-1 text-[10px] font-semibold text-orange-600"
                                >
                                  {bin}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Mobile pagination */}
            {productStockGroups.length > tablePagination.pageSize && (
              <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
                <span>
                  {(tablePagination.current - 1) * tablePagination.pageSize + 1}
                  -
                  {Math.min(
                    tablePagination.current * tablePagination.pageSize,
                    productStockGroups.length
                  )}{' '}
                  / {productStockGroups.length}
                </span>
                <div className="flex items-center gap-1">
                  <AppButton
                    size="small"
                    disabled={tablePagination.current <= 1}
                    onClick={() =>
                      setTablePagination((p) => ({
                        ...p,
                        current: p.current - 1
                      }))
                    }
                  >
                    ‹
                  </AppButton>
                  <span className="px-1.5 text-xs font-medium text-gray-600">
                    {tablePagination.current} /{' '}
                    {Math.ceil(
                      productStockGroups.length / tablePagination.pageSize
                    )}
                  </span>
                  <AppButton
                    size="small"
                    disabled={
                      tablePagination.current * tablePagination.pageSize >=
                      productStockGroups.length
                    }
                    onClick={() =>
                      setTablePagination((p) => ({
                        ...p,
                        current: p.current + 1
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
        title={
          <span className="text-base font-semibold text-gray-800">
            Lots / thùng của sản phẩm: {detailRecord?.product_name}
          </span>
        }
        placement="right"
        onClose={() => setDetailRecord(null)}
        open={!!detailRecord}
        width={isMobile ? '100vw' : 480}
        styles={{
          body: { padding: isMobile ? '10px' : '12px' },
          header: {
            borderBottom: '1px solid #e2e8f0',
            padding: isMobile ? '10px 12px' : '12px 16px'
          }
        }}
      >
        {detailRecord && (
          <div className="flex flex-col gap-3">
            {detailRecord.lots.map((lot) => (
              <div
                key={lot.key}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <Text code className="text-sm font-bold text-gray-800">
                      {lot.lot}
                    </Text>
                    {lot.lotDateDisplay && (
                      <div className="mt-0.5 text-xs text-gray-400">
                        {lot.lotDateDisplay}
                        {lot.shift ? ` · Ca ${lot.shift}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">
                      {Number(lot.total_quantity || 0).toLocaleString('vi-VN')}
                    </div>
                    <div className="text-[10px] text-gray-400">còn tồn</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <span>Tổng: {lot.total_bins_init} thùng · </span>
                  <span className="font-semibold text-blue-600">
                    Còn: {lot.bin_count} thùng
                  </span>
                </div>

                {lot.bins.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-gray-100 pt-2">
                    {lot.bins
                      .sort((a, b) => a - b)
                      .map((bin) => (
                        <span
                          key={bin}
                          className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700"
                        >
                          {bin}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <div className="text-gray-400">Lots</div>
                  <div className="text-lg font-bold text-blue-600">
                    {detailRecord.lot_count}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Tồn kho</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {Number(detailRecord.total_quantity || 0).toLocaleString(
                      'vi-VN'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Thùng còn</div>
                  <div className="text-lg font-bold text-blue-600">
                    {detailRecord.remaining_bins}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        title={
          <span className="text-base font-semibold text-gray-800">
            Lots / thùng đã xuất: {exportedDetailRecord?.product_name}
          </span>
        }
        placement="right"
        onClose={() => setExportedDetailRecord(null)}
        open={!!exportedDetailRecord}
        width={isMobile ? '100vw' : 480}
        styles={{
          body: { padding: isMobile ? '10px' : '12px' },
          header: {
            borderBottom: '1px solid #e2e8f0',
            padding: isMobile ? '10px 12px' : '12px 16px'
          }
        }}
      >
        {exportedDetailRecord && (
          <div className="flex flex-col gap-3">
            {exportedDetailRecord.lots.map((lot) => (
              <div
                key={lot.key}
                className="rounded-lg border border-orange-200 bg-white p-3"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div>
                      <Text code className="text-sm font-bold text-gray-800">
                        Lot:{lot.lot}
                      </Text>
                    </div>
                    {(lot.export_date_details || []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(lot.export_date_details || []).map((detail) => (
                          <div
                            key={`${lot.key}-export-date-${detail.date}`}
                            className="rounded border border-orange-100 bg-orange-50 px-2 py-1 text-xs text-orange-700"
                          >
                            <Text
                              strong
                              className="mr-1 text-xs text-orange-800"
                            >
                              Ngày xuất {detail.date}:
                            </Text>
                            {detail.bins.length} thùng ·{' '}
                            {Number(detail.quantity || 0).toLocaleString(
                              'vi-VN'
                            )}{' '}
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
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">
                      {Number(lot.exported_quantity || 0).toLocaleString(
                        'vi-VN'
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400">đã xuất</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div>
                  <div className="text-gray-400">Lots đã xuất</div>
                  <div className="text-lg font-bold text-orange-600">
                    {exportedDetailRecord.lot_count}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Tổng SL xuất</div>
                  <div className="text-lg font-bold text-orange-600">
                    {Number(
                      exportedDetailRecord.exported_quantity || 0
                    ).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CurrentStockDashboard;
