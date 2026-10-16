import BackButton from '@components/common/BackButton';
import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { customFormProps } from '@components/custom/FormProps.custom';
import { IconHistory } from '@components/icons';
import { UserInfo } from '@components/UserInfo';
import { productService } from '@services/ProductService';
import { createTodo } from '@services/TodoService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Form, FormProps, message, Select } from 'antd';
import { FaEdit, FaHome } from 'react-icons/fa';
import { FaBoxOpen } from 'react-icons/fa6';

interface FormValues {
  productId: string;
  shift: string;
}

interface ProductOption {
  label: string;
  value: string;
  searchText: string;
}

export const ChooseProduct = () => {
  const [form] = Form.useForm();

  const { data: productData } = useQuery({
    queryKey: ['product', 'list'],
    queryFn: () => productService.list({ limit: 0 })
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['product', 'update'],
    mutationFn: (values: FormValues) =>
      createTodo({
        productId: values.productId,
        shift: values.shift
      }),
    onError: () => {
      message.error({
        content: 'Sản phẩm đã tồn tại hoặc không hợp lệ',
        key: 'create-todo'
      });
    },
    onMutate: () => {
      message.loading({
        content: 'Đang cập nhật sản phẩm...',
        key: 'create-todo'
      });
    },
    onSuccess: () => {
      form.resetFields();
      message.success({
        content: 'Cập nhật sản phẩm thành công',
        key: 'create-todo'
      });
    }
  });

  const productOptions: ProductOption[] =
    productData?.data.map((product) => ({
      label: product.name,
      value: product.id,
      searchText: `${product.code} ${product.name}`.toLowerCase()
    })) || [];

  const shiftOptions = [
    { label: 'Ca 1', value: 'Ca 1' },
    { label: 'Ca 2', value: 'Ca 2' }
  ];

  const formProps: FormProps<FormValues> = {
    ...customFormProps,
    form: form,
    onFinish: (values) => {
      mutate(values);
    }
  };

  return (
    <>
      <BackButton to="/" />
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaBoxOpen className="text-emerald-500" />
            <span>Cập Nhật Loại Sản Phẩm</span>
          </div>
        }
        desc="Cập nhật loại sản phẩm cần kiểm hàng hoặc sản xuất"
      >
        <div className="space-y-5">
          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <Link to="/">
              <AppButton tone="primary">
                <FaHome className="text-xs" />
                TRANG CHỦ
              </AppButton>
            </Link>
            <Link to="/employee/activity-schedule">
              <AppButton tone="warning">
                <IconHistory />
                LỊCH SỬ ĐÃ CHỌN
              </AppButton>
            </Link>
            <Link to="/employee/todo/update-quantity">
              <AppButton tone="success">
                <FaEdit className="text-xs" />
                CẬP NHẬT SẢN LƯỢNG
              </AppButton>
            </Link>
          </div>

          <div className="space-y-6 lg:w-1/2">
            {/* ── Form Title ──────────────────────────────────── */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 text-center dark:border-blue-900 dark:from-blue-950/30 dark:to-indigo-950/20">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                📦 Thông tin sản phẩm
              </span>
            </div>

            {/* ── User Info ───────────────────────────────────── */}
            <UserInfo />

            {/* ── Form ────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-100 bg-white/80 p-5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
              <Form<FormValues> {...formProps}>
                <Form.Item<FormValues>
                  label="Chọn sản phẩm"
                  data-tour="choose-product-select"
                  name="productId"
                  rules={[
                    { required: true, message: 'Vui lòng chọn sản phẩm' }
                  ]}
                >
                  <Select
                    options={productOptions}
                    allowClear
                    showSearch
                    placeholder="Chọn sản phẩm"
                    optionFilterProp="searchText"
                    filterOption={(input, option) =>
                      String(option?.searchText ?? option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
                <Form.Item<FormValues>
                  label="Chọn ca làm việc"
                  data-tour="choose-product-shift"
                  name="shift"
                  rules={[
                    { required: true, message: 'Vui lòng chọn ca làm việc' }
                  ]}
                >
                  <Select
                    options={shiftOptions}
                    allowClear
                    placeholder="Chọn ca làm việc"
                  />
                </Form.Item>
                <Form.Item>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-600 hover:shadow-md active:scale-[0.97] disabled:opacity-50"
                  >
                    {isPending ? 'Đang cập nhật...' : 'Cập nhật'}
                  </button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      </ComponentCard>
    </>
  );
};
