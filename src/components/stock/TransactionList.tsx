import AppSearchInput from '@/components/common/AppSearchInput';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Card, Select, Typography, message } from 'antd';

import RefreshButton from '@/components/common/RefreshButton';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';

import { StockTransactionService } from '@/services/StockTransactionService';
import {
  StockTransaction,
  TransactionListParams,
  TransactionListResponse,
  ApiErrorResponse
} from '@/types/stockTransaction.types';

const { Option } = Select;
const { Text } = Typography;

interface TransactionFilters {
  type?: 'in' | 'out';
  search?: string;
  employeeId?: string;
  storageProductId?: number;
}

// Interface cho dữ liệu đã gộp
interface GroupedTransaction {
  id: string; // Unique key for table
  product_code: string;
  product_name: string;
  lot: string;
  barcode: string;
  total_quantity: number; // Tổng số lượng (nhập - xuất)
  in_quantity: number; // Tổng số lượng nhập
  out_quantity: number; // Tổng số lượng xuất
  last_transaction_date: string; // Hoạt động cuối cùng
  transaction_count: number; // Số lượng hoạt động
  employee_names: string[]; // Danh sách nhân viên thực hiện
  current_stock: number; // Tồn kho hiện tại
}

const TransactionList: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<StockTransaction[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});

  const loadAllTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Load all transactions for grouping
      const params: TransactionListParams = {
        page: 1,
        per_page: 100, // Reduced from 10000 to avoid overloading backend
        ...filters
      };

      const response = await StockTransactionService.getTransactions(params);

      if ('success' in response && response.success === false) {
        const errorResponse = response as ApiErrorResponse;
        message.error(errorResponse.message || 'Có lỗi xảy ra khi tải dữ liệu');
        return;
      }

      const transactionResponse = response as TransactionListResponse;
      setAllTransactions(transactionResponse.data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      message.error('Không thể tải danh sách hoạt động');
    } finally {
      setLoading(false);
    }
  }, [filters]); // useCallback dependency

  useEffect(() => {
    loadAllTransactions();
  }, [loadAllTransactions]);

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleTypeChange = (value: 'in' | 'out' | undefined) => {
    setFilters((prev) => ({ ...prev, type: value }));
  };

  const handleRefresh = () => {
    loadAllTransactions();
  };

  // Group transactions by product and lot
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, GroupedTransaction>();

    allTransactions.forEach((transaction) => {
      if (!transaction.storage_product?.product) return;

      const product = transaction.storage_product.product;
      const lot = transaction.storage_product.lot || 'N/A';
      const key = `${product.id}_${lot}`;

      if (groups.has(key)) {
        const existing = groups.get(key)!;
        existing.transaction_count += 1;

        if (transaction.type === 'in') {
          existing.in_quantity += transaction.quantity;
          existing.total_quantity += transaction.quantity;
        } else {
          existing.out_quantity += transaction.quantity;
          existing.total_quantity -= transaction.quantity;
        }

        // Update last transaction date
        if (
          new Date(transaction.created_at) >
          new Date(existing.last_transaction_date)
        ) {
          existing.last_transaction_date = transaction.created_at;
        }

        // Add employee name if not exists
        const employeeName =
          transaction.employee?.name ||
          transaction.employee_id?.toString() ||
          'N/A';
        if (!existing.employee_names.includes(employeeName)) {
          existing.employee_names.push(employeeName);
        }
      } else {
        const inQty = transaction.type === 'in' ? transaction.quantity : 0;
        const outQty = transaction.type === 'out' ? transaction.quantity : 0;

        groups.set(key, {
          id: key,
          product_code: product.code || product.id.toString(),
          product_name: product.name || 'N/A',
          lot: lot,
          barcode: transaction.storage_product.barcode || 'N/A',
          total_quantity:
            transaction.type === 'in'
              ? transaction.quantity
              : -transaction.quantity,
          in_quantity: inQty,
          out_quantity: outQty,
          last_transaction_date: transaction.created_at,
          transaction_count: 1,
          employee_names: [
            transaction.employee?.name ||
              transaction.employee_id?.toString() ||
              'N/A'
          ],
          current_stock:
            transaction.type === 'in'
              ? transaction.quantity
              : -transaction.quantity
        });
      }
    });

    return Array.from(groups.values()).filter((group) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          group.product_name.toLowerCase().includes(searchLower) ||
          group.product_code.toLowerCase().includes(searchLower) ||
          group.lot.toLowerCase().includes(searchLower) ||
          group.barcode.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [allTransactions, filters.search]);

  const columns = [
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 200,
      render: (record: GroupedTransaction) => (
        <div>
          <div>
            <Text strong>{record.product_name}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Code: {record.product_code}
          </Text>
        </div>
      )
    },
    {
      title: 'Lot',
      dataIndex: 'lot',
      key: 'lot',
      width: 100,
      align: 'center' as const,
      render: (lot: string) => <Text code>{lot}</Text>
    },
    {
      title: 'Nhập',
      dataIndex: 'in_quantity',
      key: 'in_quantity',
      width: 60,
      align: 'center' as const,
      render: (qty: number) => <Text style={{ color: '#52c41a' }}>{qty}</Text>
    },
    {
      title: 'Xuất',
      dataIndex: 'out_quantity',
      key: 'out_quantity',
      width: 60,
      align: 'center' as const,
      render: (qty: number) => <Text style={{ color: '#ff4d4f' }}>{qty}</Text>
    },
    {
      title: 'Tồn',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 60,
      align: 'center' as const,
      render: (qty: number) => (
        <Text
          strong
          style={{
            color: qty > 0 ? '#52c41a' : qty < 0 ? '#ff4d4f' : '#666'
          }}
        >
          {qty}
        </Text>
      )
    },
    {
      title: 'Tổng hoạt động',
      dataIndex: 'transaction_count',
      key: 'transaction_count',
      width: 80,
      align: 'center' as const,
      render: (count: number) => <Text type="secondary">{count}</Text>
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employee_names',
      key: 'employee_names',
      width: 120,
      render: (names: string[]) => (
        <Text style={{ fontSize: '11px' }}>
          {names.slice(0, 2).join(', ')}
          {names.length > 2 && ` +${names.length - 2}`}
        </Text>
      )
    },
    {
      title: 'Hoạt động cuối',
      dataIndex: 'last_transaction_date',
      key: 'last_transaction_date',
      width: 140,
      align: 'center' as const,
      render: (date: string) => (
        <div>
          <div>{new Date(date).toLocaleDateString('vi-VN')}</div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(date).toLocaleTimeString('vi-VN')}
          </Text>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card size="small">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <Text strong>Tổng hợp Hoạt động</Text>
            <Text type="secondary" className="ml-2">
              ({groupedTransactions.length} nhóm sản phẩm)
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AppSearchInput
              placeholder="Tìm kiếm..."
              className="!w-full sm:!w-[160px]"
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Select
              placeholder="Loại"
              allowClear
              style={{ width: 80 }}
              value={filters.type}
              onChange={handleTypeChange}
              size="small"
            >
              <Option value="in">Nhập</Option>
              <Option value="out">Xuất</Option>
            </Select>
            <RefreshButton
              refresh={handleRefresh}
              isLoading={loading}
              size="small"
            />
          </div>
        </div>
      </Card>

      {/* Grouped Transaction Table */}
      <Card size="small">
        <Table
          columns={columns}
          dataSource={groupedTransactions}
          rowKey="id"
          loading={loading}
          pagination={{
            ...customPaginationProps,
            showQuickJumper: true,
            size: 'small',
            pageSize: 20
          }}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default TransactionList;
