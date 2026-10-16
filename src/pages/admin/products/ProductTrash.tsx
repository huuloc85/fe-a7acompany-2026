import AppSearchInput from '@/components/common/AppSearchInput';
import { Table, TableColumnsType, TableProps, Select } from 'antd';

import React, { useState } from 'react';

import { ProductType } from '@/types/productType';
import { QueryParams } from '@/types/queryParams';
import RefreshButton from '@components/common/RefreshButton';
import { customTableProps } from '@components/custom/TableProps.custom';
import { ConfirmButton } from '@components/ui/CRUD/ConfirmButton';
import { useCrudList } from '@hooks/useCrudList';
import { ProductModelEnumOptions } from '@schemas/product/productModelEnum.enum';
import { ProductModelSizeEnumOptions } from '@schemas/product/productModelSizeEnum.enum';
import { productService } from '@services/ProductService';
import { debounce } from 'lodash';
import { Modal, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ActionGroup, DeleteButton } from '@components/common/ActionButtons';

interface ForceDeleteButtonProps {
  productId: string;
  productName: string;
  productCode: string;
}

const ForceDeleteButton: React.FC<ForceDeleteButtonProps> = ({
  productId,
  productName
}) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const forceDeleteMutation = useMutation({
    mutationFn: () => productService.forceDelete(productId),
    onSuccess: () => {
      message.success('Xóa vĩnh viễn thành công');
      queryClient.invalidateQueries();
      setOpen(false);
    },
    onError: () => {
      message.error('Xóa vĩnh viễn thất bại');
    }
  });

  return (
    <>
      <DeleteButton
        onClick={() => setOpen(true)}
        loading={forceDeleteMutation.isPending}
        title="Xóa vĩnh viễn"
      >
        {null}
      </DeleteButton>

      <Modal
        title="Xóa sản phẩm"
        loading={forceDeleteMutation.isPending}
        open={open}
        centered
        okButtonProps={{
          loading: forceDeleteMutation.isPending,
          danger: true,
          size: 'middle'
        }}
        okText="Xóa"
        onOk={() => forceDeleteMutation.mutate()}
        cancelButtonProps={{
          size: 'middle'
        }}
        onCancel={() => setOpen(false)}
        cancelText="Hủy"
      >
        <p className="mb-3">
          Bạn có muốn xoá sản phẩm <strong>{productName}</strong> này không?
        </p>
        <p className="text-sm text-red-600">Không thể hoàn tác!</p>
      </Modal>
    </>
  );
};

export default function ProductTrash() {
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 10
  });

  const {
    data: products,
    pagination,
    queryResult: { isLoading, isFetching, refetch }
  } = useCrudList({
    service: productService,
    queryKey: 'products',
    initialFilters: params,
    isTrash: true
  });

  const handleChange: TableProps<ProductType>['onChange'] = (
    _pagination,
    filters,
    sorter
  ) => {
    // Sort
    let sortValue = undefined;
    if (!Array.isArray(sorter) && sorter.order && sorter.field) {
      sortValue = `${sorter.order === 'ascend' ? '' : '-'}${sorter.field}`;
    }

    // Filter
    const newFilters: QueryParams = {};
    Object.entries(filters).forEach(([key, value]) => {
      newFilters[`filter[${key}]`] = value?.toString();
    });
    setParams((prev) => ({
      ...prev,
      ...newFilters,
      sort: sortValue
    }));
  };

  const handleSearch = debounce((value: string) => {
    setParams((prev) => ({
      ...prev,
      'filter[search]': undefined
    }));
    if (!value) {
      return;
    }
    setParams((prev) => ({
      ...prev,
      'filter[search]': value
    }));
  }, 300);

  const columns: TableColumnsType<ProductType> = [
    {
      title: <div className="capitalize">STT</div>,
      rowScope: 'row',
      minWidth: 50,
      align: 'center',
      fixed: 'left',
      render: (_value, _record, index) =>
        index + 1 + (params.limit ?? 10) * ((params.page ?? 1) - 1)
    },
    {
      title: 'Tên sản phẩm',
      fixed: 'left',
      minWidth: 100,
      key: 'name',
      dataIndex: 'name',
      sorter: true,
      filterSearch: true
    },
    {
      title: 'Mã sản phẩm',
      align: 'center',
      minWidth: 100,
      key: 'code',
      dataIndex: 'code',
      sorter: true
    },
    {
      title: 'Kích thước khuôn',
      align: 'center',
      minWidth: 130,
      dataIndex: 'moldSize',
      filters: ProductModelSizeEnumOptions.map((item) => ({
        text: item.label,
        value: item.value
      })),
      filterSearch: true
    },
    {
      title: 'CAV',
      align: 'center',
      minWidth: 100,
      dataIndex: 'CAV',
      sorter: true
    },
    {
      title: 'Mã thùng',
      align: 'center',
      minWidth: 100,
      dataIndex: 'binCode',
      filters: ProductModelEnumOptions.map((item) => ({
        text: item.label,
        value: item.value
      })),
      filterSearch: true
    },
    {
      title: (
        <div>
          Số lượng
          <br />
          con/thùng
        </div>
      ),
      minWidth: 100,
      align: 'center',
      dataIndex: 'quanEntityBin',
      sorter: true
    },
    {
      title: 'Thao tác',
      align: 'center',
      minWidth: 180,
      render: (_value, record) => {
        return (
          <ActionGroup>
            <ConfirmButton
              isRestore={true}
              id={record.id}
              service={productService}
            />
            <ForceDeleteButton
              productId={record.id}
              productName={record.name}
              productCode={record.code}
            />
          </ActionGroup>
        );
      }
    }
  ];

  const tableProps: TableProps<ProductType> = {
    ...(customTableProps as unknown as TableProps<ProductType>),
    rowKey: (record) => ['retrieval', record.id].join('-'),
    columns: columns,
    dataSource: products,
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      pageSize: pagination.pageSize,
      current: pagination.current,
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
    },
    onChange: handleChange
  };

  return (
    <>
      <RefreshButton refresh={refetch} isLoading={isFetching} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Select
          options={ProductModelEnumOptions}
          placeholder="Chọn mã thùng"
          popupMatchSelectWidth={false}
          allowClear
          onSelect={(value: string) => {
            setParams((prev) => ({
              ...prev,
              'filter[binCode]': value
            }));
          }}
          onClear={() => {
            setParams((prev) => ({
              ...prev,
              'filter[binCode]': undefined
            }));
          }}
        />
        <Select
          options={ProductModelSizeEnumOptions}
          placeholder="Chọn kích thước khuôn"
          popupMatchSelectWidth={false}
          allowClear
          onSelect={(value: string) => {
            setParams((prev) => ({
              ...prev,
              'filter[moldSize]': value
            }));
          }}
          onClear={() => {
            setParams((prev) => ({
              ...prev,
              'filter[moldSize]': undefined
            }));
          }}
        />
        <AppSearchInput
          className="col-span-1"
          placeholder="Tìm kiếm sản phẩm"
          onChange={(e) => {
            const inputValue = e.target.value;
            handleSearch(inputValue);
          }}
        />
      </div>
      <Table {...tableProps} />
    </>
  );
}
