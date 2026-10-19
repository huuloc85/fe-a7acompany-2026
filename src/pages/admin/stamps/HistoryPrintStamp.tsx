import { QueryParams } from '@/types/queryParams';
import {
  ActionGroup,
  DeleteButton,
  PrintButton
} from '@components/common/ActionButtons';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import {
  checkDuplicateStamps,
  deleteStampHistory,
  getStampHistory,
  HistoryPrintStampType
} from '@services/StampService';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Route } from '@routes/_authenticated/stamps/history';
import {
  Button,
  DatePicker,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Spin,
  Table,
  TableColumnsType,
  TableProps,
  Tag,
  Input,
  message
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState, useEffect, useRef } from 'react';
import {
  FaCalendarAlt,
  FaClock,
  FaExchangeAlt,
  FaCheckCircle,
  FaSearch,
  FaTags
} from 'react-icons/fa';
import { PrintBagStamp } from '@components/print/PrintBagStamp';
import { PrintBoxStamp } from '@components/print/PrintBoxStamp';
import { RejectModal } from './RejectModal';
import { useIsMobile } from '@hooks/useIsMobile';
import { useAuth } from '@hooks/useAuth';
import { isAllowRole } from '@utils/authUtil';

export default function HistoryPrintStamp() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const canDeleteStampHistory = isAllowRole(user, ['super admin']);
  const [lotDate, setLotDate] = useState<Dayjs | null>(null);
  const [createdDate, setCreatedDate] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 50,
    include: ['employee', 'manager', 'product'],
    'filter[created_at]': dayjs().format('YYYY-MM-DD')
  });
  const [selectedRecord, setSelectedRecord] =
    useState<HistoryPrintStampType | null>(null);
  const [deletingStampId, setDeletingStampId] = useState<string | null>(null);
  const printPreviewRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get search params để highlight dòng cụ thể
  const { highlightId } = Route.useSearch();

  const queryResult = useQuery({
    queryKey: ['historyPrintStamp', params],
    queryFn: async () => await getStampHistory(params),
    placeholderData: keepPreviousData,
    refetchInterval: 5000 // Tự động load lại data mỗi 5 giây
  });

  const { data: response } = queryResult;

  const dataSource = response?.data;
  const hasRowActions = (dataSource || []).some(
    (record) =>
      record.status === 'pending' ||
      (record.status === 'rejected' && canDeleteStampHistory)
  );
  const pagination = {
    current: response?.current_page,
    total: response?.total,
    pageSize: response?.per_page
  };

  // Mutation to check duplicate stamps
  const { mutate: checkDuplicate } = useMutation({
    mutationKey: ['checkDuplicateStamps'],
    mutationFn: checkDuplicateStamps,
    onSuccess: (data, variables) => {
      const record = variables.record;
      if (!record) return;

      if (data.isDuplicate && data.duplicates && data.duplicates.length > 0) {
        const duplicateInfo = data.duplicates
          .map(
            (dup: { overlappingStamps: number[] }) =>
              `Tem số: ${dup.overlappingStamps.join(', ')}`
          )
          .join('\n');

        Modal.confirm({
          title: 'Cảnh báo: Phát hiện tem trùng lặp',
          content: (
            <div>
              <pre className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-sm">
                {duplicateInfo}
              </pre>
              <p className="mt-2 font-semibold text-red-600">
                Bạn có chắc chắn muốn tiếp tục in các tem này không?
              </p>
            </div>
          ),
          okText: 'Tiếp tục in',
          cancelText: 'Hủy',
          okButtonProps: { danger: true },
          onOk: () => {
            setSelectedRecord(record);
            setTimeout(() => {
              if (printPreviewRef.current) {
                printPreviewRef.current.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
                printPreviewRef.current.focus({ preventScroll: true });
              }
            }, 100);
          }
        });
      } else {
        setSelectedRecord(record);
        setTimeout(() => {
          if (printPreviewRef.current) {
            printPreviewRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            printPreviewRef.current.focus({ preventScroll: true });
          }
        }, 100);
      }
    },
    onError: (error) => {
      console.error('Error checking duplicates:', error);
      Modal.error({
        title: 'Lỗi',
        content: 'Lỗi khi kiểm tra tem trùng lặp. Vui lòng thử lại.'
      });
    }
  });

  // Function to handle print button click
  const handlePrintClick = (record: HistoryPrintStampType) => {
    if (
      !record.product_id ||
      !record.date ||
      !record.shift ||
      !record.binStart ||
      !record.binCount ||
      !record.type
    ) {
      Modal.error({
        title: 'Lỗi',
        content: 'Thiếu thông tin cần thiết để kiểm tra tem trùng lặp.'
      });
      return;
    }

    const requestData = {
      product_id: String(record.product_id),
      date: dayjs(record.date).format('YYYY-MM-DD'),
      shift: record.shift,
      binStart: String(record.binStart),
      binCount: Number(record.binCount),
      type: record.type,
      record: record
    };

    checkDuplicate(requestData);
  };

  const handleDeleteClick = async (record: HistoryPrintStampType) => {
    if (!canDeleteStampHistory) return;

    setDeletingStampId(record.id);
    try {
      await deleteStampHistory(record.id);
      message.success('Xóa lịch sử in tem thành công');
      if (selectedRecord?.id === record.id) {
        setSelectedRecord(null);
      }
      await queryResult.refetch();
    } catch (error) {
      console.error('Error deleting stamp history:', error);
      message.error('Xóa lịch sử in tem thất bại. Vui lòng thử lại.');
    } finally {
      setDeletingStampId(null);
    }
  };

  // Keyboard shortcuts cho phím Enter:
  // - Khi chưa chọn -> tự động focus/chọn bản ghi "Chờ in" đầu tiên
  // - Khi có bản ghi được chọn (hiện preview) -> kích hoạt in
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      const tag = activeElement?.tagName;

      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Enter') {
        // Ant Design modal "OK" button sẽ tự nhận phím Enter (nếu đang focus)
        if (tag === 'BUTTON') return;

        if (selectedRecord) {
          e.preventDefault();
          // Mở hộp thoại in thông qua trigger sự kiện Ctrl+P cho usePrintShortcut bắt
          // Điều này giúp lưu trạng thái in đúng cách giống như ấn nút "Print" trên UI
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: true,
              bubbles: true
            })
          );
        } else {
          // Lần 1: tìm bản ghi "pending" đầu tiên trên trang hiện tại
          const firstPendingRecord = dataSource?.find(
            (record) => record.status === 'pending'
          );
          if (firstPendingRecord) {
            e.preventDefault();
            handlePrintClick(firstPendingRecord);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecord, dataSource]); // Lắng nghe dataSource để lấy dòng đầu tiên nếu thay đổi

  // Effect để scroll đến dòng được highlight
  useEffect(() => {
    if (highlightId && dataSource) {
      const timer = setTimeout(() => {
        const element = document.querySelector(
          `[data-row-key*="${highlightId}"]`
        );
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [highlightId, dataSource]);

  const columns: TableColumnsType<HistoryPrintStampType> = [
    {
      title: 'STT',
      rowScope: 'row',
      width: 60,
      align: 'center',
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
          {value || <span className="text-gray-400 italic">Chưa có</span>}
        </span>
      )
    },
    {
      title: 'NV gửi',
      key: 'name',
      dataIndex: ['employee', 'name'],
      minWidth: 200,
      render: (value) => (
        <span className="font-medium text-gray-800 dark:text-white/90">
          {value || (
            <span className="text-gray-400 italic">Chưa có thông tin</span>
          )}
        </span>
      )
    },
    {
      title: 'Số Lot',
      key: 'lot_number',
      dataIndex: ['date'],
      minWidth: 100,
      align: 'center',
      render: (value) => (
        <span className="text-sm">{dayjs(value).format('DD-MM-YYYY')}</span>
      )
    },
    {
      title: 'Ca',
      key: 'shift',
      dataIndex: 'shift',
      align: 'center',
      minWidth: 80,
      render: (value) => {
        if (value === 1) return <Tag color="blue">Ca 1</Tag>;
        if (value === 2) return <Tag color="purple">Ca 2</Tag>;
        return <span className="text-gray-300">—</span>;
      }
    },
    {
      title: 'SL in',
      key: 'print_quantity',
      dataIndex: 'binCount',
      align: 'center',
      minWidth: 80,
      render: (value) => (
        <span className="font-semibold text-blue-600">{value}</span>
      )
    },
    {
      title: 'Tem bắt đầu',
      key: 'bin_start',
      dataIndex: 'binStart',
      align: 'center',
      minWidth: 100,
      render: (value) => (
        <Tag color="geekblue" className="!font-mono !text-xs">
          {value}
        </Tag>
      )
    },
    {
      title: 'Loại tem',
      key: 'stamp_type',
      dataIndex: 'type',
      render: (value) => {
        if (value === 'bag') {
          return (
            <Tag color="volcano" className="!font-bold">
              TEM BỊCH
            </Tag>
          );
        }
        if (value === 'box') {
          return (
            <Tag color="cyan" className="!font-bold">
              TEM THÙNG
            </Tag>
          );
        }
        return <Tag>{value}</Tag>;
      }
    },
    {
      title: 'Mục đích',
      key: 'purpose',
      dataIndex: 'purpose',
      render: (value) => {
        if (!value) return <span className="text-gray-300">—</span>;
        const purposeMap: Record<string, { label: string; color: string }> = {
          new: { label: 'In mới', color: 'green' },
          additional: { label: 'In thêm', color: 'blue' },
          reprint: { label: 'In lại', color: 'orange' }
        };
        const item = purposeMap[value];
        return item ? (
          <Tag color={item.color}>{item.label}</Tag>
        ) : (
          <Tag>{value}</Tag>
        );
      }
    },
    {
      title: 'Ngày gửi',
      key: 'print_day',
      dataIndex: 'created_at',
      align: 'center',
      render: (value) => (
        <div className="text-center">
          <div className="text-sm">{dayjs(value).format('DD/MM/YYYY')}</div>
          <div className="text-xs text-gray-400">
            {dayjs(value).format('HH:mm:ss')}
          </div>
        </div>
      )
    },
    {
      title: 'NV in',
      key: 'manager_info',
      align: 'center',
      render: (_: unknown, record: HistoryPrintStampType) => {
        const name = record.manager?.name;
        const time = record.manager_time;
        if (!name && !time) return <span className="text-gray-300">—</span>;
        return (
          <div className="text-center">
            {name && <div className="text-sm">{name}</div>}
            {time && (
              <Tag color="green" className="!mt-0.5 !text-xs">
                {dayjs(time, 'HH:mm:ss').format('HH:mm')}
              </Tag>
            )}
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      dataIndex: 'status',
      align: 'center',
      minWidth: 100,
      render: (value) => {
        if (value === 'pending') {
          return (
            <Tag color="yellow-inverse" className="font-bold uppercase">
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
              Đã hủy
            </Tag>
          );
        }
        return value;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      minWidth: 100,
      render: (_, record) => {
        if (record.status === 'approve') {
          return <span className="text-gray-300">—</span>;
        }

        if (record.status === 'rejected') {
          if (!canDeleteStampHistory) {
            return <span className="text-gray-300">—</span>;
          }

          return (
            <ActionGroup>
              <Popconfirm
                title="Xóa lịch sử in tem?"
                description="Dữ liệu đã xóa không thể khôi phục."
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteClick(record)}
              >
                <DeleteButton loading={deletingStampId === record.id} />
              </Popconfirm>
            </ActionGroup>
          );
        }
        return (
          <ActionGroup>
            <PrintButton onClick={() => handlePrintClick(record)} />
            <RejectModal stampId={record.id} />
            {canDeleteStampHistory && (
              <Popconfirm
                title="Xóa lịch sử in tem?"
                description="Dữ liệu đã xóa không thể khôi phục."
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteClick(record)}
              >
                <DeleteButton loading={deletingStampId === record.id} />
              </Popconfirm>
            )}
          </ActionGroup>
        );
      }
    }
  ];
  const visibleColumns = hasRowActions
    ? columns
    : columns.filter((column) => column.key !== 'action');

  const tableProps: TableProps<HistoryPrintStampType> = {
    ...(customTableProps as unknown as TableProps<HistoryPrintStampType>),
    rowKey: (record) =>
      ['stamp', 'history', record.id, record.employee_id, record.date].join(
        '-'
      ),
    columns: visibleColumns,
    dataSource: dataSource,
    loading: queryResult.isLoading,
    rowClassName: (record) => {
      return record.id === highlightId
        ? 'bg-yellow-100 border-l-4 border-l-yellow-500 shadow-md'
        : '';
    },
    pagination: {
      ...customTableProps.pagination,
      current: params.page,
      pageSize: params.limit,
      total: pagination.total,
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
      <ComponentCard title="Lịch sử in tem">
        <div className="space-y-5">
          {/* ── Action Bar ── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton
              isLoading={queryResult.isFetching}
              refresh={queryResult.refetch}
            />
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-xs text-gray-500">
                {lotDate
                  ? `🏷️ Lot: ${lotDate.format('DD/MM/YYYY')}`
                  : createdDate
                    ? `📅 ${createdDate.format('DD/MM/YYYY')}`
                    : '📅 Tất cả'}
              </span>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaSearch className="mr-1 inline-block text-indigo-500" />
                  Sản phẩm
                </label>
                <Input
                  prefix={<FaSearch className="text-gray-400" />}
                  placeholder="Tìm tên sản phẩm..."
                  allowClear
                  className="!rounded-lg"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    searchTimeoutRef.current = setTimeout(() => {
                      setParams((prev) => {
                        const newParams: QueryParams = { ...prev, page: 1 };
                        // Xóa các key rác từ phiên bản cũ bị kẹt trong state
                        delete newParams.search;
                        delete newParams['filter[search]'];

                        if (value) {
                          newParams['filter[product.name]'] = value;
                        } else {
                          delete newParams['filter[product.name]'];
                        }
                        return newParams;
                      });
                    }, 500);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaTags className="mr-1 inline-block text-pink-500" />
                  Loại tem
                </label>
                <Select
                  placeholder="Chọn loại tem"
                  options={[
                    { value: 'box', label: 'Tem Thùng' },
                    { value: 'bag', label: 'Tem Bịch' }
                  ]}
                  allowClear
                  className="!rounded-lg"
                  onChange={(value) => {
                    setParams((prev) => {
                      const newParams: QueryParams = { ...prev, page: 1 };
                      if (value) {
                        newParams['filter[type]'] = value;
                      } else {
                        delete newParams['filter[type]'];
                      }
                      return newParams;
                    });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaCalendarAlt className="mr-1 inline-block text-blue-500" />
                  Số Lot
                </label>
                <DatePicker
                  placeholder="Chọn Số Lot"
                  format="DD/MM/YYYY"
                  value={lotDate}
                  allowClear
                  className="!rounded-lg"
                  onChange={(value) => {
                    setLotDate(value);
                    setParams((prev) => {
                      const newParams: QueryParams = { ...prev, page: 1 };
                      if (value) {
                        newParams['filter[date]'] =
                          dayjs(value).format('YYYY-MM-DD');
                        delete newParams['filter[created_at]'];
                        setCreatedDate(null);
                      } else {
                        delete newParams['filter[date]'];
                        if (createdDate) {
                          newParams['filter[created_at]'] =
                            createdDate.format('YYYY-MM-DD');
                        }
                      }
                      return newParams;
                    });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaClock className="mr-1 inline-block text-purple-500" />
                  Ngày gửi
                </label>
                <DatePicker
                  placeholder="Chọn ngày gửi"
                  format="DD/MM/YYYY"
                  value={createdDate}
                  allowClear
                  className="!rounded-lg"
                  onChange={(value) => {
                    setCreatedDate(value);
                    setParams((prev) => {
                      const newParams: QueryParams = { ...prev, page: 1 };
                      if (value) {
                        newParams['filter[created_at]'] =
                          dayjs(value).format('YYYY-MM-DD');
                        delete newParams['filter[date]'];
                        setLotDate(null);
                      } else {
                        delete newParams['filter[created_at]'];
                        if (lotDate) {
                          newParams['filter[date]'] =
                            lotDate.format('YYYY-MM-DD');
                        }
                      }
                      return newParams;
                    });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaExchangeAlt className="mr-1 inline-block text-emerald-500" />
                  Ca làm việc
                </label>
                <Select
                  placeholder="Chọn ca"
                  options={[
                    { value: '1', label: 'Ca 1' },
                    { value: '2', label: 'Ca 2' }
                  ]}
                  allowClear
                  className="!rounded-lg"
                  onChange={(value) => {
                    setParams((prev) => {
                      const newParams: QueryParams = { ...prev, page: 1 };
                      if (value) {
                        newParams['filter[shift]'] = value;
                      } else {
                        delete newParams['filter[shift]'];
                      }
                      return newParams;
                    });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaCheckCircle className="mr-1 inline-block text-orange-500" />
                  Trạng thái
                </label>
                <Select
                  placeholder="Chọn trạng thái"
                  options={[
                    { value: 'pending', label: 'Chờ in' },
                    { value: 'approve', label: 'Đã in' },
                    { value: 'rejected', label: 'Đã hủy' }
                  ]}
                  allowClear
                  className="!rounded-lg"
                  onChange={(value) => {
                    setParams((prev) => {
                      const newParams: QueryParams = { ...prev, page: 1 };
                      if (value) {
                        newParams['filter[status]'] = value;
                      } else {
                        delete newParams['filter[status]'];
                      }
                      return newParams;
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          {isMobile ? (
            <Spin spinning={queryResult.isLoading}>
              <div className="flex flex-col gap-3">
                {(dataSource || []).map((record, index) => {
                  const isHighlighted = record.id === highlightId;
                  return (
                    <div
                      key={`stamp-card-${record.id}`}
                      data-row-key={`stamp-${record.id}`}
                      className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 ${
                        isHighlighted
                          ? 'border-yellow-300 ring-2 ring-yellow-100 dark:border-yellow-600 dark:ring-yellow-900/30'
                          : 'border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {/* Top: index + status */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                            {index +
                              1 +
                              (params.limit ?? 10) * ((params.page ?? 1) - 1)}
                          </span>
                          {record.status === 'pending' && (
                            <Tag
                              color="yellow-inverse"
                              className="font-bold uppercase"
                            >
                              Chờ in
                            </Tag>
                          )}
                          {record.status === 'approve' && (
                            <Tag
                              color="green-inverse"
                              className="font-bold uppercase"
                            >
                              Đã in
                            </Tag>
                          )}
                          {record.status === 'rejected' && (
                            <Tag
                              color="red-inverse"
                              className="font-bold uppercase"
                            >
                              Đã hủy
                            </Tag>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {record.type === 'bag' ? (
                            <Tag color="volcano" className="!m-0 !font-bold">
                              TEM BỊCH
                            </Tag>
                          ) : (
                            <Tag color="cyan" className="!m-0 !font-bold">
                              TEM THÙNG
                            </Tag>
                          )}
                        </div>
                      </div>

                      {/* Product name */}
                      <div className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
                        {record.product?.name || (
                          <span className="text-gray-400 italic">Chưa có</span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="mt-1.5 space-y-1 text-[13px] text-gray-500">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            NV gửi:
                          </span>{' '}
                          {record.employee?.name || 'Chưa có thông tin'}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            Lot: {dayjs(record.date).format('DD-MM-YYYY')}
                          </span>
                          <span>·</span>
                          {record.shift === 1 ? (
                            <Tag color="blue" className="!m-0">
                              Ca 1
                            </Tag>
                          ) : (
                            <Tag color="purple" className="!m-0">
                              Ca 2
                            </Tag>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            SL:{' '}
                            <strong className="text-blue-600">
                              {record.binCount}
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            Bắt đầu:{' '}
                            <Tag
                              color="geekblue"
                              className="!m-0 !font-mono !text-xs"
                            >
                              {record.binStart}
                            </Tag>
                          </span>
                        </div>
                        {record.purpose && (
                          <div>
                            Mục đích:{' '}
                            {record.purpose === 'new' ? (
                              <Tag color="green" className="!m-0">
                                In mới
                              </Tag>
                            ) : record.purpose === 'additional' ? (
                              <Tag color="blue" className="!m-0">
                                In thêm
                              </Tag>
                            ) : record.purpose === 'reprint' ? (
                              <Tag color="orange" className="!m-0">
                                In lại
                              </Tag>
                            ) : (
                              <Tag className="!m-0">{record.purpose}</Tag>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Gửi:{' '}
                          {dayjs(record.created_at).format(
                            'DD/MM/YYYY HH:mm:ss'
                          )}
                          {record.manager?.name && (
                            <span> · NV in: {record.manager.name}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {record.status === 'pending' && (
                        <ActionGroup className="mt-3 !justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
                          <PrintButton
                            size="small"
                            onClick={() => handlePrintClick(record)}
                          />
                          <RejectModal stampId={record.id} />
                          {canDeleteStampHistory && (
                            <Popconfirm
                              title="Xóa lịch sử in tem?"
                              description="Dữ liệu đã xóa không thể khôi phục."
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDeleteClick(record)}
                            >
                              <DeleteButton
                                size="small"
                                loading={deletingStampId === record.id}
                              />
                            </Popconfirm>
                          )}
                        </ActionGroup>
                      )}
                      {record.status === 'rejected' &&
                        canDeleteStampHistory && (
                          <ActionGroup className="mt-3 !justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
                            <Popconfirm
                              title="Xóa lịch sử in tem?"
                              description="Dữ liệu đã xóa không thể khôi phục."
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDeleteClick(record)}
                            >
                              <DeleteButton
                                size="small"
                                loading={deletingStampId === record.id}
                              />
                            </Popconfirm>
                          </ActionGroup>
                        )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Pagination
                  {...customPaginationProps}
                  size="small"
                  current={params.page}
                  pageSize={params.limit}
                  total={pagination.total}
                  onChange={(page, size) => {
                    setParams((prev) => ({ ...prev, page, limit: size }));
                  }}
                />
              </div>
            </Spin>
          ) : (
            <Table {...tableProps} />
          )}
        </div>
      </ComponentCard>

      {/* Print Preview Section */}
      {selectedRecord && (
        <div ref={printPreviewRef} tabIndex={-1} className="mt-8 outline-none">
          <ComponentCard title="Xem trước khi in">
            <div className="space-y-5">
              {/* Print Info Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 dark:border-gray-700 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {selectedRecord.product.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Tag color="blue">
                      NV: {selectedRecord.employee?.name || 'Chưa có thông tin'}
                    </Tag>
                    <Tag color="geekblue">
                      {dayjs(selectedRecord.date).format('DD-MM-YYYY')}
                    </Tag>
                    <Tag color="purple">Ca {selectedRecord.shift}</Tag>
                    <Tag color="cyan">SL: {selectedRecord.binCount}</Tag>
                    {selectedRecord.type === 'box' ||
                    selectedRecord.type === 'Tem Thùng' ? (
                      <Tag color="cyan" className="!font-bold">
                        TEM THÙNG
                      </Tag>
                    ) : (
                      <Tag color="volcano" className="!font-bold">
                        TEM BỊCH
                      </Tag>
                    )}
                    {(() => {
                      const startStr = String(selectedRecord.binStart || '');
                      const count = Number(selectedRecord.binCount || 1);
                      if (startStr.includes(',')) {
                        return <Tag color="green">Tem số: {startStr}</Tag>;
                      }
                      const startNum = parseInt(startStr);
                      if (!isNaN(startNum)) {
                        if (count > 1) {
                          return (
                            <Tag color="green">
                              Tem: {startNum} ➔ {startNum + count - 1}
                            </Tag>
                          );
                        }
                        return <Tag color="green">Tem số: {startNum}</Tag>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <Button
                  color="red"
                  variant="outlined"
                  onClick={() => setSelectedRecord(null)}
                >
                  Đóng
                </Button>
              </div>

              {(selectedRecord.type === 'box' ||
                selectedRecord.type === 'Tem Thùng') && (
                <PrintBoxStamp
                  product={selectedRecord.product}
                  startStamp={selectedRecord.binStart}
                  totalStamp={
                    selectedRecord.binStart &&
                    selectedRecord.binStart.includes(',')
                      ? selectedRecord.binStart
                          .split(',')
                          .filter((item) => item.trim() !== '').length
                      : selectedRecord.binCount
                  }
                  shift={selectedRecord.shift}
                  date={dayjs(selectedRecord.date)}
                  employee_id={selectedRecord.employee_id}
                  stamp_id={selectedRecord.id}
                  onPrintSuccess={() => setSelectedRecord(null)}
                />
              )}

              {(selectedRecord.type === 'bag' ||
                selectedRecord.type === 'Tem Bịch') && (
                <PrintBagStamp
                  product={selectedRecord.product}
                  startStamp={selectedRecord.binStart}
                  totalStamp={
                    selectedRecord.binStart &&
                    selectedRecord.binStart.includes(',')
                      ? selectedRecord.binStart
                          .split(',')
                          .filter((item) => item.trim() !== '').length
                      : selectedRecord.binCount
                  }
                  shift={selectedRecord.shift}
                  date={dayjs(selectedRecord.date)}
                  employee_id={selectedRecord.employee_id}
                  stamp_id={selectedRecord.id}
                  onPrintSuccess={() => setSelectedRecord(null)}
                />
              )}
            </div>
          </ComponentCard>
        </div>
      )}
    </>
  );
}
