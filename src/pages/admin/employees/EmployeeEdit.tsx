import { useEmployeeFields } from '@/configs/employeeForm.config';
import { employeeUpdateSchema } from '@/schema/employeeSchema.schema';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import { UpdateForm } from '@components/ui/CRUD/UpdateForm';
import { employeeService } from '@services/EmployeeService';
import { resetPassword } from '@services/ProfileService';
import { handleApiError } from '@utils/handleApiError';
import { useMutation } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { Button, message } from 'antd';
import AttendanceDeviceSyncButton from '@components/AttendanceDeviceSyncButton';

const routeApi = getRouteApi('/_authenticated/admin/employees/edit/$id');

export default function EmployeeEdit() {
  const { id } = routeApi.useParams();

  const { mutate, isPending } = useMutation({
    mutationKey: ['updateEmployee', id],
    mutationFn: () => resetPassword(id),
    onMutate: () => {
      message.loading({
        content: 'Đang đặt lại mật khẩu...',
        key: 'resetPassword'
      });
    },
    onSuccess: () => {
      message.success({
        content: 'Đặt lại mật khẩu thành công',
        key: 'resetPassword'
      });
    },
    onError: (error: unknown) => {
      message.error({
        content: handleApiError(error),
        key: 'resetPassword'
      });
    }
  });

  return (
    <>
      <BackButton to="/admin/employees" />
      <ComponentCard title="Cập nhật nhân sự">
        <div className="text-end">
          <AttendanceDeviceSyncButton id={id} />
          <AttendanceDeviceSyncButton id={id} action="delete" />
          <Button
            color="danger"
            variant="outlined"
            onClick={() => mutate()}
            loading={isPending}
          >
            Đặt lại mật khẩu
          </Button>
        </div>
        <UpdateForm
          id={id}
          fields={useEmployeeFields()}
          schema={employeeUpdateSchema}
          service={employeeService}
          config={{
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }}
        />
      </ComponentCard>
    </>
  );
}
