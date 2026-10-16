import { AddPoRequest } from '@/types/purchaseOrdersType';
import { Shift } from '@/types/shift';
import AppButton from '@components/common/AppButton';
import { customFormProps } from '@components/custom/FormProps.custom';
import {
  productStatus,
  productStatusOptions
} from '@constants/productStatus.enum';
import { ShiftEnumOptions } from '@constants/shift.enum';
import { productService } from '@services/ProductService';
import { AddPurchaseOrdersQuantities } from '@services/PurchaseOrdersService';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import {
  DatePicker,
  Form,
  FormProps,
  InputNumber,
  message,
  Modal,
  Select,
  Spin
} from 'antd';
import type { Dayjs } from 'dayjs';
import React from 'react';
import { IconAdd } from '@components/icons';

interface FormFields {
  date: Dayjs;
  productType: number;
  shift?: Shift;
  [key: `product_${number | string}`]: number;
}

interface AddQuantityModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddQuantityModal: React.FC<AddQuantityModalProps> = ({
  open,
  onClose
}) => {
  const [form] = Form.useForm();
  const productType = Form.useWatch('productType', form);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationKey: ['add', 'productQuantities'],
    mutationFn: async (values: AddPoRequest) => {
      const response = await AddPurchaseOrdersQuantities(values);
      return response;
    },
    onMutate: () => {
      message.loading({ content: 'Đang Thêm...', key: 'add-inventory' });
    },
    onSuccess: () => {
      form.resetFields();
      message.success({ content: 'Thêm thành công!', key: 'add-inventory' });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrdersHistory'] });
      onClose();
    },
    onError: () => {
      message.error({ content: 'Thêm thất bại!', key: 'add-inventory' });
    }
  });

  const handleFinish: FormProps<FormFields>['onFinish'] = async (values) => {
    const productQuantities = Object.entries(values)
      .filter(([key, val]) => key.startsWith('product_') && val)
      .map(([key, val]) => ({
        productId: key.split('_')[1],
        quantity: val as number
      }));

    if (productQuantities.length === 0) {
      message.error('Vui lòng nhập ít nhất một sản phẩm');
      return;
    }

    mutate({
      date: values.date.format('YYYY-MM-DD'),
      status: values.productType,
      shift: values.shift,
      products: productQuantities
    });
  };

  const formProps: FormProps = {
    ...customFormProps,
    form: form,
    onFinish: handleFinish
  };

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.list({ limit: 0 }),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000
  });
  const productList = productsData?.data ?? [];

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-600">
            <IconAdd />
          </span>
          <div>
            <div className="text-base font-semibold">Thêm sản lượng</div>
            <div className="text-xs font-normal text-gray-400">
              Nhập số lượng sản xuất hoặc hàng lỗi theo ngày
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={900}
      destroyOnHidden
      styles={{
        body: { maxHeight: '75vh', overflowY: 'auto', padding: '16px 24px' }
      }}
    >
      <Spin spinning={isPending}>
        <Form<FormFields> {...formProps}>
          <div className="space-y-5">
            {/* ── Config section ──────────────────────────────── */}
            <div className="flex flex-wrap items-end gap-3">
              <Form.Item<FormFields>
                label="Ngày"
                name="date"
                className="!mb-0"
                rules={[{ required: true, message: 'Chọn ngày' }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                  className="!rounded-lg"
                />
              </Form.Item>
              <Form.Item<FormFields>
                label="Loại sản lượng"
                name="productType"
                className="!mb-0 !min-w-[180px]"
                rules={[{ required: true, message: 'Chọn loại' }]}
              >
                <Select
                  className="!rounded-lg"
                  options={[
                    {
                      label: productStatusOptions.find(
                        (o) => o.value === productStatus.enum.PRODUCE
                      )?.label,
                      value: productStatus.enum.PRODUCE
                    },
                    {
                      label: productStatusOptions.find(
                        (o) => o.value === productStatus.enum.ERROR
                      )?.label,
                      value: productStatus.enum.ERROR
                    }
                  ]}
                  placeholder="Chọn loại"
                />
              </Form.Item>
              {productType === productStatus.enum.PRODUCE && (
                <Form.Item<FormFields>
                  label="Ca làm việc"
                  name="shift"
                  className="!mb-0 !min-w-[160px]"
                  rules={[{ required: true, message: 'Chọn ca' }]}
                >
                  <Select
                    className="!rounded-lg"
                    options={ShiftEnumOptions}
                    placeholder="Chọn ca"
                  />
                </Form.Item>
              )}
            </div>

            {/* ── Products grid ───────────────────────────────── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Sản phẩm ({productList.length})
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
              <Spin spinning={isLoading}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {productList.map((product) => (
                    <Form.Item<FormFields>
                      key={`product_${product.id}`}
                      label={
                        <span className="text-xs font-medium">
                          {product.name}
                        </span>
                      }
                      name={`product_${product.id}`}
                      className="!mb-0"
                      rules={[{ type: 'number', min: 0, message: 'Min 0' }]}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        placeholder="0"
                        className="!rounded-lg"
                      />
                    </Form.Item>
                  ))}
                </div>
              </Spin>
            </div>

            {/* ── Actions ─────────────────────────────────────── */}
            {productList.length > 0 && (
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                <AppButton tone="neutral" onClick={handleCancel}>
                  Hủy
                </AppButton>
                <AppButton tone="success" htmlType="submit">
                  Cập nhật
                </AppButton>
              </div>
            )}
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};
