import { ProductType } from '@/types/productType';
import { customFormProps } from '@components/custom/FormProps.custom';
import {
  productStatus,
  productStatusOptions,
  ProductStatusType
} from '@constants/productStatus.enum';
import { updateProductQuantity } from '@services/ProductService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Form,
  InputNumber,
  message,
  Modal,
  Select,
  SelectProps
} from 'antd';
import { FormProps } from 'antd/lib';
import type { Dayjs } from 'dayjs';
import React, { useState } from 'react';

interface FormFields {
  date: Dayjs;
  quantity: number;
  productStatus: ProductStatusType;
  shift?: 'Ca 1' | 'Ca 2';
}

interface UpdateQuantityModalProps {
  product: ProductType;
}

export const UpdateQuantityModal: React.FC<UpdateQuantityModalProps> = ({
  product
}) => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormFields>();
  const selectedStatus = Form.useWatch('productStatus', form);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const statusOptions: SelectProps['options'] = productStatusOptions.filter(
    (option) =>
      [
        productStatus.enum.PRODUCE,
        productStatus.enum.CHECK200,
        productStatus.enum.ERROR
      ].includes(option.value)
  );

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationKey: ['updateProductDetail'],
    mutationFn: (data: FormFields) => {
      return updateProductQuantity(
        product.id,
        data.date.format('YYYY-MM-DD'),
        data.quantity,
        data.productStatus,
        data.productStatus === productStatus.enum.PRODUCE
          ? data.shift
          : undefined
      );
    },
    onMutate: () => {
      message.loading({
        content: 'Đang cập nhật...',
        key: 'updateProductDetail'
      });
    },
    onSuccess: () => {
      message.success({
        content: 'Cập nhật thành công',
        key: 'updateProductDetail'
      });
      queryClient.invalidateQueries();
      form.resetFields();
    },
    onError: () => {
      message.error({
        content: 'Cập nhật thất bại',
        key: 'updateProductDetail'
      });
    }
  });

  const handleFinish = (values: FormFields) => {
    mutate(values);
  };

  const formProps: FormProps<FormFields> = {
    ...customFormProps,
    form: form,
    onFinish: handleFinish
  };

  return (
    <>
      <Button variant="solid" color="blue" onClick={handleOpen}>
        Cập nhật sản lượng
      </Button>
      <Modal
        title="Cập nhật sản lượng"
        open={open}
        onCancel={handleClose}
        footer={null}
        loading={isPending}
        destroyOnHidden
      >
        <div className="text-lg">
          <div>
            <span className="font-semibold">Tên sản phẩm: </span>
            {product.name ?? 'N/A'}
          </div>
          <div>
            <span className="font-semibold">Mã sản phẩm: </span>
            {product.code ?? 'N/A'}
          </div>
        </div>
        <hr />
        <Form<FormFields> {...formProps}>
          <Form.Item<FormFields>
            label="Ngày cập nhật"
            name="date"
            rules={[
              {
                required: true,
                message: 'Vui lòng chọn ngày'
              }
            ]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item<FormFields>
            label="Sản lượng"
            name="quantity"
            rules={[
              {
                required: true,
                message: 'Vui lòng nhập sản lượng'
              }
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item<FormFields>
            label="Trạng thái sản phẩm"
            name="productStatus"
            rules={[
              {
                required: true,
                message: 'Vui lòng chọn trạng thái sản phẩm'
              }
            ]}
          >
            <Select options={statusOptions} />
          </Form.Item>
          {selectedStatus === productStatus.enum.PRODUCE && (
            <Form.Item<FormFields>
              label="Ca làm việc"
              name="shift"
              preserve={false}
              rules={[{ required: true, message: 'Vui lòng chọn ca làm việc' }]}
            >
              <Select
                placeholder="Chọn ca làm việc"
                options={[
                  { label: 'Ca 1', value: 'Ca 1' },
                  { label: 'Ca 2', value: 'Ca 2' }
                ]}
              />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Cập nhật
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
