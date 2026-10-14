import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, message } from 'antd';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { useEffect } from 'react';
import { ZodObject, ZodRawShape } from 'zod';

import { ApiErrorResponse } from '@/types/apiType';
import { FieldConfig } from '@/types/form';
import { convertToFormData } from '@/utils/convertToFormData';
import { convertDateStringsToDayjs } from '@utils/convertDateStringsToDayjs';
import { CrudServiceType } from '@utils/crudService';
import { handleValidationErrors } from '@utils/handleValidationError';
import { formatJsonData } from '@utils/formatJsonData';

interface UseDynamicCrudFormProps<TData, TCreateDto, TUpdateDto> {
  id?: string | number;
  service: CrudServiceType<TData, TCreateDto, TUpdateDto>;
  onSuccess?: () => void;
  onCreated?: (result: TData) => void;
  onError?: (error: unknown) => void;
  schema?: ZodObject<ZodRawShape>; // optional zod schema
  form?: ReturnType<typeof Form.useForm>[0];
  config?: AxiosRequestConfig; // optional axios config
  fields?: FieldConfig[]; // optional fields for the form
  isFetchData?: boolean; // optional flag to fetch data
}

export function useDynamicCrudForm<
  TData extends object,
  TCreateDto extends object = TData,
  TUpdateDto extends object = TCreateDto
>({
  id,
  service,
  onSuccess,
  onCreated,
  onError,
  schema,
  form,
  config,
  fields,
  isFetchData = false
}: UseDynamicCrudFormProps<TData, TCreateDto, TUpdateDto>) {
  const [internalForm] = Form.useForm();
  const queryClient = useQueryClient();
  const activeForm = form || internalForm;

  type TFormData = TCreateDto | TUpdateDto;

  const {
    data: defaultValues,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['form-data', id],
    queryFn: () => service.get(id!),
    enabled: !!id && isFetchData
  });
  useEffect(() => {
    if (defaultValues) {
      const parsedValues = convertDateStringsToDayjs(defaultValues);

      activeForm.setFieldsValue(parsedValues);
    }
  }, [defaultValues, activeForm]);

  const mutation = useMutation({
    mutationFn: async (values: TFormData) => {
      const isFormData =
        config?.headers?.['Content-Type'] === 'multipart/form-data';
      const payload = isFormData
        ? convertToFormData({
            values,
            action: id ? 'update' : 'create',
            fields: fields
          })
        : formatJsonData({
            data: values,
            fields: fields
          });

      return id
        ? isFormData
          ? service.update(id, payload as TUpdateDto, config)
          : service.updatePatch(id, payload as TUpdateDto, config)
        : service.create(payload as TCreateDto, config);
    },
    onSuccess: (result) => {
      message.success(id ? 'Cập nhật thành công' : 'Tạo mới thành công');
      if (!id) {
        activeForm.resetFields();
        onCreated?.(result);
      }
      queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (err) => {
      message.error(id ? 'Cập nhật thất bại' : 'Tạo mới thất bại');
      onError?.(err);
      activeForm.setFields([]);
      if (schema) {
        const formatted = handleValidationErrors<TFormData>(
          err as AxiosError<ApiErrorResponse>
        );
        if (formatted) {
          activeForm.setFields(formatted);
        }
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!service.delete) {
        return Promise.reject(new Error('Delete service is not defined'));
      }
      return service.delete(id!);
    },
    onSuccess: () => {
      message.success('Xóa thành công');
      onSuccess?.();
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      message.error('Xóa thất bại');
      onError?.(err);
    }
  });

  const restoreMutation = useMutation({
    mutationFn: () => {
      if (!service.restore) {
        return Promise.reject(new Error('Restore service is not defined'));
      }
      return service.restore(id!);
    },
    onSuccess: () => {
      message.success('Khôi phục thành công');
      onSuccess?.();
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      message.error('Khôi phục thất bại');
      onError?.(err);
    }
  });
  const forceDeleteMutation = useMutation({
    mutationFn: () => {
      if (!service.forceDelete) {
        return Promise.reject(new Error('ForceDelete service is not defined'));
      }
      return service.forceDelete(id!);
    },
    onSuccess: () => {
      message.success('Xoá vĩnh viễn thành công');
      onSuccess?.();
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      const axiosErr = err as AxiosError<{ message?: string }>;
      message.error(
        axiosErr?.response?.data?.message || 'Xoá vĩnh viễn thất bại'
      );
      onError?.(err);
    }
  });

  return {
    form: activeForm,
    handleFinish: mutation.mutate,
    isLoading: isFetching || mutation.isPending,
    isDeleting: deleteMutation.isPending,
    deleteItem: deleteMutation.mutate,
    isRestoring: restoreMutation.isPending,
    restoreItem: restoreMutation.mutate,
    isForceDeleting: forceDeleteMutation.isPending,
    forceDeleteItem: forceDeleteMutation.mutate,
    refetch,
    resetForm: () => activeForm.resetFields()
  };
}
