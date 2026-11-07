import { Tag } from 'antd';
import {
  REQUEST_FORM_STATUSES,
  type RequestFormStatus
} from '@/types/requestFormType';

export interface AttendanceRequest {
  id: number;
  type: 'don_xin_nghi_phep' | 'don_xin_di_tre_ve_som';
  status: RequestFormStatus;
  rejection_reason: string | null;
  time_in: string | null;
  time_out: string | null;
}

export function AttendanceRequestStatus({
  requests
}: {
  requests?: AttendanceRequest[];
}) {
  if (!requests?.length) return null;

  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-1">
      {requests.map((request) => (
        <div key={request.id} className="w-full min-w-0">
          <Tag
            color={
              request.status === 'approved'
                ? 'success'
                : request.status === 'rejected'
                  ? 'error'
                  : 'warning'
            }
            className="!mr-0 !max-w-full !whitespace-normal"
          >
            {request.type === 'don_xin_nghi_phep'
              ? 'Nghỉ phép'
              : 'Đi trễ - về sớm'}
            {' · '}
            {REQUEST_FORM_STATUSES[request.status]}
            {' · '}#{request.id}
          </Tag>
          {request.type === 'don_xin_di_tre_ve_som' &&
            (request.time_in || request.time_out) && (
              <div className="text-xs text-gray-500">
                Giờ xin phép:{' '}
                {[
                  request.time_in && `Vào ${request.time_in}`,
                  request.time_out && `Ra ${request.time_out}`
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          {request.status === 'rejected' && request.rejection_reason && (
            <div className="text-xs break-words text-gray-500">
              Lý do: {request.rejection_reason}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
