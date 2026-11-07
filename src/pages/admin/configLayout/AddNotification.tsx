import { NotificationCreateType } from '@/types/notificationType';
import ComponentCard from '@components/common/ComponentCard';
import { customFormProps } from '@components/custom/FormProps.custom';
import { createNotification } from '@services/NotificationService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, FormProps, Input, message } from 'antd';
import Button from '@components/common/AppButton';
import { NotificationTable } from './NotificationTable';

type FormFields = NotificationCreateType;

export const AddNotification = () => {
  const [form] = Form.useForm();

  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationKey: ['addNotification'],
    mutationFn: async (newNotification: FormFields) => {
      await createNotification(newNotification);
    },
    onMutate: () => {
      message.loading({
        content: 'Đang thêm thông báo...',
        key: 'add-notification'
      });
    },
    onSuccess: () => {
      message.success({
        content: 'Thêm thông báo thành công',
        key: 'add-notification'
      });
      queryClient.invalidateQueries();
      form.resetFields();
    },
    onError: () => {
      message.error({
        content: 'Thêm thông báo thất bại',
        key: 'add-notification'
      });
    }
  });

  const formProps: FormProps = {
    ...customFormProps,
    form: form,
    onFinish: (values: FormFields) => {
      mutate(values);
    }
  };

  return (
    <ComponentCard title="Chỉnh sửa thông báo">
      <Form<FormFields> {...formProps}>
        <Form.Item<FormFields>
          label="Thông báo"
          name="message"
          rules={[{ required: true, message: 'Vui lòng nhập thông báo' }]}
        >
          <Input placeholder="Nhập thông báo" />
        </Form.Item>
        <Form.Item>
          <Button
            tone="inherit"
            htmlType="submit"
            variant="solid"
            color="green"
          >
            Lưu
          </Button>
        </Form.Item>
      </Form>

      <NotificationTable />
    </ComponentCard>
  );
};
