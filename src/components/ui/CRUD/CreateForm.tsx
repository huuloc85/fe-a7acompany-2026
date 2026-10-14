import { ZodObject, ZodRawShape } from 'zod';
import { AxiosRequestConfig } from 'axios';

import { useDynamicCrudForm } from '@/hooks/useDynamicCrudForm';
import { FieldConfig } from '@/types/form';
import { DynamicForm } from '@components/DynamicForm';
import { CrudServiceType } from '@utils/crudService';
import { zodToAntdRules } from '@utils/zodToAntdRules';

interface CreateRoleFormProps<
  TData extends object,
  TCreateDto extends object,
  TUpdateDto extends object
> {
  service: CrudServiceType<TData, TCreateDto, TUpdateDto>;
  schema: ZodObject<ZodRawShape>;
  fields: FieldConfig[];
  isGrid?: boolean;
  config?: AxiosRequestConfig;
  onSuccess?: () => void;
  onCreated?: (result: TData) => void;
}

export function CreateForm<
  TData extends object,
  TCreateDto extends object,
  TUpdateDto extends object
>({
  service,
  schema,
  fields = [],
  isGrid = true,
  config = {},
  onCreated,
  onSuccess = () => {}
}: CreateRoleFormProps<TData, TCreateDto, TUpdateDto>) {
  const ruleMap = zodToAntdRules({ schema, fields });

  const { form, handleFinish, isLoading, resetForm } = useDynamicCrudForm({
    service: service,
    onCreated,
    onSuccess: (): void => {
      onSuccess();
      resetForm();
    },
    schema: schema,
    config: config,
    fields: fields
  });

  return (
    <DynamicForm
      form={form}
      fields={fields}
      onFinish={handleFinish}
      loading={isLoading}
      submitButtonText="Thêm"
      resetForm={resetForm}
      zodRules={ruleMap}
      isGrid={isGrid}
    />
  );
}
