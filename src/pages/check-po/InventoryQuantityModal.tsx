import { AddPoInventoryRequest } from '@/types/purchaseOrdersType';
import AppButton from '@components/common/AppButton';
import { customFormProps } from '@components/custom/FormProps.custom';
import { productService } from '@services/ProductService';
import { AddPurchaseOrdersQuantitiesInventory } from '@services/PurchaseOrdersService';
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
  Spin
} from 'antd';
import type { Dayjs } from 'dayjs';
import React from 'react';
import { FaWarehouse } from 'react-icons/fa6';

interface FormFields {
  month: Dayjs;
  [key: `product_${number | string}`]: number;
}

interface InventoryQuantityModalProps {
  open: boolean;
  onClose: () => void;
}

export const InventoryQuantityModal: React.FC<InventoryQuantityModalProps> = ({
  open,
  onClose
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationKey: ['add', 'inventoryQuantities'],
    mutationFn: async (values: AddPoInventoryRequest) => {
      const response = await AddPurchaseOrdersQuantitiesInventory(values);
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
      message.error({
        content: 'Vui lòng nhập ít nhất một sản phẩm',
        key: 'update-inventory'
      });
      return;
    }

    mutate({
      month: values.month.format('MM-YYYY'),
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
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-600">
            <FaWarehouse />
          </span>
          <div>
            <div className="text-base font-semibold">Thêm tồn đầu kỳ</div>
            <div className="text-xs font-normal text-gray-400">
              Nhập số lượng tồn kho đầu tháng
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
            {/* ── Month picker ────────────────────────────────── */}
            <div className="flex items-end gap-3">
              <Form.Item<FormFields>
                label="Tháng"
                name="month"
                className="!mb-0"
                rules={[{ required: true, message: 'Chọn tháng' }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn tháng"
                  picker="month"
                  className="!rounded-lg"
                />
              </Form.Item>
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
                <AppButton tone="info" htmlType="submit">
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
