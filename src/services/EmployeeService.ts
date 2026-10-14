import {
  EmployeeCreateType,
  EmployeeType,
  EmployeeUpdateType
} from '@/types/employeeType';
import { CrudService } from '@utils/crudService';
import axiosPrivate from '@/api/axiosInstance';

const ENDPOINT = '/api/employees';

export const employeeService = new CrudService<
  EmployeeType,
  EmployeeCreateType,
  EmployeeUpdateType
>(ENDPOINT);

export interface AttendanceDeviceSyncStatus {
  action?: 'sync' | 'delete';
  status: 'not_requested' | 'pending' | 'processing' | 'succeeded' | 'failed';
  message: string;
}

export const getAttendanceDeviceSyncStatus = (id: string | number) =>
  axiosPrivate.get<unknown, AttendanceDeviceSyncStatus>(
    `${ENDPOINT}/${encodeURIComponent(String(id))}/attendance-device`
  );

export const syncEmployeeToAttendanceDevice = (id: string | number) =>
  axiosPrivate.post<unknown, AttendanceDeviceSyncStatus>(
    `${ENDPOINT}/${encodeURIComponent(String(id))}/attendance-device`,
    { confirmed: true }
  );

export const deleteEmployeeFromAttendanceDevice = (
  id: string | number,
  employeeCode: string
) =>
  axiosPrivate.delete<unknown, AttendanceDeviceSyncStatus>(
    `${ENDPOINT}/${encodeURIComponent(String(id))}/attendance-device`,
    { data: { confirmed: true, employee_code: employeeCode } }
  );
