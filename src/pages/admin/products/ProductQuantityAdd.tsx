import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormProps,
  InputNumber,
  message,
  Select
} from 'antd';
import { SizeType } from 'antd/es/config-provider/SizeContext';
import dayjs, { Dayjs } from 'dayjs';

import { ProductType } from '@/types/productType';
import { productStatus } from '@constants/productStatus.enum';
import { useCrudList } from '@hooks/useCrudList';
import { productService } from '@services/ProductService';
import {
  AddProductQuantitiesRequest,
  addProductsQuantity
} from '@services/TotalQuantityService';

import { IconAdd } from '@components/icons';
import { IoCloseOutline } from 'react-icons/io5';

interface ProductField {
  date: Dayjs | null;
  productType: number;
  shift: number;
  productId: ProductType['id'];
  quantity: number;
}

interface FormFields {
  products?: ProductField[];
}

export default function ProductQuantityAdd() {
  const [form] = Form.useForm<FormFields>();
  const size: SizeType = 'large';
  // Helper to get selected product IDs from form
  const getSelectedProductIds = () => {
    const products = form.getFieldValue('products') || [];
    return products.map((p: ProductField) => p?.productId).filter(Boolean);
  };

  const { data: products } = useCrudList({
    queryKey: 'products',
    service: productService,
    initialFilters: {
      limit: 0
    }
  });

  const productOptions = products?.map((product) => ({
    label: product.name,
    value: product.id
  }));

  const { mutate, isPending } = useMutation({
    mutationKey: ['addProductQuantity'],
    mutationFn: async (values: AddProductQuantitiesRequest) => {
      return await addProductsQuantity(values);
    },
    onSuccess: () => {
      message.success({
        key: 'addProductQuantities',
        content: 'Thêm sản lượng thành công'
      });
      form.resetFields();
    },
    onError: (error) => {
      message.error({
        key: 'addProductQuantities',
        content: 'Lỗi khi thêm sản lượng sản xuất'
      });
      if (import.meta.env.DEV) {
        console.error('Error adding product quantities:', error);
      }
    },
    onMutate: () => {
      message.loading({
        key: 'addProductQuantities',
        content: 'Đang thêm sản lượng...'
      });
    }
  });

  const onFinish: FormProps<FormFields>['onFinish'] = (values: FormFields) => {
    if (values.products?.length == 0) {
      message.error('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    const requestBody: AddProductQuantitiesRequest = {
      products:
        values.products?.map((product) => ({
          date: product.date?.format('DD-MM-YYYY') || '',
          status: product.productType,
          shift: product.productType == 1 ? product.shift : undefined, // Only include shift if productType is 1
          productId: product.productId,
          quantity: product.quantity
        })) || []
    };

    mutate(requestBody);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      size={size}
      onFinish={onFinish}
      initialValues={{ products: [{}] }}
      scrollToFirstError={{
        behavior: 'instant',
        block: 'center',
        focus: true
      }}
    >
      <Form.List name="products">
        {(fields, { add, remove }) => (
          <div className="flex flex-col gap-4">
            {fields.map((field) => (
              <Card
                size="default"
                title={`Sản phẩm ${field.name + 1}`}
                key={field.key}
                extra={<IoCloseOutline onClick={() => remove(field.name)} />}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Form.Item
                    label="Thời gian cập nhật"
                    name={[field.name, 'date']}
                    rules={[
                      { required: true, message: 'Vui lòng chọn thời gian' }
                    ]}
                    initialValue={dayjs()}
                  >
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label="Loại sản lượng"
                    name={[field.name, 'productType']}
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn loại sản lượng'
                      }
                    ]}
                  >
                    <Select
                      options={[
                        {
                          label: 'Hàng 100%',
                          value: productStatus.enum.PRODUCE
                        },
                        {
                          label: 'Hàng 200%',
                          value: productStatus.enum.CHECK200
                        },
                        {
                          label: 'Hàng lỗi',
                          value: productStatus.enum.ERROR
                        }
                      ]}
                      placeholder="Chọn loại sản lượng"
                    />
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                      prev.products?.[field.name]?.productType !==
                      curr.products?.[field.name]?.productType
                    }
                  >
                    {({ getFieldValue }) => {
                      const productType = getFieldValue([
                        'products',
                        field.name,
                        'productType'
                      ]);
                      return productType === productStatus.enum.PRODUCE ? (
                        <Form.Item
                          label="Ca làm việc"
                          name={[field.name, 'shift']}
                          rules={[
                            {
                              required: true,
                              message: 'Vui lòng chọn ca làm việc'
                            }
                          ]}
                        >
                          <Select
                            options={[
                              {
                                label: 'Ca 1',
                                value: 1
                              },
                              {
                                label: 'Ca 2',
                                value: 2
                              }
                            ]}
                            placeholder="Chọn ca làm việc"
                          />
                        </Form.Item>
                      ) : null;
                    }}
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => {
                      // Re-render when any productId changes
                      return (
                        prev.products
                          ?.map((p: ProductField) => p?.productId)
                          .join(',') !==
                        curr.products
                          ?.map((p: ProductField) => p?.productId)
                          .join(',')
                      );
                    }}
                  >
                    {() => (
                      <Form.Item
                        label="Sản phẩm"
                        name={[field.name, 'productId']}
                        rules={[
                          {
                            required: true,
                            message: 'Vui lòng chọn sản phẩm'
                          }
                        ]}
                      >
                        <Select
                          options={productOptions?.filter((option) => {
                            const selectedIds = getSelectedProductIds();
                            const currentValue = form.getFieldValue([
                              'products',
                              field.name,
                              'productId'
                            ]);
                            return (
                              !selectedIds.includes(option.value) ||
                              option.value === currentValue
                            );
                          })}
                          placeholder="Chọn sản phẩm"
                          showSearch
                          popupMatchSelectWidth={false}
                          dropdownStyle={{ minWidth: 360, maxWidth: '80vw' }}
                          onChange={() => {
                            // Force update to refresh dropdowns
                            form.setFieldsValue({
                              products: form.getFieldValue('products')
                            });
                          }}
                        />
                      </Form.Item>
                    )}
                  </Form.Item>
                  <Form.Item
                    label="Sản lượng"
                    name={[field.name, 'quantity']}
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng nhập sản lượng'
                      }
                    ]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </Card>
            ))}
            <Button type="dashed" onClick={() => add()} block>
              <IconAdd /> Thêm sản phẩm
            </Button>
          </div>
        )}
      </Form.List>

      <Form.Item style={{ marginTop: '16px', marginBottom: '0' }}>
        <Button
          variant="solid"
          color="green"
          loading={isPending}
          htmlType="submit"
        >
          Thêm
        </Button>
      </Form.Item>
    </Form>
  );
}
