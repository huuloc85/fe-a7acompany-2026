import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker, Form, FormProps, Input, message, Modal } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';

import { addWorkSchedule } from '@services/workScheduleService';

import AppButton from '@components/common/AppButton';
import { FaPlus } from 'react-icons/fa';
import dayjs from 'dayjs';

type FormField = {
  title: string;
  start_date: Dayjs | null;
  fileImport: File;
};

type AddWorkScheduleProps = {
  onCreated?: () => void;
};

export const AddWorkSchedule: React.FC<AddWorkScheduleProps> = ({
  onCreated
}) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormField>();

  const [open, setOpen] = useState(false);
  const [scheduleFile, setScheduleFile] = useState<File>();

  const formatDefaultTitle = () => {
    return `LỊCH LÀM VIỆC THÁNG .${dayjs().year()}`;
  };

  const syncStartDateFromTitle = (title: string) => {
    const match = title.match(/tháng\s*(\d{1,2})(?:\s*[./-]\s*(\d{4}))?/i);
    if (!match) return;

    const month = Number(match[1]);
    const year = Number(match[2] || dayjs().year());
    if (month < 1 || month > 12 || year < 1900) return;

    form.setFieldValue('start_date', dayjs(`${year}-${month}-01`));
  };

  const handleOpen = () => {
    setOpen(true);
    form.setFieldsValue({
      title: formatDefaultTitle()
    });
  };

  const handleClose = () => {
    setOpen(false);
    setScheduleFile(undefined);
    form.resetFields();
  };

  const { mutate, isPending } = useMutation({
    mutationFn: addWorkSchedule,
    mutationKey: ['addWorkSchedule'],
    onSuccess: () => {
      onCreated?.();
      queryClient.invalidateQueries({ queryKey: ['workSchedules'] });
      message.success('Thêm lịch làm việc thành công');
      handleClose();
    },
    onError: (error) => {
      message.error(error.message);
    }
  });

  const onFinish: FormProps<FormField>['onFinish'] = async (
    value: FormField
  ) => {
    const data = {
      title: value.title,
      start_date: value.start_date?.format('YYYY-MM-01') || '',
      fileImport: scheduleFile as File
    };
    mutate(data);
  };

  const formProps: FormProps = {
    form,
    layout: 'vertical',
    onFinish: onFinish
  };

  return (
    <>
      <AppButton tone="success" icon={<FaPlus />} onClick={handleOpen}>
        Thêm lịch làm việc
      </AppButton>
      <Modal
        title="Thêm lịch làm việc"
        open={open}
        onCancel={handleClose}
        destroyOnHidden
        centered
        footer={null}
      >
        <Form {...formProps}>
          <Form.Item<FormField>
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input onChange={(e) => syncStartDateFromTitle(e.target.value)} />
          </Form.Item>
          <Form.Item<FormField>
            name="start_date"
            label="Chọn tháng"
            rules={[{ required: true, message: 'Vui lòng chọn chọn tháng' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="MM/YYYY"
              picker="month"
            />
          </Form.Item>

          <Form.Item<FormField>
            name="fileImport"
            label="Chọn file"
            rules={[{ required: true, message: 'Vui lòng chọn file' }]}
          >
            <Input
              type="file"
              accept=".xls,.xlsx,.xlsb,.xlsm,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setScheduleFile(file);
                }
              }}
            />
          </Form.Item>
          <div className="text-end">
            <AppButton tone="success" htmlType="submit" loading={isPending}>
              Import
            </AppButton>
          </div>
        </Form>
      </Modal>
    </>
  );
};
