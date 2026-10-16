import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { customFormProps } from '@components/custom/FormProps.custom';
import { IconHistory } from '@components/icons';
import { UserInfo } from '@components/UserInfo';
import { fetchTodoList, updateTodoQuantity } from '@services/TodoService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Form, InputNumber, message, Select } from 'antd';
import { FormProps } from 'antd/lib';
import { FaBoxOpen, FaEdit } from 'react-icons/fa';
import { IoWarning } from 'react-icons/io5';

interface FormValues {
  productKey: string; // composite key: "productId|shift"
  quantity: number;
}

export const UpdateQuantity = () => {
  const [form] = Form.useForm();

  const { data: todoData } = useQuery({
    queryKey: ['product', 'todo', 'list'],
    queryFn: () => fetchTodoList()
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['product', 'todo', 'update-quantity'],
    mutationFn: (data: {
      productId: string;
      quantity: number;
      shift: string;
    }) => updateTodoQuantity(data),
    onMutate: () => {
      message.loading({
        content: 'Đang cập nhật sản lượng...',
        key: 'update-quantity'
      });
    },
    onSuccess: () => {
      form.resetFields();
      message.success({
        content: 'Cập nhật sản lượng thành công',
        key: 'update-quantity'
      });
    },
    onError: () => {
      message.error({
        content: 'Cập nhật sản lượng thất bại',
        key: 'update-quantity'
      });
    }
  });

  // Each todo item = unique (product + shift), build composite key
  const todoOptions = todoData?.map((todo) => ({
    key: todo.id,
    label: `${todo.product.name} — ${todo.shift}`,
    value: `${todo.product.id}|${todo.shift}`
  }));

  const formProps: FormProps<FormValues> = {
    ...customFormProps,
    form: form,
    onFinish: (values) => {
      const [productId, shift] = values.productKey.split('|');
      mutate({ productId, quantity: values.quantity, shift });
    }
  };

  return (
    <>
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaEdit className="text-emerald-500" />
            <span>Cập Nhật Sản Lượng Sản Phẩm</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <Link to="/employee/todo/add-product">
              <AppButton tone="primary">
                <FaBoxOpen className="text-xs" />
                NHẬP SẢN PHẨM
              </AppButton>
            </Link>
            <Link to="/employee/todo/history">
              <AppButton tone="warning">
                <IconHistory />
                LỊCH SỬ
              </AppButton>
            </Link>
            <Link to="/employee/todo/update-quantity-error">
              <AppButton tone="danger">
                <IoWarning className="text-xs" />
                CẬP NHẬT HÀNG LỖI
              </AppButton>
            </Link>
          </div>

          {/* ── Notice ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              ⚠️ Lưu ý
            </h3>
            <div className="mt-2 space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
              <p>
                Nhân viên nhập sản lượng thì kiểm tra lịch sử trong phần{' '}
                <Link to="/employee/todo/history">
                  <span className="font-semibold text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
                    Lịch sử cập nhật sản lượng
                  </span>
                </Link>
                .
              </p>
              <p>
                Nhân viên nhập hàng lỗi thì phải chọn vào ô{' '}
                <Link to="/employee/todo/update-quantity-error">
                  <span className="font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400">
                    Cập nhật hàng lỗi
                  </span>
                </Link>{' '}
                sau đó kiểm tra{' '}
                <Link to="/employee/todo/history">
                  <span className="font-semibold text-red-600 underline hover:text-red-700 dark:text-red-400">
                    Lịch sử cập nhật sản lượng
                  </span>
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="space-y-6 lg:w-1/2">
            {/* ── User Info ───────────────────────────────────── */}
            <UserInfo />

            {/* ── Form ────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-100 bg-white/80 p-5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
              <Form<FormValues> {...formProps}>
                <Form.Item<FormValues>
                  label="Chọn sản phẩm"
                  data-tour="quantity-product"
                  name="productKey"
                  rules={[
                    { required: true, message: 'Vui lòng chọn sản phẩm' }
                  ]}
                >
                  <Select
                    options={todoOptions}
                    allowClear
                    showSearch
                    placeholder="Chọn sản phẩm"
                  />
                </Form.Item>
                <Form.Item<FormValues>
                  label="Số lượng sản phẩm"
                  data-tour="quantity-value"
                  name="quantity"
                  rules={[
                    {
                      required: true,
                      message: 'Vui lòng nhập số lượng sản phẩm'
                    },
                    { type: 'number', message: 'Số lượng phải lớn hơn 0' }
                  ]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
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
