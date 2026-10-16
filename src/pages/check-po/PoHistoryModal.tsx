import AppSearchInput from '@/components/common/AppSearchInput';
import { DailyQuantitiesType } from '@/types/dailyQuantitiesType';
import {
  PurchaseOrdersHistoryResponse,
  UpdatePoRequest
} from '@/types/purchaseOrdersType';
import AppButton from '@components/common/AppButton';
import { customFormProps } from '@components/custom/FormProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import { productService } from '@services/ProductService';
import {
  deleteAllPurchaseOrders,
  deleteBatchPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrdersHistory,
  updatePurchaseOrdersQuantities
} from '@services/PurchaseOrdersService';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import {
  DatePicker,
  Drawer,
  Empty,
  Form,
  FormProps,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tabs,
  TabsProps,
  Tag
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import { IconHistory } from '@components/icons';
import { useIsMobile } from '@hooks/useIsMobile';

// ── Types ────────────────────────────────────────────────────
interface FormFields {
  date: string;
  [key: `product_${number | string}`]: number;
}

interface PoHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

interface BatchGroup {
  batchId: string;
  date: string;
  fileName: string;
  fileType: string; // 'FAPV' | 'FASV' | 'FAVV' | 'Khác'
  note: string;
  employeeName: string;
  createdAt: string;
  productCount: number;
  totalQuantity: number;
  records: DailyQuantitiesType[];
}

interface FileTypeGroup {
  fileType: string;
  color: string;
  batchCount: number;
  productCount: number;
  totalQuantity: number;
  batches: BatchGroup[];
  exportPurposeGroups: ExportPurposeGroup[];
}

interface ExportPurposeGroup {
  key: string;
  label: string;
  color: string;
  batchCount: number;
  productCount: number;
  totalQuantity: number;
  batches: BatchGroup[];
}

interface ImportDateGroup {
  key: string;
  label: string;
  batchCount: number;
  productCount: number;
  totalQuantity: number;
  batches: BatchGroup[];
  fileTypeGroups: FileTypeGroup[];
}

// ── Constants ────────────────────────────────────────────────
const FILE_TYPE_CONFIG: Record<string, { color: string; tagColor: string }> = {
  FAPV: { color: 'blue', tagColor: 'blue' },
  FASV: { color: 'green', tagColor: 'green' },
  FAVV: { color: 'purple', tagColor: 'purple' },
  Khác: { color: 'default', tagColor: 'default' }
};

const FILE_TYPE_SECTION_STYLE: Record<
  string,
  { section: string; header: string }
> = {
  FAPV: {
    section:
      'border-blue-200 shadow-[inset_4px_0_0_#3b82f6] dark:border-blue-900/70',
    header:
      'border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/30'
  },
  FASV: {
    section:
      'border-green-200 shadow-[inset_4px_0_0_#22c55e] dark:border-green-900/70',
    header:
      'border-green-100 bg-green-50/80 dark:border-green-900/60 dark:bg-green-950/30'
  },
  FAVV: {
    section:
      'border-purple-200 shadow-[inset_4px_0_0_#a855f7] dark:border-purple-900/70',
    header:
      'border-purple-100 bg-purple-50/80 dark:border-purple-900/60 dark:bg-purple-950/30'
  },
  Khác: {
    section:
      'border-gray-200 shadow-[inset_4px_0_0_#94a3b8] dark:border-gray-700',
    header:
      'border-gray-100 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/60'
  }
};

const FILE_TYPES = ['FAPV', 'FASV', 'FAVV'];
const getFileType = (fileName: string): string => {
  const upper = (fileName || '').toUpperCase();
  if (upper.includes('V002V')) return 'FAVV';
  return FILE_TYPES.find((t) => upper.startsWith(t)) || 'Khác';
};

const EXPORT_PURPOSE_CONFIG: Record<string, { label: string; color: string }> =
  {
    sale: { label: 'Xuất bán', color: 'orange' },
    export: { label: 'Xuất khẩu', color: 'geekblue' }
  };

const EXPORT_PURPOSE_ORDER = ['export', 'sale'];
const getExportPurpose = (fileName: string): string => {
  const upper = (fileName || '').toUpperCase();
  return /(^|[^A-Z0-9])XB([^A-Z0-9]|$)/.test(upper) || upper.includes('V002V')
    ? 'sale'
    : 'export';
};

const getImportDateKey = (date?: string | null) =>
  date && dayjs(date).isValid() ? dayjs(date).format('YYYY-MM-DD') : 'unknown';

const formatImportDate = (date?: string | null) =>
  date && dayjs(date).isValid() ? dayjs(date).format('DD/MM/YYYY') : '—';

// ── Component ────────────────────────────────────────────────
export const PoHistoryModal: React.FC<PoHistoryModalProps> = ({
  open,
  onClose
}) => {
  const isMobile = useIsMobile();
  const [form] = Form.useForm<FormFields>();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [date, setDate] = useState<Dayjs>();
  const [searchText, setSearchText] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [historyViewTab, setHistoryViewTab] = useState('by-export-date');
  const [selectedImportDateKey, setSelectedImportDateKey] = useState<string>();

  const queryClient = useQueryClient();
  const invalidatePoQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['purchaseOrdersHistory'] });
    queryClient.invalidateQueries({ queryKey: ['products-weekly'] });
  };

  // ── Mutations ──────────────────────────────────────────────
  const { mutate: updatePurchaseOrder, isPending } = useMutation({
    mutationKey: ['updatePurchaseOrder'],
    mutationFn: (data: UpdatePoRequest) => updatePurchaseOrdersQuantities(data),
    onMutate: () => {
      message.loading({
        content: 'Đang cập nhật...',
        key: 'update-po-quantity'
      });
    },
    onSuccess: () => {
      message.success({
        content: 'Cập nhật thành công!',
        key: 'update-po-quantity'
      });
      setDate(undefined);
      invalidatePoQueries();
    },
    onError: () => {
      message.error({
        content: 'Cập nhật thất bại!',
        key: 'update-po-quantity'
      });
    }
  });

  const { mutate: deleteBatch, isPending: isDeletingBatch } = useMutation({
    mutationKey: ['deleteBatch'],
    mutationFn: (batchId: string) => deleteBatchPurchaseOrder(batchId),
    onMutate: async (batchId) => {
      message.loading({ content: 'Đang xóa...', key: 'delete-batch' });
      await queryClient.cancelQueries({ queryKey: ['purchaseOrdersHistory'] });
      const prev = queryClient.getQueryData<PurchaseOrdersHistoryResponse>([
        'purchaseOrdersHistory',
        month,
        date
      ]);
      if (prev) {
        queryClient.setQueryData<PurchaseOrdersHistoryResponse>(
          ['purchaseOrdersHistory', month, date],
          {
            ...prev,
            dailyQuantitiesPo: prev.dailyQuantitiesPo.filter(
              (item) => item.batch_id !== batchId
            )
          }
        );
      }
      return { prev };
    },
    onSuccess: () => {
      message.success({ content: 'Đã xóa thành công!', key: 'delete-batch' });
      invalidatePoQueries();
    },
    onError: (_err, _vars, ctx) => {
      message.error({ content: 'Xóa thất bại!', key: 'delete-batch' });
      if (ctx?.prev) {
        queryClient.setQueryData(
          ['purchaseOrdersHistory', month, date],
          ctx.prev
        );
      }
    }
  });

  const { mutate: deleteRecord } = useMutation({
    mutationKey: ['deleteRecord'],
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onMutate: async (id) => {
      message.loading({ content: 'Đang xóa...', key: 'delete-record' });
      await queryClient.cancelQueries({ queryKey: ['purchaseOrdersHistory'] });
      const prev = queryClient.getQueryData<PurchaseOrdersHistoryResponse>([
        'purchaseOrdersHistory',
        month,
        date
      ]);
      if (prev) {
        queryClient.setQueryData<PurchaseOrdersHistoryResponse>(
          ['purchaseOrdersHistory', month, date],
          {
            ...prev,
            dailyQuantitiesPo: prev.dailyQuantitiesPo.filter(
              (item) => item.id !== id
            )
          }
        );
      }
      return { prev };
    },
    onSuccess: () => {
      message.success({ content: 'Đã xóa!', key: 'delete-record' });
      invalidatePoQueries();
    },
    onError: (_err, _vars, ctx) => {
      message.error({ content: 'Xóa thất bại!', key: 'delete-record' });
      if (ctx?.prev) {
        queryClient.setQueryData(
          ['purchaseOrdersHistory', month, date],
          ctx.prev
        );
      }
    }
  });

  const { mutate: deleteAll, isPending: isDeletingAll } = useMutation({
    mutationKey: ['deleteAllPurchaseOrders'],
    mutationFn: deleteAllPurchaseOrders,
    onMutate: () => {
      message.loading({
        content: 'Đang xóa tất cả PO...',
        key: 'delete-all-po'
      });
    },
    onSuccess: () => {
      message.success({ content: 'Đã xóa tất cả PO!', key: 'delete-all-po' });
      setExpandedBatchId(null);
      invalidatePoQueries();
    },
    onError: () => {
      message.error({
        content: 'Xóa tất cả PO thất bại!',
        key: 'delete-all-po'
      });
    }
  });

  const handleInlineSave = (record: DailyQuantitiesType) => {
    if (editValue === record.quantity) {
      setEditingId(null);
      return;
    }
    updatePurchaseOrder({
      date: record.date,
      products: [{ productId: record.product_id, quantity: editValue }]
    });
    setEditingId(null);
  };

  // ── Queries ────────────────────────────────────────────────
  const { data: purchaseOrdersHistory, isLoading: isLoadingHistory } = useQuery(
    {
      queryKey: ['purchaseOrdersHistory', month, date],
      queryFn: () => getPurchaseOrdersHistory(month.format('YYYY-MM')),
      enabled: open,
      placeholderData: keepPreviousData
    }
  );

  const { data: products, isFetching: isLoadingProducts } = useQuery({
    queryKey: ['purchaseOrdersHistory', date],
    queryFn: () =>
      productService.list({
        limit: 0,
        include: ['dailyQuantitiesPo'],
        date: date?.format('YYYY-MM-DD')
      }),
    enabled: !!date && open,
    placeholderData: keepPreviousData
  });

  const productList = products?.data || [];
  const allHistoryData = purchaseOrdersHistory?.dailyQuantitiesPo || [];

  const normalizedSearchText = searchText.trim().toLowerCase();

  const filteredHistoryData = allHistoryData.filter((item) => {
    if (!normalizedSearchText) return true;

    return [item.product?.name, item.file_name].some((value) =>
      value?.toLowerCase().includes(normalizedSearchText)
    );
  });

  const filteredProductList = productList.filter((product) =>
    product.name?.toLowerCase().includes(normalizedSearchText)
  );

  // ── Group records by batch_id ──────────────────────────────
  const batchGroups: BatchGroup[] = useMemo(() => {
    const map = new Map<string, DailyQuantitiesType[]>();

    // Phân loại records vào các batch
    for (const item of filteredHistoryData) {
      const key = item.batch_id || `no-batch-${item.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    return (
      [...map.entries()]
        .map(([batchId, records]) => {
          // Sắp xếp các record bên trong mỗi batch theo tên sản phẩm (hỗ trợ số/STT trong tên)
          const sortedRecords = [...records].sort((a, b) => {
            const nameA = a.product?.name || '';
            const nameB = b.product?.name || '';
            return nameA.localeCompare(nameB, undefined, {
              numeric: true,
              sensitivity: 'base'
            });
          });

          const rawFileName = sortedRecords[0]?.file_name || '';
          return {
            batchId,
            date: sortedRecords[0]?.date || '',
            fileName: rawFileName,
            fileType: getFileType(rawFileName),
            note: sortedRecords[0]?.note || '',
            employeeName: sortedRecords[0]?.employee?.name || '—',
            createdAt:
              sortedRecords[0]?.created_at ||
              sortedRecords[0]?.updated_at ||
              '',
            productCount: sortedRecords.length,
            totalQuantity: sortedRecords.reduce(
              (s, r) => s + (r.quantity || 0),
              0
            ),
            records: sortedRecords
          };
        })
        // Giữ đúng logic cũ: sắp xếp các file theo Tên file bằng natural sort.
        .sort((a, b) => {
          const nameA = a.fileName || '';
          const nameB = b.fileName || '';
          return nameA.localeCompare(nameB, undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        })
    );
  }, [filteredHistoryData]);

  const totalExportQuantity = useMemo(
    () => batchGroups.reduce((sum, batch) => sum + batch.totalQuantity, 0),
    [batchGroups]
  );

  const importDateGroups: ImportDateGroup[] = useMemo(() => {
    const map = new Map<string, BatchGroup[]>();

    for (const batch of batchGroups) {
      const key = getImportDateKey(batch.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(batch);
    }

    return [...map.entries()]
      .map(([key, groupedBatches]) => {
        // Build fileTypeGroups
        const ftMap = new Map<string, BatchGroup[]>();
        for (const batch of groupedBatches) {
          const ft = batch.fileType;
          if (!ftMap.has(ft)) ftMap.set(ft, []);
          ftMap.get(ft)!.push(batch);
        }
        const FILE_TYPE_ORDER = ['FAPV', 'FASV', 'FAVV', 'Khác'];
        const fileTypeGroups: FileTypeGroup[] = [...ftMap.entries()]
          .map(([ft, batches]) => {
            const purposeMap = new Map<string, BatchGroup[]>();
            for (const batch of batches) {
              const purpose = getExportPurpose(batch.fileName);
              if (!purposeMap.has(purpose)) purposeMap.set(purpose, []);
              purposeMap.get(purpose)!.push(batch);
            }

            const exportPurposeGroups: ExportPurposeGroup[] = [
              ...purposeMap.entries()
            ]
              .map(([purpose, purposeBatches]) => ({
                key: purpose,
                label: EXPORT_PURPOSE_CONFIG[purpose]?.label || purpose,
                color: EXPORT_PURPOSE_CONFIG[purpose]?.color || 'default',
                batchCount: purposeBatches.length,
                productCount: purposeBatches.reduce(
                  (s, b) => s + b.productCount,
                  0
                ),
                totalQuantity: purposeBatches.reduce(
                  (s, b) => s + b.totalQuantity,
                  0
                ),
                batches: purposeBatches
              }))
              .sort(
                (a, b) =>
                  EXPORT_PURPOSE_ORDER.indexOf(a.key) -
                  EXPORT_PURPOSE_ORDER.indexOf(b.key)
              );

            return {
              fileType: ft,
              color: FILE_TYPE_CONFIG[ft]?.color || 'default',
              batchCount: batches.length,
              productCount: batches.reduce((s, b) => s + b.productCount, 0),
              totalQuantity: batches.reduce((s, b) => s + b.totalQuantity, 0),
              batches,
              exportPurposeGroups
            };
          })
          .sort(
            (a, b) =>
              FILE_TYPE_ORDER.indexOf(a.fileType) -
              FILE_TYPE_ORDER.indexOf(b.fileType)
          );

        return {
          key,
          label:
            key === 'unknown'
              ? 'Không rõ ngày xuất hàng'
              : dayjs(key).format('DD/MM/YYYY'),
          batchCount: groupedBatches.length,
          productCount: groupedBatches.reduce(
            (sum, batch) => sum + batch.productCount,
            0
          ),
          totalQuantity: groupedBatches.reduce(
            (sum, batch) => sum + batch.totalQuantity,
            0
          ),
          batches: groupedBatches,
          fileTypeGroups
        };
      })
      .sort((a, b) => {
        if (a.key === 'unknown') return 1;
        if (b.key === 'unknown') return -1;
        return dayjs(b.key).valueOf() - dayjs(a.key).valueOf();
      });
  }, [batchGroups]);

  useEffect(() => {
    if (importDateGroups.length === 0) {
      setSelectedImportDateKey(undefined);
      return;
    }

    const hasSelectedDate = importDateGroups.some(
      (group) => group.key === selectedImportDateKey
    );
    if (!hasSelectedDate) {
      setSelectedImportDateKey(importDateGroups[0].key);
    }
  }, [importDateGroups, selectedImportDateKey]);

  const selectedImportDateGroup = useMemo(
    () =>
      importDateGroups.find((group) => group.key === selectedImportDateKey) ||
      importDateGroups[0],
    [importDateGroups, selectedImportDateKey]
  );

  const renderMobileBatchGroup = (batches: BatchGroup[]) => (
    <div className="flex flex-col gap-3">
      {batches.map((batch, index) => {
        const hasBatchId =
          batch.batchId && !batch.batchId.startsWith('no-batch-');
        const isExpanded = expandedBatchId === batch.batchId;
        return (
          <div
            key={batch.batchId}
            className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  {index + 1}
                </span>
                <div className="text-sm font-semibold text-gray-800 dark:text-white">
                  {formatImportDate(batch.date)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400">Thời gian</div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {batch.createdAt
                    ? dayjs(batch.createdAt).format('HH:mm:ss')
                    : '—'}
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
                <div className="text-[10px] text-gray-500">Người nhập</div>
                <div className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                  {batch.employeeName}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
                <div className="text-[10px] text-gray-500">Tên file</div>
                <div className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                  {batch.fileName || '—'}
                </div>
              </div>
              {batch.note && (
                <div className="col-span-2 rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                  <div className="text-[10px] text-amber-600 dark:text-amber-400">
                    Ghi chú
                  </div>
                  <div className="text-xs font-medium break-words whitespace-pre-wrap text-amber-800 dark:text-amber-200">
                    {batch.note}
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-green-50 p-2 dark:bg-green-900/20">
                <div className="text-[10px] text-green-600 dark:text-green-400">
                  Tổng sản phẩm
                </div>
                <div className="font-bold text-green-700 dark:text-green-300">
                  {batch.productCount} SP
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                <div className="text-[10px] text-blue-600 dark:text-blue-400">
                  Tổng số lượng
                </div>
                <div className="font-bold text-blue-700 dark:text-blue-300">
                  {Number(batch.totalQuantity).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <AppButton
                type="text"
                size="small"
                className="text-xs !text-blue-500"
                icon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                onClick={() =>
                  setExpandedBatchId(isExpanded ? null : batch.batchId)
                }
              >
                {isExpanded ? 'Thu gọn' : 'Xem chi tiết SP'}
              </AppButton>
              {hasBatchId ? (
                <Popconfirm
                  title="Xóa toàn bộ file?"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    deleteBatch(batch.batchId);
                  }}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{
                    danger: true,
                    loading: isDeletingBatch
                  }}
                >
                  <AppButton
                    size="small"
                    type="text"
                    danger
                    icon={<FaTrash />}
                  />
                </Popconfirm>
              ) : (
                batch.records.length === 1 && (
                  <Popconfirm
                    title={`Xóa "${batch.records[0].product?.name}"?`}
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      deleteRecord(batch.records[0].id);
                    }}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <AppButton
                      size="small"
                      type="text"
                      danger
                      icon={<FaTrash />}
                    />
                  </Popconfirm>
                )
              )}
            </div>

            {isExpanded && batch.records.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                {batch.records.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between border-b border-gray-50 p-2 last:border-0 dark:border-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                        {i + 1}. {r.product?.name || '—'}
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                      {editingId === r.id ? (
                        <div className="flex items-center gap-1">
                          <InputNumber
                            size="small"
                            min={0}
                            value={editValue}
                            onChange={(v) => setEditValue(v ?? 0)}
                            className="!w-[70px] text-xs"
                          />
                          <AppButton
                            size="small"
                            type="text"
                            className="!p-1 !text-green-500"
                            icon={<FaCheck className="text-[10px]" />}
                            onClick={() => handleInlineSave(r)}
                          />
                          <AppButton
                            size="small"
                            type="text"
                            className="!p-1 !text-gray-400"
                            icon={<FaTimes className="text-[10px]" />}
                            onClick={() => setEditingId(null)}
                          />
                        </div>
                      ) : (
                        <span
                          className="text-xs font-bold text-blue-600"
                          onClick={() => {
                            setEditingId(r.id);
                            setEditValue(r.quantity);
                          }}
                        >
                          {Number(r.quantity).toLocaleString('vi-VN')}
                        </span>
                      )}
                      <Popconfirm
                        title="Xóa?"
                        onConfirm={() => deleteRecord(r.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <FaTrash className="cursor-pointer text-[10px] text-red-400" />
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Batch table columns ────────────────────────────────────
  const batchColumns: TableColumnsType<BatchGroup> = [
    {
      title: 'STT',
      align: 'center',
      width: '5%',
      render: (_, __, index) => (
        <span className="font-mono text-xs text-gray-400">{index + 1}</span>
      )
    },
    {
      title: 'Ngày xuất hàng',
      key: 'date',
      dataIndex: 'date',
      align: 'center',
      width: '11%',
      render: (value) => (
        <Tag color="blue" bordered={false}>
          {formatImportDate(value)}
        </Tag>
      )
    },
    {
      title: 'Tên file',
      key: 'fileName',
      dataIndex: 'fileName',
      ellipsis: true,
      width: '16%',
      render: (value: string) =>
        value ? (
          <span className="block truncate text-xs text-gray-600 dark:text-gray-300">
            {value}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )
    },
    {
      title: 'Tổng SP',
      key: 'productCount',
      dataIndex: 'productCount',
      align: 'center',
      width: '8%',
      render: (value) => (
        <Tag color="green" bordered={false}>
          {value} SP
        </Tag>
      )
    },
    {
      title: 'Tổng SL',
      key: 'totalQuantity',
      dataIndex: 'totalQuantity',
      align: 'center',
      width: '10%',
      render: (value) => (
        <span className="font-semibold text-blue-600">
          {Number(value).toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      title: 'Thời gian',
      key: 'createdAt',
      dataIndex: 'createdAt',
      align: 'center',
      width: '12%',
      render: (text) =>
        text ? (
          <div className="text-center leading-tight">
            <div className="text-sm">{dayjs(text).format('DD-MM-YYYY')}</div>
            <div className="text-[11px] text-gray-400">
              {dayjs(text).format('HH:mm:ss')}
            </div>
          </div>
        ) : (
          <span className="text-gray-300">—</span>
        )
    },
    {
      title: 'Người nhập',
      key: 'employee',
      dataIndex: 'employeeName',
      align: 'center',
      ellipsis: true,
      width: '14%',
      render: (value) => (
        <span className="block truncate text-sm text-gray-600 dark:text-gray-300">
          {value}
        </span>
      )
    },
    {
      title: '',
      key: 'action',
      align: 'center',
      width: '6%',
      render: (_, record) => {
        const hasBatchId =
          record.batchId && !record.batchId.startsWith('no-batch-');
        if (!hasBatchId && record.records.length === 1) {
          return (
            <Popconfirm
              title={`Xóa "${record.records[0].product?.name}"?`}
              onConfirm={(e) => {
                e?.stopPropagation();
                deleteRecord(record.records[0].id);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <AppButton
                size="small"
                type="text"
                danger
                icon={<FaTrash />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          );
        }
        if (!hasBatchId) return null;

        return (
          <Popconfirm
            title="Xóa toàn bộ file?"
            description={
              <span className="text-xs">
                {record.productCount} SP · Tổng{' '}
                {Number(record.totalQuantity).toLocaleString('vi-VN')}
              </span>
            }
            onConfirm={(e) => {
              e?.stopPropagation();
              deleteBatch(record.batchId);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: isDeletingBatch }}
          >
            <AppButton
              size="small"
              type="text"
              danger
              icon={<FaTrash />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        );
      }
    },
    {
      title: 'Ghi chú',
      key: 'note',
      dataIndex: 'note',
      ellipsis: true,
      width: '18%',
      render: (value: string) =>
        value ? (
          <span
            title={value}
            className="block truncate text-xs text-amber-700 dark:text-amber-300"
          >
            {value}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )
    }
  ];

  // ── Batch table props ──────────────────────────────────────
  const batchTableProps: TableProps<BatchGroup> = {
    ...(customTableProps as unknown as TableProps<BatchGroup>),
    columns: batchColumns,
    rowKey: 'batchId',
    dataSource: batchGroups,
    loading: isLoadingHistory,
    tableLayout: 'fixed',
    pagination: false,
    onRow: () => ({ style: { cursor: 'pointer' } }),
    expandable: {
      expandRowByClick: true,
      showExpandColumn: false,
      expandedRowRender: (record) => (
        <div className="-mx-2 rounded-lg border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
          {record.note && (
            <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <span className="font-semibold">Ghi chú: </span>
              <span className="break-words whitespace-pre-wrap">
                {record.note}
              </span>
            </div>
          )}
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
              <span>Sản phẩm</span>
              <span>Số lượng</span>
            </div>
            <div
              className="grid auto-cols-fr grid-flow-col gap-2 overflow-x-auto"
              style={{
                gridTemplateRows: `repeat(${Math.max(
                  1,
                  Math.ceil(record.records.length / 4)
                )}, minmax(0, auto))`
              }}
            >
              {record.records.map((r, i) => (
                <div
                  key={r.id}
                  className="flex min-h-12 items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 transition-colors hover:border-blue-100 hover:bg-blue-50/30 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/20"
                >
                  <span className="w-6 shrink-0 font-mono text-xs text-gray-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 truncate font-medium text-gray-700 dark:text-gray-200">
                    {r.product?.name || '—'}
                  </div>
                  <div
                    className="shrink-0 text-right"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingId(r.id);
                      setEditValue(r.quantity);
                    }}
                  >
                    {editingId === r.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <InputNumber
                          size="small"
                          min={0}
                          value={editValue}
                          onChange={(v) => setEditValue(v ?? 0)}
                          onPressEnter={(e) => {
                            e.stopPropagation();
                            handleInlineSave(r);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="!w-[90px]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <AppButton
                          size="small"
                          type="text"
                          className="!text-green-500"
                          icon={<FaCheck className="text-[10px]" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInlineSave(r);
                          }}
                        />
                        <AppButton
                          size="small"
                          type="text"
                          className="!text-gray-400"
                          icon={<FaTimes className="text-[10px]" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                        />
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer rounded px-2 py-0.5 font-semibold text-blue-600 tabular-nums transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Double-click để sửa"
                      >
                        {Number(r.quantity).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <Popconfirm
                    title={`Xóa "${r.product?.name}"?`}
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      deleteRecord(r.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <AppButton
                      size="small"
                      type="text"
                      danger
                      icon={<FaTrash className="text-[11px]" />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-3 rounded-lg bg-gray-50/70 px-3 py-2 text-sm whitespace-nowrap dark:bg-gray-800/50">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Tổng cộng
              </span>
              <span className="min-w-[96px] text-right font-bold text-blue-700 tabular-nums">
                {Number(record.totalQuantity).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        </div>
      ),
      rowExpandable: (record) => record.records.length > 0
    }
  };

  const renderExportPurposeContent = (
    purposeGroup: ExportPurposeGroup,
    showHeader = true
  ) => (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex flex-wrap items-center gap-2">
          <Tag color={purposeGroup.color} className="!m-0 font-semibold">
            {purposeGroup.label}
          </Tag>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {purposeGroup.batchCount} file · {purposeGroup.productCount} SP
          </span>
        </div>
      )}
      {purposeGroup.batches.length === 0 ? (
        <Empty description="Không có lịch sử" />
      ) : isMobile ? (
        renderMobileBatchGroup(purposeGroup.batches)
      ) : (
        <Table<BatchGroup>
          {...batchTableProps}
          dataSource={purposeGroup.batches}
        />
      )}
    </div>
  );

  const renderFileTypeSection = (ftGroup: FileTypeGroup) => {
    const style =
      FILE_TYPE_SECTION_STYLE[ftGroup.fileType] || FILE_TYPE_SECTION_STYLE.Khác;

    return (
      <section
        className={`overflow-hidden rounded-lg border bg-white dark:bg-gray-900 ${style.section}`}
      >
        <div
          className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 ${style.header}`}
        >
          <Tag
            color={FILE_TYPE_CONFIG[ftGroup.fileType]?.tagColor || 'default'}
            className="!m-0 font-semibold"
          >
            {ftGroup.fileType}
          </Tag>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {ftGroup.batchCount} file · {ftGroup.productCount} SP · Tổng{' '}
            {ftGroup.totalQuantity.toLocaleString('vi-VN')}
          </span>
        </div>
        <div className="space-y-4 p-3">
          {ftGroup.exportPurposeGroups.map((purposeGroup) => (
            <div key={purposeGroup.key}>
              {renderExportPurposeContent(purposeGroup)}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderImportDateSection = (group: ImportDateGroup) => (
    <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm dark:border-blue-900/60 dark:bg-gray-900">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/90 px-3 py-2 backdrop-blur dark:border-blue-900/60 dark:bg-blue-950/60">
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          Ngày xuất hàng {group.label}
        </span>
        <Tag color="cyan" className="!m-0">
          {group.batchCount} file
        </Tag>
        <Tag color="green" className="!m-0">
          {group.productCount} SP
        </Tag>
        <Tag color="blue" className="!m-0">
          Tổng {group.totalQuantity.toLocaleString('vi-VN')}
        </Tag>
      </div>
      <div className="space-y-4 p-3">
        {group.fileTypeGroups.map((ftGroup) => (
          <div key={ftGroup.fileType}>{renderFileTypeSection(ftGroup)}</div>
        ))}
      </div>
    </section>
  );

  const renderAllFilesSection = () => (
    <section className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Tất cả file PO đã nhập
        </span>
        <Tag color="cyan" className="!m-0">
          {batchGroups.length} file
        </Tag>
        <Tag color="green" className="!m-0">
          {filteredHistoryData.length} SP
        </Tag>
        <Tag color="blue" className="!m-0">
          Tổng {totalExportQuantity.toLocaleString('vi-VN')}
        </Tag>
      </div>
      <div className="p-3">
        {isMobile ? (
          renderMobileBatchGroup(batchGroups)
        ) : (
          <Table<BatchGroup> {...batchTableProps} dataSource={batchGroups} />
        )}
      </div>
    </section>
  );

  const historyTabItems: TabsProps['items'] = [
    {
      key: 'by-export-date',
      label: 'Theo ngày xuất',
      children:
        importDateGroups.length === 0 && !isLoadingHistory ? (
          <Empty description="Không có lịch sử" />
        ) : (
          selectedImportDateGroup &&
          renderImportDateSection(selectedImportDateGroup)
        )
    },
    {
      key: 'all-files',
      label: 'Tất cả file PO',
      children:
        batchGroups.length === 0 && !isLoadingHistory ? (
          <Empty description="Không có file PO" />
        ) : (
          renderAllFilesSection()
        )
    }
  ];

  // ── Form props ─────────────────────────────────────────────
  const formProps: FormProps<FormFields> = {
    ...customFormProps,
    form,
    onFinish: async (values) => {
      values.date = date?.format('YYYY-MM-DD') || '';
      const productQuantities = Object.entries(values)
        .filter(([key, val]) => key.startsWith('product_') && val > 0)
        .map(([key, val]) => ({
          productId: key.split('_')[1],
          quantity: val
        }));
      await updatePurchaseOrder({
        date: values.date,
        products: productQuantities
      });
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setDate(undefined);
    setSearchText('');
    setSelectedImportDateKey(undefined);
    setHistoryViewTab('by-export-date');
    onClose();
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600">
            <IconHistory />
          </span>
          <div>
            <div className="text-base font-semibold">
              Lịch sử nhập sản lượng
            </div>
            <div className="text-xs font-normal text-gray-400">
              Click vào dòng để xem chi tiết sản phẩm
            </div>
          </div>
        </div>
      }
      open={open}
      onClose={handleCancel}
      width="100%"
      rootClassName="po-history-readable-drawer"
      destroyOnClose
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── Sticky Filter Bar ──────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white p-4 sm:px-6 sm:py-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
            <DatePicker
              format="DD/MM/YYYY"
              picker="month"
              value={month}
              size={isMobile ? 'small' : 'middle'}
              className="!h-10 !w-full !rounded-lg sm:!w-[140px]"
              placeholder="Chọn tháng"
              onChange={(d) => {
                setMonth(d || dayjs());
                setDate(undefined);
                setSelectedImportDateKey(undefined);
              }}
            />
            {historyViewTab === 'by-export-date' && (
              <Select
                value={selectedImportDateKey}
                disabled={importDateGroups.length === 0}
                placeholder="Chọn ngày xuất hàng"
                size={isMobile ? 'small' : 'middle'}
                className="!h-10 !w-full sm:!w-[230px]"
                onChange={setSelectedImportDateKey}
                options={importDateGroups.map((group) => ({
                  value: group.key,
                  label: `${group.label} · ${group.batchCount} file`
                }))}
              />
            )}
            <AppSearchInput
              placeholder="Tìm sản phẩm hoặc tên file..."
              className="!w-full sm:!w-[300px]"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          {batchGroups.length > 0 && (
            <div className="flex w-full flex-wrap items-center justify-start gap-3 lg:w-auto lg:justify-end">
              <span className="text-xs font-medium text-gray-400">
                {importDateGroups.length} ngày xuất hàng · {batchGroups.length}{' '}
                file · {filteredHistoryData.length} sản phẩm ·{' '}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  Tổng SL {totalExportQuantity.toLocaleString('vi-VN')}
                </span>
              </span>
              <Popconfirm
                title="Xóa tất cả PO?"
                description="Thao tác này sẽ xóa toàn bộ dữ liệu PO và cập nhật lại tổng PO."
                onConfirm={() => deleteAll()}
                okText="Xóa tất cả"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: isDeletingAll }}
              >
                <AppButton
                  tone="danger"
                  size={isMobile ? 'small' : 'middle'}
                  icon={<FaTrash />}
                  loading={isDeletingAll}
                  className="!h-10"
                >
                  Xóa tất cả
                </AppButton>
              </Popconfirm>
            </div>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:px-6">
          {!date ? (
            <>
              <Spin spinning={isLoadingHistory}>
                <Tabs
                  activeKey={historyViewTab}
                  items={historyTabItems}
                  onChange={setHistoryViewTab}
                  size={isMobile ? 'small' : 'middle'}
                />
              </Spin>
              {/*
                isMobile ? (
              <Spin spinning={isLoadingHistory}>
                {batchGroups.length === 0 && !isLoadingHistory ? (
                  <Empty description="Không có lịch sử" />
                ) : (
                  <div className="flex flex-col gap-4">
                    {importDateGroups.map((group) => (
                      <div key={group.key} className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Ngày nhập {group.label}
                          </span>
                          <Tag color="cyan" className="!m-0">
                            {group.batchCount} file
                          </Tag>
                          <Tag color="green" className="!m-0">
                            {group.productCount} SP
                          </Tag>
                          <Tag color="blue" className="!m-0">
                            {group.totalQuantity.toLocaleString('vi-VN')}
                          </Tag>
                        </div>
                        {group.batches.map((batch, index) => {
                          const hasBatchId =
                            batch.batchId &&
                            !batch.batchId.startsWith('no-batch-');
                          const isExpanded = expandedBatchId === batch.batchId;
                          return (
                            <div
                              key={batch.batchId}
                              className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                              <div className="flex items-start justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                                    {index + 1}
                                  </span>
                                  <div className="text-sm font-semibold text-gray-800 dark:text-white">
                                    {batch.date}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-gray-400">
                                    Thời gian
                                  </div>
                                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {batch.createdAt
                                      ? dayjs(batch.createdAt).format(
                                          'HH:mm:ss'
                                        )
                                      : '—'}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
                                  <div className="text-[10px] text-gray-500">
                                    Người nhập
                                  </div>
                                  <div className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {batch.employeeName}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
                                  <div className="text-[10px] text-gray-500">
                                    Tên file
                                  </div>
                                  <div className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {batch.fileName || '—'}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-green-50 p-2 dark:bg-green-900/20">
                                  <div className="text-[10px] text-green-600 dark:text-green-400">
                                    Tổng sản phẩm
                                  </div>
                                  <div className="font-bold text-green-700 dark:text-green-300">
                                    {batch.productCount} SP
                                  </div>
                                </div>
                                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                                  <div className="text-[10px] text-blue-600 dark:text-blue-400">
                                    Tổng số lượng
                                  </div>
                                  <div className="font-bold text-blue-700 dark:text-blue-300">
                                    {Number(batch.totalQuantity).toLocaleString(
                                      'vi-VN'
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 flex items-center justify-between">
                                <AppButton
                                  type="text"
                                  size="small"
                                  className="text-xs !text-blue-500"
                                  icon={
                                    isExpanded ? (
                                      <FaChevronUp />
                                    ) : (
                                      <FaChevronDown />
                                    )
                                  }
                                  onClick={() =>
                                    setExpandedBatchId(
                                      isExpanded ? null : batch.batchId
                                    )
                                  }
                                >
                                  {isExpanded ? 'Thu gọn' : 'Xem chi tiết SP'}
                                </AppButton>
                                {hasBatchId ? (
                                  <Popconfirm
                                    title="Xóa toàn bộ file?"
                                    onConfirm={(e) => {
                                      e?.stopPropagation();
                                      deleteBatch(batch.batchId);
                                    }}
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    okButtonProps={{
                                      danger: true,
                                      loading: isDeletingBatch
                                    }}
                                  >
                                    <AppButton
                                      size="small"
                                      type="text"
                                      danger
                                      icon={<FaTrash />}
                                    />
                                  </Popconfirm>
                                ) : (
                                  // handle single isolated item if no batch
                                  batch.records.length === 1 && (
                                    <Popconfirm
                                      title={`Xóa "${batch.records[0].product?.name}"?`}
                                      onConfirm={(e) => {
                                        e?.stopPropagation();
                                        deleteRecord(batch.records[0].id);
                                      }}
                                      okText="Xóa"
                                      cancelText="Hủy"
                                      okButtonProps={{ danger: true }}
                                    >
                                      <AppButton
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<FaTrash />}
                                      />
                                    </Popconfirm>
                                  )
                                )}
                              </div>

                              Expanded detail list
                              {isExpanded && batch.records.length > 0 && (
                                <div className="mt-2 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                                  {batch.records.map((r, i) => (
                                    <div
                                      key={r.id}
                                      className="flex items-center justify-between border-b border-gray-50 p-2 last:border-0 dark:border-gray-800"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                                          {i + 1}. {r.product?.name || '—'}
                                        </div>
                                      </div>
                                      <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                                        {editingId === r.id ? (
                                          <div className="flex items-center gap-1">
                                            <InputNumber
                                              size="small"
                                              min={0}
                                              value={editValue}
                                              onChange={(v) =>
                                                setEditValue(v ?? 0)
                                              }
                                              className="!w-[70px] text-xs"
                                            />
                                            <AppButton
                                              size="small"
                                              type="text"
                                              className="!p-1 !text-green-500"
                                              icon={
                                                <FaCheck className="text-[10px]" />
                                              }
                                              onClick={() =>
                                                handleInlineSave(r)
                                              }
                                            />
                                            <AppButton
                                              size="small"
                                              type="text"
                                              className="!p-1 !text-gray-400"
                                              icon={
                                                <FaTimes className="text-[10px]" />
                                              }
                                              onClick={() => setEditingId(null)}
                                            />
                                          </div>
                                        ) : (
                                          <span
                                            className="text-xs font-bold text-blue-600"
                                            onClick={() => {
                                              setEditingId(r.id);
                                              setEditValue(r.quantity);
                                            }}
                                          >
                                            {Number(r.quantity).toLocaleString(
                                              'vi-VN'
                                            )}
                                          </span>
                                        )}
                                        <Popconfirm
                                          title="Xóa?"
                                          onConfirm={() => deleteRecord(r.id)}
                                          okText="Xóa"
                                          cancelText="Hủy"
                                          okButtonProps={{ danger: true }}
                                        >
                                          <FaTrash className="cursor-pointer text-[10px] text-red-400" />
                                        </Popconfirm>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </Spin>
            ) : (
              <Spin spinning={isLoadingHistory}>
                {importDateGroups.length === 0 && !isLoadingHistory ? (
                  <Empty description="Không có lịch sử" />
                ) : (
                  <div className="space-y-5">
                    {importDateGroups.map((group) => (
                      <section
                        key={group.key}
                        className="overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-blue-50/60 px-4 py-3 dark:border-gray-700 dark:bg-blue-950/20">
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Ngày nhập {group.label}
                          </span>
                          <Tag color="cyan" className="!m-0">
                            {group.batchCount} file
                          </Tag>
                          <Tag color="green" className="!m-0">
                            {group.productCount} SP
                          </Tag>
                          <Tag color="blue" className="!m-0">
                            Tổng {group.totalQuantity.toLocaleString('vi-VN')}
                          </Tag>
                        </div>
                        <Table<BatchGroup>
                          {...batchTableProps}
                          dataSource={group.batches}
                        />
                      </section>
                    ))}
                  </div>
                )}
              </Spin>
            */}
            </>
          ) : (
            <Spin spinning={isLoadingProducts}>
              <Form<FormFields> {...formProps}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                  {filteredProductList.map((product) => (
                    <Form.Item<FormFields>
                      key={`product_${product.id}_${date?.format('YYYY-MM-DD')}`}
                      label={
                        <div className="font-semibold">{product.name}</div>
                      }
                      name={`product_${product.id}_${date?.format('YYYY-MM-DD')}`}
                      initialValue={product.daily_quantities_po?.[0]?.quantity}
                      rules={[
                        {
                          type: 'number',
                          min: 0,
                          message: 'Số lượng phải lớn hơn hoặc bằng 0'
                        }
                      ]}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        placeholder="Nhập số lượng"
                      />
                    </Form.Item>
                  ))}
                </div>
                {filteredProductList.length > 0 && (
                  <Form.Item>
                    <AppButton
                      tone="primary"
                      loading={isPending}
                      htmlType="submit"
                    >
                      Cập nhật
                    </AppButton>
                  </Form.Item>
                )}
              </Form>
            </Spin>
          )}
        </div>
      </div>
    </Drawer>
  );
};
