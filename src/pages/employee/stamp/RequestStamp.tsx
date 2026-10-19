import { Shift } from '@/types/shift';
import AppButton from '@components/common/AppButton';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import { customFormProps } from '@components/custom/FormProps.custom';
import { IconAdd, IconHistory } from '@components/icons';
import { UserInfo } from '@components/UserInfo';
import { productService } from '@services/ProductService';
import { empStampRequest } from '@services/StampService';
import {
  getStampErrorMessage,
  isErrorCodeObject
} from '@/utils/stampErrorCodes';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormProps,
  Input,
  InputNumber,
  message,
  Modal,
  Select
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import { FaStamp } from 'react-icons/fa6';

interface StampType {
  productId: string;
  date: Dayjs;
  shift: Shift;
  binCount: number;
  binStart: string;
  type: 'box' | 'bag' | string;
  purpose?: string;
}

interface FormFields {
  stamps: StampType[];
}

interface ProductOption {
  label: string;
  value: string;
  searchText: string;
}

export const RequestStamp = () => {
  const [form] = Form.useForm<FormFields>();
  const [pendingData, setPendingData] = useState<FormFields | null>(null);

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.list({ limit: 0 })
  });

  const { mutate: submitRequest, isPending: isSubmitting } = useMutation({
    mutationKey: ['request-stamp'],
    mutationFn: (data: FormFields) => {
      const formattedData = data.stamps.map((stamp) => {
        const hasComma = stamp.binStart && stamp.binStart.includes(',');

        // Tự động tính binCount nếu có dấu phẩy
        const finalBinCount = hasComma
          ? stamp.binStart.split(',').filter((item) => item.trim() !== '')
              .length
          : stamp.binCount;

        return {
          productId: stamp.productId,
          date: stamp.date.format('YYYY-MM-DD'),
          shift: stamp.shift,
          binCount: finalBinCount,
          binStart: stamp.binStart,
          type: stamp.type,
          purpose: stamp.purpose
        };
      });

      return empStampRequest({ stamps: formattedData });
    },
    onSuccess: () => {
      form.resetFields();
      setPendingData(null);
      message.success({
        content: 'Yêu cầu in tem đã được gửi',
        key: 'request-stamp'
      });
    },
    onError: (error: unknown) => {
      interface StampError {
        stampIndex: number;
        productName: string;
        date: string;
        shift: string;
        type: string;
        messages: string[];
      }

      const stampErrors: StampError[] = [];
      const generalErrors: string[] = [];

      interface AxiosError {
        response?: {
          status?: number;
          data?: {
            errors?: Record<
              string,
              Array<string | { code: string; params: Record<string, unknown> }>
            >;
            message?: string;
          };
        };
        message?: string;
      }

      const axiosError = error as AxiosError;

      if (axiosError?.response?.status === 422) {
        const responseData = axiosError.response.data;

        if (responseData?.errors) {
          const errors = responseData.errors;

          Object.keys(errors).forEach((field) => {
            const stampIndexMatch = field.match(/stamps\.(\d+)\./);
            const errorArray = errors[field];

            if (stampIndexMatch) {
              const stampIndex = parseInt(stampIndexMatch[1]);
              const stamp = pendingData?.stamps?.[stampIndex];
              const productId = stamp?.productId;
              const product = productsData?.data?.find(
                (p) => p.id === productId
              );
              const productName =
                product?.name || `Sản phẩm #${stampIndex + 1}`;
              const date = stamp?.date?.format('DD/MM/YYYY') || '';
              const shift =
                stamp?.shift === 1 ? 'Ca 1' : stamp?.shift === 2 ? 'Ca 2' : '';
              const type =
                stamp?.type === 'box'
                  ? 'Tem thùng'
                  : stamp?.type === 'bag'
                    ? 'Tem bịch'
                    : '';

              let stampError = stampErrors.find(
                (e) => e.stampIndex === stampIndex
              );
              if (!stampError) {
                stampError = {
                  stampIndex,
                  productName,
                  date,
                  shift,
                  type,
                  messages: []
                };
                stampErrors.push(stampError);
              }

              // Process each error in the array
              errorArray.forEach((errorItem) => {
                if (isErrorCodeObject(errorItem)) {
                  // New format: { code: string, params: object }
                  console.log('Error Code:', errorItem.code);
                  console.log(
                    'Error Params:',
                    JSON.stringify(errorItem.params, null, 2)
                  );
                  const errorMessage = getStampErrorMessage(
                    errorItem.code,
                    errorItem.params,
                    'vi'
                  );
                  console.log('Generated Message:', errorMessage);
                  stampError!.messages.push(errorMessage);
                } else if (typeof errorItem === 'string') {
                  // Legacy format: string message
                  stampError!.messages.push(errorItem);
                }
              });
            } else {
              // General errors (not stamp-specific)
              errorArray.forEach(
                (
                  errorItem:
                    | string
                    | { code: string; params: Record<string, unknown> }
                ) => {
                  if (isErrorCodeObject(errorItem)) {
                    const errorMessage = getStampErrorMessage(
                      errorItem.code,
                      errorItem.params,
                      'vi'
                    );
                    generalErrors.push(errorMessage);
                  } else if (typeof errorItem === 'string') {
                    generalErrors.push(errorItem);
                  }
                }
              );
            }
          });

          stampErrors.sort((a, b) => a.stampIndex - b.stampIndex);
        } else if (responseData?.message) {
          generalErrors.push(responseData.message);
        } else if (typeof responseData === 'string') {
          generalErrors.push(responseData);
        }
      } else if (axiosError?.response?.data?.message) {
        generalErrors.push(axiosError.response.data.message);
      } else if (
        axiosError &&
        typeof axiosError === 'object' &&
        'message' in axiosError &&
        typeof axiosError.message === 'string'
      ) {
        generalErrors.push(axiosError.message);
      }

      if (stampErrors.length === 0 && generalErrors.length === 0) {
        generalErrors.push('Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
      }

      Modal.error({
        title: 'Không thể gửi yêu cầu',
        icon: null,
        width: '90%',
        style: { maxWidth: '600px' },
        content: (
          <div className="space-y-2.5">
            {generalErrors.map((msg, index) => (
              <div
                key={`general-${index}`}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900"
              >
                {msg}
              </div>
            ))}

            {stampErrors.map((stampError) => (
              <div
                key={`stamp-${stampError.stampIndex}`}
                className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
              >
                <div className="mb-2 border-b border-orange-200 pb-2">
                  <div className="text-xs font-medium text-orange-600">
                    Yêu cầu #{stampError.stampIndex + 1}
                  </div>
                  <div className="mt-1 font-medium text-orange-900">
                    {stampError.productName}
                  </div>
                  <div className="mt-1 text-xs text-orange-600">
                    {stampError.date} • {stampError.shift} • {stampError.type}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {stampError.messages.map((msg, msgIndex) => (
                    <div
                      key={msgIndex}
                      className="flex items-start gap-2 text-sm leading-relaxed text-orange-900"
                    >
                      <span className="mt-0.5 text-orange-500">•</span>
                      <span className="flex-1">{msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ),
        okText: 'Đã hiểu',
        okButtonProps: {
          className:
            'bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600'
        },
        centered: true
      });

      message.destroy('request-stamp');
    },
    onMutate: () => {
      message.loading({
        content: 'Đang gửi yêu cầu in tem...',
        key: 'request-stamp'
      });
    }
  });

  // Submit directly without frontend validation - let backend handle all validation
  const handleFormSubmit = (values: FormFields) => {
    setPendingData(values);
    submitRequest(values);
  };

  const productOptions: ProductOption[] =
    productsData?.data?.map((product) => ({
      label: product.name,
      value: product.id,
      searchText: `${product.code} ${product.name}`.toLowerCase()
    })) || [];

  const shiftOptions = [
    { label: 'Ca 1', value: 1 },
    { label: 'Ca 2', value: 2 }
  ];

  const stampTypeOptions = [
    { label: 'Tem thùng', value: 'box' },
    { label: 'Tem bịch', value: 'bag' }
  ];

  const purposeOptions = [
    { label: 'In mới', value: 'new' },
    { label: 'In thêm', value: 'additional' },
    { label: 'In lại', value: 'reprint' }
  ];

  const formProps: FormProps<FormFields> = {
    ...customFormProps,
    form,
    disabled: isSubmitting,
    initialValues: { stamps: [{}] },
    onFinish: handleFormSubmit
  };

  return (
    <>
      <BackButton to="/" />
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaStamp className="text-indigo-500" />
            <span>Gửi yêu cầu in tem</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <Link to="/employee/stamps/history">
              <AppButton tone="warning">
                <IconHistory />
                KIỂM TRA YÊU CẦU IN TEM
              </AppButton>
            </Link>
          </div>

          {/* ── User Info ──────────────────────────────────────── */}
          <UserInfo />

          {/* ── Form Title ─────────────────────────────────────── */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-3 text-center dark:border-indigo-900 dark:from-indigo-950/30 dark:to-blue-950/20">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              📋 Tạo tem
            </span>
          </div>

          {/* ── Form ───────────────────────────────────────────── */}
          <Form {...formProps}>
            <Form.List name="stamps">
              {(fields, { add, remove }) => (
                <div className="flex flex-col gap-4">
                  {fields.map((field) => (
                    <Card
                      key={field.key}
                      title={
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tem {field.name + 1}
                        </span>
                      }
                      extra={
                        <IoCloseOutline
                          className="cursor-pointer text-lg text-gray-400 transition-colors hover:text-red-500"
                          onClick={() => remove(field.name)}
                        />
                      }
                      className="!rounded-xl !border-gray-200 dark:!border-gray-700"
                    >
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-2 lg:grid-cols-3">
                        <Form.Item
                          label="Sản phẩm"
                          name={[field.name, 'productId']}
                          className="col-span-2 !mb-0"
                          rules={[
                            {
                              required: true,
                              message: 'Vui lòng chọn sản phẩm'
                            }
                          ]}
                        >
                          <Select
                            options={productOptions}
                            placeholder="Chọn sản phẩm"
                            showSearch
                            allowClear
                            optionFilterProp="searchText"
                            filterOption={(input, option) =>
                              String(option?.searchText ?? option?.label ?? '')
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            }
                          />
                        </Form.Item>
                        <Form.Item
                          label="Ngày"
                          name={[field.name, 'date']}
                          className="col-span-1 !mb-0"
                          rules={[{ required: true, message: 'Vui chọn ngày' }]}
                          initialValue={dayjs()}
                        >
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                          label="Ca"
                          name={[field.name, 'shift']}
                          className="col-span-1 !mb-0"
                          rules={[{ required: true, message: 'Vui chọn ca' }]}
                        >
                          <Select
                            options={shiftOptions}
                            placeholder="Chọn ca"
                          />
                        </Form.Item>

                        <Form.Item
                          label="Loại"
                          name={[field.name, 'type']}
                          className="col-span-1 !mb-0"
                          rules={[{ required: true, message: 'Vui chọn loại' }]}
                        >
                          <Select
                            options={stampTypeOptions}
                            placeholder="Loại tem"
                          />
                        </Form.Item>
                        <Form.Item
                          label="Mục đích"
                          name={[field.name, 'purpose']}
                          className="col-span-1 !mb-0"
                          rules={[
                            {
                              required: true,
                              message: 'Vui chọn mục đích'
                            }
                          ]}
                        >
                          <Select
                            options={purposeOptions}
                            placeholder="Mục đích"
                          />
                        </Form.Item>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prevValues, currentValues) => {
                            const prevBinStart =
                              prevValues?.stamps?.[field.name]?.binStart;
                            const currentBinStart =
                              currentValues?.stamps?.[field.name]?.binStart;
                            return prevBinStart !== currentBinStart;
                          }}
                        >
                          {({ getFieldValue }) => {
                            const binStart = getFieldValue([
                              'stamps',
                              field.name,
                              'binStart'
                            ]);
                            const hasComma = binStart && binStart.includes(',');

                            return !hasComma ? (
                              <Form.Item
                                label="Số lượng tem"
                                name={[field.name, 'binCount']}
                                className="col-span-2 !mb-0 md:col-span-1 lg:col-span-1"
                                rules={[
                                  {
                                    required: true,
                                    message: 'Vui lòng nhập số lượng'
                                  }
                                ]}
                              >
                                <InputNumber
                                  min={1}
                                  style={{ width: '100%' }}
                                  placeholder="Nhập số lượng tem"
                                />
                              </Form.Item>
                            ) : null;
                          }}
                        </Form.Item>
                        <Form.Item
                          label="Bắt đầu từ tem số"
                          name={[field.name, 'binStart']}
                          className="col-span-2 !mb-0 md:col-span-1 lg:col-span-1"
                          rules={[
                            {
                              required: true,
                              message: 'Vui lòng nhập số tem bắt đầu'
                            },
                            {
                              pattern: /^[0-9]+(,[0-9]+)*$/,
                              message:
                                'Vui lòng nhập số hợp lệ, cách nhau bằng dấu phẩy (VD: 7,10,11)'
                            }
                          ]}
                        >
                          <Input
                            style={{ width: '100%' }}
                            placeholder="Nhập tem bắt đầu (VD: 7 hoặc 7,10,11)"
                          />
                        </Form.Item>
                      </div>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    className="!rounded-lg"
                  >
                    <IconAdd /> Thêm tem
                  </Button>
                </div>
              )}
            </Form.List>
            <Form.Item style={{ marginTop: '16px', marginBottom: '0' }}>
              <AppButton
                tone="success"
                htmlType="submit"
                disabled={isSubmitting}
                className="px-6"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </AppButton>
            </Form.Item>
          </Form>
        </div>
      </ComponentCard>
    </>
  );
};
