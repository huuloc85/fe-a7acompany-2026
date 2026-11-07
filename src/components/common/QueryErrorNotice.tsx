import { Alert } from 'antd';
import Button from '@components/common/AppButton';

export default function QueryErrorNotice({
  isError,
  isFetching,
  onRetry
}: {
  isError: boolean;
  isFetching: boolean;
  onRetry: () => unknown;
}) {
  if (!isError) return null;
  return (
    <Alert
      className="ui-load-error"
      type="error"
      showIcon
      role="alert"
      message="Không tải được dữ liệu"
      description="Dữ liệu đang hiển thị có thể chưa cập nhật. Vui lòng thử lại."
      action={
        <Button
          tone="inherit"
          loading={isFetching}
          onClick={() => void onRetry()}
        >
          Thử lại
        </Button>
      }
    />
  );
}
