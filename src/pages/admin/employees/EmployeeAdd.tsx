import { useEmployeeFields } from '@/configs/employeeForm.config';
import { employeeCreateSchema } from '@/schema/employeeSchema.schema';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import { CreateForm } from '@components/ui/CRUD/CreateForm';
import {
  employeeService,
  type AttendanceDeviceSyncStatus
} from '@services/EmployeeService';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AttendanceDeviceSyncButton from '@components/AttendanceDeviceSyncButton';
import { EmployeeType } from '@/types/employeeType';

export default function EmployeeAdd() {
  const [createdId, setCreatedId] = useState<string | number | null>(null);
  const queryClient = useQueryClient();
  return (
    <>
      <BackButton />
      <ComponentCard title="Thêm nhân sự">
        <p className="mb-4 text-sm text-gray-500">
          Khi lưu nhân viên, hệ thống tự gửi yêu cầu thêm hồ sơ và cấp quyền
          chấm công qua bridge (trừ nhóm tài khoản không đồng bộ). Bạn không cần
          xác nhận thêm; sau khi đồng bộ thành công, lấy vân tay trực tiếp trên
          máy.
        </p>
        {createdId !== null && (
          <AttendanceDeviceSyncButton
            key={createdId}
            id={createdId}
            showInlineStatus
          />
        )}
        <CreateForm
          fields={useEmployeeFields()}
          schema={employeeCreateSchema}
          service={employeeService}
          onCreated={(result) => {
            const response = result as unknown as {
              data: EmployeeType;
              attendance_device?: AttendanceDeviceSyncStatus | null;
            };
            const employee = response.data;
            if (
              employee &&
              ![1, 15, 21, 22].includes(Number(employee.role_id))
            ) {
              if (response.attendance_device) {
                queryClient.setQueryData(
                  ['attendance-device-sync', employee.id],
                  response.attendance_device
                );
              }
              setCreatedId(employee.id);
            } else {
              setCreatedId(null);
            }
          }}
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
