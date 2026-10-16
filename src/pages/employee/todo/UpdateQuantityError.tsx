import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { customFormProps } from '@components/custom/FormProps.custom';
import { IconHistory } from '@components/icons';
import { UserInfo } from '@components/UserInfo';
import { fetchTodoList, updateTodoQuantityError } from '@services/TodoService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Form, InputNumber, message, Select } from 'antd';
import { FormProps } from 'antd/lib';
import { FaBoxOpen } from 'react-icons/fa';
import { IoWarning } from 'react-icons/io5';

interface FormValues {
  productId: string;
  quantity: number;
}

export const UpdateQuantityError = () => {
  const [form] = Form.useForm();

  const { data: todoData } = useQuery({
    queryKey: ['product', 'todo', 'list'],
    queryFn: () => fetchTodoList()
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['product', 'todo', 'update-quantity'],
    mutationFn: (data: FormValues) => updateTodoQuantityError(data),
    onMutate: () => {
      message.loading({
        content: 'Đang cập nhật sản lượng...',
        key: 'update-error'
      });
    },
    onSuccess: () => {
      form.resetFields();
      message.success({
        content: 'Cập nhật sản lượng thành công',
        key: 'update-error'
      });
    },
    onError: () => {
      message.error({
        content: 'Cập nhật sản lượng thất bại',
        key: 'update-error'
      });
    }
  });

  const todoOptions = todoData?.map((todo) => ({
    key: todo.id,
    label: todo.product.name,
    value: todo.product.id
  }));

  const formProps: FormProps<FormValues> = {
    ...customFormProps,
    form: form,
    onFinish: (values) => {
      mutate(values);
    }
  };

  return (
    <>
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <IoWarning className="text-red-500" />
            <span>Cập Nhật Sản Lượng Hàng Lỗi</span>
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
          </div>

          <div className="space-y-6 lg:w-1/2">
            {/* ── User Info ───────────────────────────────────── */}
            <UserInfo />

            {/* ── Form ────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-100 bg-white/80 p-5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
              <Form<FormValues> {...formProps}>
                <Form.Item<FormValues>
                  label="Chọn sản phẩm"
                  data-tour="error-product"
                  name="productId"
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
                  label="Số lượng sản phẩm lỗi"
                  data-tour="error-quantity"
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
