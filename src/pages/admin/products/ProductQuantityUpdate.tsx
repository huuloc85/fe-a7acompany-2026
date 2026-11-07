import { Form, FormProps, InputNumber, message, Select, Spin } from 'antd';
import Button from '@components/common/AppButton';
import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';

import axiosPrivate from '@/api/axiosInstance';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { PaginatedResponse } from '@/types/responseTypes';
import { updateMonthlyQuantities } from '@services/TotalQuantityService';

interface FormFields {
  month: string;
  productType: number;
  [key: `product_${number}`]: number;
}

interface ProductsResponse {
  id: number;
  name: string;
  totalmonthquantities: {
    totalQuan: number;
    month: string;
  }[];
}

export default function ProductQuantityUpdate() {
  // Fetch months internally
  const { data: monthListData } = useQuery<{ months: string[] }>({
    queryKey: ['months'],
    queryFn: () => axiosPrivate.get('/api/products/month-list'),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000
  });

  const months = useMemo(() => monthListData?.months || [], [monthListData]);

  const [form] = Form.useForm<FormFields>();
  const queryClient = useQueryClient();

  const [month, setMonth] = useState<string>('');
  const [productType, setProductType] = useState(7);

  // Set initial month when months are loaded
  useEffect(() => {
    if (months.length > 0 && !month) {
      setMonth(months[0]);
      form.setFieldValue('month', months[0]);
    }
  }, [months, month, form]);

  const monthOptions = months.map((month: string) => ({
    value: month,
    label: month
  }));

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', month, productType],
    queryFn: async () => {
      return await axiosPrivate.get<
        ProductsResponse,
        PaginatedResponse<ProductsResponse>
      >('/api/products', {
        params: {
          month: dayjs(month, 'MM-YYYY').format('YYYY-MM'),
          status: productType,
          limit: 0,
          include: ['totalmonthquantities'].join(','),
          'fields[products]': ['id', 'name'].join(',')
        }
      });
    },
    enabled: !!month
  });

  const productList = useMemo(() => products?.data || [], [products]);

  // Update form values when product data changes
  useEffect(() => {
    if (productList.length > 0) {
      const newValues: Record<string, number> = {};
      productList.forEach((product) => {
        newValues[`product_${product.id}`] =
          product.totalmonthquantities?.[0]?.totalQuan ?? 0;
      });
      form.setFieldsValue(newValues);
    }
  }, [productList, form]);

  const { mutate, isPending } = useMutation({
    mutationKey: ['productQuantities', month, productType],
    mutationFn: async ({
      month,
      productType,
      products
    }: {
      month: string;
      productType: number;
      products: { productId: string; quantity: number }[];
    }) => {
      await updateMonthlyQuantities({
        month,
        status: productType,
        products: products
      });
    },
    onMutate: () => {
      message.loading({ content: 'Đang cập nhật...', key: 'update-quantity' });
    },
    onSuccess: () => {
      message.success({
        content: 'Cập nhật thành công!',
        key: 'update-quantity'
      });
      queryClient.invalidateQueries();
    },
    onError: () => {
      message.error({ content: 'Cập nhật thất bại', key: 'update-quantity' });
    }
  });

  const handleFinish: FormProps<FormFields>['onFinish'] = async (
    value: FormFields
  ) => {
    // filter not null values
    const productQuantities = Object.entries(value)
      .filter(([key, val]) => key.startsWith('product_') && val >= 0)
      .map(([key, val]) => ({
        productId: key.split('_')[1],
        quantity: val
      }));
    mutate({ month, productType, products: productQuantities });
  };

  return (
    <Spin spinning={isPending}>
      <Form<FormFields>
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        scrollToFirstError={{
          behavior: 'instant',
          block: 'start',
          focus: true
        }}
      >
        <div className="flex flex-wrap gap-2">
          <Form.Item<FormFields>
            label="Tháng cập nhật"
            name="month"
            initialValue={months[0]}
            rules={[{ required: true, message: 'Vui lòng chọn tháng' }]}
          >
            <Select
              options={monthOptions}
              placeholder={'Chọn thời gian'}
              onChange={(value) => {
                setMonth(value);
              }}
            />
          </Form.Item>
          <Form.Item<FormFields>
            label="Loại sản lượng"
            name="productType"
            initialValue={7}
            rules={[
              { required: true, message: 'Vui lòng chọn loại sản lượng' }
            ]}
          >
            <Select
              options={[
                {
                  label: 'MOQ',
                  value: 7
                },
                {
                  label: 'Tồn đầu kỳ',
                  value: 4
                },
                {
                  label: 'Tồn đầu kỳ 200%',
                  value: 5
                }
              ]}
              placeholder="Chọn loại sản lượng"
              onChange={(value) => {
                setProductType(value);
              }}
            />
          </Form.Item>
        </div>

        <h3 className="mb-2 text-lg font-medium text-gray-800 sm:text-2xl dark:text-white/90">
          Sản phẩm
        </h3>
        <hr className="my-2" />
        <Spin spinning={isLoading}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {productList.map((product) => (
              <Form.Item<FormFields>
                key={`product_${product.id}`}
                label={product.name}
                name={`product_${product.id}`}
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    message: 'Số lượng phải lớn hơn hoặc bằng 0'
                  },
                  {
                    required: true,
                    message: 'Số lượng không được để trống'
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
          {productList.length > 0 && (
            <Form.Item>
              <Button
                tone="inherit"
                variant="solid"
                color="blue"
                loading={isPending}
                htmlType="submit"
              >
                Cập nhật
              </Button>
            </Form.Item>
          )}
        </Spin>
      </Form>
    </Spin>
  );
}
