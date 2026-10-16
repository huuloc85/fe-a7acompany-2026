import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { customFormProps } from '@components/custom/FormProps.custom';
import { GenderEnumOptions } from '@schemas/genderEnum.schema';
import {
  MaritalStatus,
  MaritalStatusEnumOptions
} from '@schemas/maritalStatusEnum.schema';
import { fetchProfile, updateProfile } from '@services/ProfileService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DatePicker, Form, FormProps, Input, message, Select } from 'antd';
import { useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { ProfileUpdateParams } from '@/types/profileType';
import { FaUserEdit } from 'react-icons/fa';

interface FormField {
  name: string;
  phone: string;
  email?: string;
  birthday: Dayjs;
  address: string;
  hometown: string;
  CCCD: string;
  gender: string;
  maritalStatus: MaritalStatus;
}

export const ChangeInfo = () => {
  const [form] = Form.useForm<FormField>();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => await fetchProfile()
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['updateProfile'],
    mutationFn: async (values: ProfileUpdateParams) => {
      await updateProfile(values);
    },
    onMutate: () => {
      message.loading({ content: 'Đang cập nhật...', key: 'updateProfile' });
    },
    onSuccess: () => {
      message.success({
        content: 'Cập nhật thông tin thành công',
        key: 'updateProfile',
        duration: 2
      });
    },
    onError: () => {
      message.error({
        content: 'Cập nhật thông tin thất bại',
        key: 'updateProfile',
        duration: 2
      });
    }
  });

  const getFormFieldsFromProfile = useCallback(
    (data: NonNullable<typeof profileData>) => ({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      birthday: dayjs(data.birthday),
      address: data.address,
      hometown: data.home_town,
      CCCD: data.CCCD,
      gender: data.gender,
      maritalStatus: data.marital_status
    }),
    []
  );

  // Update form values when profileData is loaded
  useEffect(() => {
    if (profileData) {
      form.setFieldsValue(getFormFieldsFromProfile(profileData));
    }
  }, [profileData, form, getFormFieldsFromProfile]);

  const handleUpdateProfile = (values: FormField) => {
    const formatData: ProfileUpdateParams = {
      ...values,
      home_town: values.hometown,
      birthday: values.birthday.format('YYYY-MM-DD'),
      gender: values.gender,
      marital_status: values.maritalStatus
    };
    mutate(formatData);
  };

  const formProps: FormProps = {
    ...customFormProps,
    form,
    disabled: isLoading || isPending,
    onFinish: (values) => {
      handleUpdateProfile(values);
    }
  };

  return (
    <>
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaUserEdit className="text-blue-500" />
            <span>Hồ sơ cá nhân</span>
          </div>
        }
      >
        <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <Form<FormField> {...formProps}>
            <Form.Item<FormField>
              label="Họ và tên"
              name={'name'}
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập họ và tên'
                }
              ]}
            >
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>
            <Form.Item<FormField>
              label="Số điện thoại"
              name={'phone'}
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập số điện thoại'
                },
                {
                  pattern: /^(0|\+84)[0-9]{9}$/,
                  message: 'Vui lòng nhập số điện thoại hợp lệ'
                }
              ]}
            >
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>
            <Form.Item<FormField>
              label="Email"
              name={'email'}
              rules={[
                {
                  type: 'email',
                  message: 'Vui lòng nhập email hợp lệ. VD: example@gmail.com'
                }
              ]}
            >
              <Input placeholder="Nhập email" />
            </Form.Item>
            <Form.Item<FormField>
              label="Ngày sinh"
              name={'birthday'}
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập ngày sinh'
                }
              ]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item<FormField>
              label="CCCD"
              name={'CCCD'}
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập CCCD'
                },
                {
                  pattern: /^\d{12}$/,
                  message: 'Vui lòng nhập số CCCD hợp lệ (12 chữ số)'
                }
              ]}
            >
              <Input placeholder="Nhập CCCD" />
            </Form.Item>
            <Form.Item<FormField>
              label="Địa chỉ"
              name={'address'}
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập địa chỉ'
                }
              ]}
            >
              <Input.TextArea placeholder="Nhập địa chỉ" />
            </Form.Item>
            <Form.Item<FormField>
              label="Quê quán"
              name={'hometown'}
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập quê quán'
                }
              ]}
            >
              <Input.TextArea placeholder="Nhập quê quán" />
            </Form.Item>
            <Form.Item<FormField>
              label="Giới tính"
              name="gender"
              rules={[
                {
                  required: true,
                  message: 'Vui lòng chọn giới tính'
                }
              ]}
            >
              <Select
                options={GenderEnumOptions}
                placeholder="Chọn giới tính"
              />
            </Form.Item>
            <Form.Item<FormField>
              label="Tình trạng hôn nhân"
              name="maritalStatus"
              rules={[
                {
                  required: true,
                  message: 'Vui lòng chọn tình trạng hôn nhân'
                }
              ]}
            >
              <Select
                options={MaritalStatusEnumOptions}
                placeholder="Chọn tình trạng hôn nhân"
              />
            </Form.Item>
            <Form.Item>
              <div className="flex gap-2">
                <AppButton
                  tone="primary"
                  htmlType="submit"
                  disabled={isLoading || isPending}
                  className="px-6"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </AppButton>
                <AppButton
                  tone="neutral"
                  htmlType="button"
                  className="px-6"
                  onClick={() => {
                    if (profileData) {
                      form.setFieldsValue(
                        getFormFieldsFromProfile(profileData)
                      );
                    }
                  }}
                >
                  Đặt lại
                </AppButton>
              </div>
            </Form.Item>
          </Form>
        </div>
      </ComponentCard>
    </>
  );
};
