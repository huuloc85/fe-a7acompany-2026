import { useState } from 'react';
import { Alert, Button, Input, Modal } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAttendanceDeviceSyncStatus,
  syncEmployeeToAttendanceDevice,
  deleteEmployeeFromAttendanceDevice
} from '@services/EmployeeService';

export default function AttendanceDeviceSyncButton({
  id,
  initiallyOpen = false,
  showInlineStatus = false,
  action = 'sync'
}: {
  id: string | number;
  initiallyOpen?: boolean;
  showInlineStatus?: boolean;
  action?: 'sync' | 'delete';
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [tracking, setTracking] = useState(false);
  const deleting = action === 'delete';
  const validId = String(id).trim() !== '' && String(id) !== '0';
  const queryClient = useQueryClient();
  const queryKey = ['attendance-device-sync', id];
  const statusQuery = useQuery({
    queryKey,
    queryFn: () => getAttendanceDeviceSyncStatus(id),
    enabled: (open || showInlineStatus || tracking) && validId,
    staleTime: 0,
    refetchInterval: (query) =>
      ['pending', 'processing'].includes(query.state.data?.status ?? '')
        ? 2000
        : false
  });
  const status = statusQuery.data;
  const waiting =
    status?.status === 'pending' || status?.status === 'processing';
  const matchingAction = (status?.action ?? 'sync') === action;
  const completed = matchingAction && status?.status === 'succeeded';
  const showStatus = showInlineStatus || tracking;

  const sync = async () => {
    if (
      pending ||
      waiting ||
      !validId ||
      (deleting && confirmationCode !== String(id))
    )
      return;
    setPending(true);
    setError('');
    try {
      const response = deleting
        ? await deleteEmployeeFromAttendanceDevice(id, confirmationCode)
        : await syncEmployeeToAttendanceDevice(id);
      queryClient.setQueryData(queryKey, response);
      setTracking(true);
      setOpen(false);
      setConfirmationCode('');
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(
        apiError.response?.data?.message ||
          'Không gửi được yêu cầu tới host. Nhân viên vẫn được lưu trên web; bạn có thể thử lại.'
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {showStatus && (
        <Alert
          className="my-3 text-left"
          showIcon
          type={
            statusQuery.isError || !validId || status?.status === 'failed'
              ? 'error'
              : status?.status === 'succeeded'
                ? 'success'
                : 'info'
          }
          message={`Máy chấm công · ${id}`}
          description={
            !validId
              ? 'Mã nhân viên không hợp lệ. Mở lại hồ sơ từ danh sách.'
              : statusQuery.isError
                ? 'Chưa đọc được trạng thái trên host. Hồ sơ web vẫn được giữ; tải lại để kiểm tra.'
                : status?.status === 'not_requested'
                  ? 'Nhân viên đã lưu nhưng chưa có yêu cầu đồng bộ. Kiểm tra BE đã cập nhật, hoặc dùng nút đồng bộ bên dưới.'
                  : status
                    ? `${status.message}${waiting ? ' Bạn có thể tiếp tục công việc, không cần giữ hộp thoại mở.' : ''}`
                    : 'Đang đọc trạng thái đồng bộ…'
          }
          action={
            statusQuery.isError ? (
              <Button size="small" onClick={() => void statusQuery.refetch()}>
                Tải lại
              </Button>
            ) : undefined
          }
        />
      )}
      <Button
        danger={deleting}
        onClick={() => {
          setConfirmationCode('');
          setError('');
          setOpen(true);
        }}
      >
        {waiting
          ? 'Xem tiến độ'
          : deleting
            ? 'Xóa khỏi máy chấm công'
            : showInlineStatus
              ? 'Chi tiết đồng bộ'
              : 'Đồng bộ máy chấm công'}{' '}
        · {id}
      </Button>
      <Modal
        open={open}
        title={
          deleting
            ? 'Xóa nhân viên khỏi máy chấm công?'
            : 'Thêm nhân viên vào máy chấm công?'
        }
        okText={
          completed
            ? 'Hoàn tất'
            : waiting
              ? 'Đang chờ đồng bộ'
              : error || status?.status === 'failed'
                ? 'Thử lại'
                : deleting
                  ? 'Xác nhận xóa trên thiết bị'
                  : 'Xác nhận đồng bộ'
        }
        okButtonProps={{
          danger: deleting && !completed,
          disabled:
            !validId ||
            waiting ||
            statusQuery.isFetching ||
            statusQuery.isError ||
            (!completed && deleting && confirmationCode !== String(id))
        }}
        cancelText="Đóng"
        confirmLoading={pending}
        cancelButtonProps={{ disabled: pending }}
        closable={!pending}
        maskClosable={!pending}
        keyboard={!pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onOk={completed ? () => setOpen(false) : sync}
      >
        {!validId && (
          <Alert
            type="error"
            showIcon
            message="Mã nhân viên không hợp lệ. Mở lại hồ sơ từ danh sách nhân viên trước khi đồng bộ."
          />
        )}
        {deleting ? (
          <>
            <Alert
              type="warning"
              showIcon
              message={`Xóa hồ sơ mã ${id} khỏi máy chấm công, có thể mất vân tay/khuôn mặt đã đăng ký trên thiết bị.`}
              description="Chỉ xóa trên thiết bị. Hồ sơ nhân viên và dữ liệu công trên web được giữ nguyên. Nếu thêm lại, có thể phải đăng ký lại vân tay. Không thể hoàn tác bằng nút khôi phục trên web."
            />
            <p className="mt-3">
              Bridge tại công ty sẽ xử lý yêu cầu; bạn không cần ở cùng mạng.
              Không gửi yêu cầu thêm lại trong lúc đang xóa.
            </p>
            {!completed && (
              <div className="mt-3">
                <label htmlFor={`delete-device-code-${id}`}>
                  Nhập chính xác mã {id} để xác nhận:
                </label>
                <Input
                  id={`delete-device-code-${id}`}
                  value={confirmationCode}
                  onChange={(event) => setConfirmationCode(event.target.value)}
                  disabled={pending || waiting}
                  autoComplete="off"
                />
              </div>
            )}
          </>
        ) : (
          <>
            <p>
              Nhân viên mã <strong>{id}</strong> đã được lưu trên web. Hệ thống
              sẽ thêm hồ sơ và cấp quyền chấm công trên máy đã cấu hình, không
              xóa hồ sơ hoặc vân tay có sẵn.
            </p>
            <p className="mt-3">
              Host lưu yêu cầu; máy tính trung gian tại công ty sẽ xử lý khi
              đang bật và kết nối cùng LAN với máy chấm công. Bạn có thể đóng
              hộp thoại trong lúc chờ. Sau khi thành công, đăng ký vân tay trực
              tiếp trên máy.
            </p>
          </>
        )}
        {status &&
          status.status !== 'not_requested' &&
          (matchingAction || waiting) && (
            <Alert
              className="mt-3"
              showIcon
              type={
                status.status === 'succeeded'
                  ? 'success'
                  : status.status === 'failed'
                    ? 'error'
                    : 'info'
              }
              message={status.message}
            />
          )}
        {statusQuery.isError && (
          <p role="alert" className="mt-3 text-red-600">
            Không đọc được trạng thái trên host.{' '}
            <Button size="small" onClick={() => void statusQuery.refetch()}>
              Tải lại
            </Button>
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-red-600">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
