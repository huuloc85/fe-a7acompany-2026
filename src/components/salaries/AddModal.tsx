import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker, Form, FormProps, Input, message, Modal } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';

import { addSalary, AddSalaryParams } from '@services/SalaryService';

import AppButton from '@components/common/AppButton';
import { FaPlus } from 'react-icons/fa6';

type FormField = {
  title: string;
  start_date: Dayjs | null;
  end_date: Dayjs | null;
  importVVP: File;
  importA7A: File;
};

type AddSalaryProps = {
  onCreated?: () => void;
};

export const AddSalary: React.FC<AddSalaryProps> = ({ onCreated }) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormField>();

  const [open, setOpen] = useState(false);
  const [vvpFile, setVvpFile] = useState<File>();
  const [a7aFile, setA7aFile] = useState<File>();

  const getSalaryPeriodByMonth = (month: number, year: number) => {
    if (month < 1 || month > 12 || year < 1900) return null;

    const formattedMonth = String(month).padStart(2, '0');
    const endDate = dayjs(`${year}-${formattedMonth}-15`);
    const startDate = dayjs(`${year}-${formattedMonth}-01`)
      .subtract(1, 'month')
      .date(16);

    return { startDate, endDate };
  };

  const formatDefaultTitle = (salaryMonth: Dayjs) => {
    return `Bảng Lương Tháng ${salaryMonth.format('MM-YYYY')}`;
  };

  const syncSalaryPeriodFromTitle = (title: string) => {
    const match = title.match(/tháng\s*(\d{1,2})(?:\s*[./-]\s*(\d{4}))?/i);
    if (!match) return;

    const month = Number(match[1]);
    const year = Number(match[2] || dayjs().year());
    const salaryPeriod = getSalaryPeriodByMonth(month, year);
    if (!salaryPeriod) return;

    form.setFieldsValue({
      start_date: salaryPeriod.startDate,
      end_date: salaryPeriod.endDate
    });
  };

  const showModal = () => {
    const currentMonth = dayjs().month() + 1;
    const currentYear = dayjs().year();
    const currentSalaryPeriod = getSalaryPeriodByMonth(
      currentMonth,
      currentYear
    );

    setOpen(true);
    if (!currentSalaryPeriod) return;

    form.setFieldsValue({
      title: formatDefaultTitle(currentSalaryPeriod.endDate),
      start_date: currentSalaryPeriod.startDate,
      end_date: currentSalaryPeriod.endDate
    });
  };

  const onCancel = () => {
    form.resetFields();
    setVvpFile(undefined);
    setA7aFile(undefined);
    setOpen(false);
  };

  const getErrorMessage = (error: unknown) => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'Lỗi khi thêm bản lương';
  };

  const { mutate, isPending } = useMutation({
    mutationKey: ['addSalary'],
    mutationFn: (data: AddSalaryParams) => {
      return addSalary({
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        importA7A: data.importA7A,
        importVVP: data.importVVP
      });
    },
    onSuccess: () => {
      message.success('Thêm bản lương thành công');
      onCancel();
      onCreated?.();
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error));
      console.error('Failed to add salary', error);
    }
  });

  const onFinish: FormProps<FormField>['onFinish'] = async (
    value: FormField
  ) => {
    if (!vvpFile || !a7aFile) {
      message.error('Vui lòng chọn đủ file VVP và A7A');
      return;
    }

    const data: AddSalaryParams = {
      title: value.title,
      start_date: value.start_date?.format('YYYY-MM-DD') || '',
      end_date: value.end_date?.format('YYYY-MM-DD') || '',
      importVVP: vvpFile,
      importA7A: a7aFile
    };

    mutate(data);
  };

  const formProps: FormProps = {
    layout: 'vertical',
    onFinish: onFinish,
    form: form
  };

  return (
    <>
      <AppButton tone="success" icon={<FaPlus />} onClick={showModal}>
        Thêm bản lương
      </AppButton>

      <Modal
        title="Thêm bản lương"
        open={open}
        onCancel={onCancel}
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
            <Input
              onChange={(e) => syncSalaryPeriodFromTitle(e.target.value)}
            />
          </Form.Item>
          <Form.Item<FormField>
            name="start_date"
            label="Ngày bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabled
            />
          </Form.Item>
          <Form.Item<FormField>
            name="end_date"
            label="Ngày kết thúc"
            rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabled
            />
          </Form.Item>

          <Form.Item<FormField>
            name="importVVP"
            label="Chọn file VVP"
            rules={[{ required: true, message: 'Vui lòng chọn file VVP' }]}
          >
            <Input
              type="file"
              accept=".xls,.xlsx,.xlsb,.xlsm,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setVvpFile(file);
              }}
            />
          </Form.Item>
          <Form.Item<FormField>
            name="importA7A"
            label="Chọn file A7A"
            rules={[{ required: true, message: 'Vui lòng chọn file A7A' }]}
          >
            <Input
              type="file"
              accept=".xls,.xlsx,.xlsb,.xlsm,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setA7aFile(file);
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
