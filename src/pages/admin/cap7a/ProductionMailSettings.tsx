import { useEffect, useState, type CSSProperties } from 'react';
import {
  Alert,
  Form,
  Input,
  Switch,
  Tag,
  theme,
  Skeleton,
  message,
  App
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiClock, FiSliders } from 'react-icons/fi';
import Button from '@/components/common/AppButton';
import styles from './ProductionMailSettings.module.css';
import QueryErrorNotice from '@/components/common/QueryErrorNotice';
import {
  getCap7AMailSettings,
  sendCap7ATestMail,
  updateCap7AMailSettings,
  type Cap7AMailSettings
} from '@/services/Cap7AService';
import { getApiErrorMessage } from '@/utils/apiError';

const queryKey = ['cap7a', 'production-mail', 'settings'];

export default function ProductionMailSettings() {
  const { modal } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm<Cap7AMailSettings>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getCap7AMailSettings(signal),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  const [enabled, setEnabled] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [saved, setSaved] = useState<Cap7AMailSettings | null>(null);
  const apply = (settings: Cap7AMailSettings) => {
    form.setFieldsValue(settings);
    setEnabled(settings.enabled);
    setRecipient(settings.recipient);
    setSaved(settings);
  };
  useEffect(() => {
    if (query.data && !saved) {
      form.setFieldsValue(query.data);
      setEnabled(query.data.enabled);
      setRecipient(query.data.recipient);
      setSaved(query.data);
    }
  }, [query.data, saved, form]);
  const mutation = useMutation({
    mutationFn: updateCap7AMailSettings,
    onSuccess: (settings) => {
      client.setQueryData(queryKey, settings);
      apply(settings);
      message.success('Đã lưu cấu hình.');
    }
  });
  const changed =
    !!saved && (enabled !== saved.enabled || recipient !== saved.recipient);
  const testMutation = useMutation({
    mutationFn: sendCap7ATestMail,
    retry: false,
    onSuccess: (result) => {
      void message.success(result.message);
    }
  });
  const unavailable =
    !saved || query.isError || mutation.isPending || testMutation.isPending;
  const recipientList = [
    ...new Set(
      recipient
        .split(/[,;\r\n]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
  const sendTest = async () => {
    try {
      await form.validateFields(['recipient']);
    } catch {
      return;
    }
    modal.confirm({
      title: 'Gửi báo cáo hôm nay?',
      content: (
        <div style={{ overflowWrap: 'anywhere' }}>
          <p>Người nhận ({recipientList.length}):</p>
          {recipientList.map((email) => (
            <div key={email}>{email}</div>
          ))}
          {changed && <p>Thay đổi cấu hình chưa được lưu.</p>}
        </div>
      ),
      okText: 'Gửi',
      cancelText: 'Hủy',
      onOk: async () => {
        await testMutation.mutateAsync(recipientList.join(', '));
      }
    });
  };
  const colors = {
    '--mail-text': token.colorText,
    '--mail-secondary': token.colorTextSecondary,
    '--mail-border': token.colorBorderSecondary
  } as CSSProperties;

  const reset = () => {
    if (saved) apply(saved);
    form.setFields([{ name: 'recipient', errors: [] }]);
    mutation.reset();
  };

  return (
    <section
      className={styles.root}
      style={colors}
      aria-labelledby="production-mail-title"
    >
      <header className={styles.header}>
        <div>
          <h3 id="production-mail-title">Báo cáo sản lượng qua email</h3>
        </div>
        <Tag
          className={styles.status}
          color={saved?.enabled ? 'green' : undefined}
        >
          {!saved
            ? 'Chưa tải cấu hình'
            : saved.enabled
              ? 'Tự động: Bật'
              : 'Tự động: Tắt'}
        </Tag>
      </header>

      <QueryErrorNotice
        isError={query.isError}
        isFetching={query.isFetching}
        onRetry={() => query.refetch()}
      />
      {query.isPending && <Skeleton active paragraph={{ rows: 2 }} />}
      {testMutation.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message="Chưa xác nhận được kết quả gửi báo cáo"
          description={getApiErrorMessage(
            testMutation.error,
            'Kiểm tra hộp thư trước khi gửi lại để tránh trùng thư.'
          )}
        />
      )}
      {mutation.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message="Chưa xác nhận được kết quả lưu"
          description={getApiErrorMessage(
            mutation.error,
            'Kiểm tra kết nối và thử lưu lại.'
          )}
        />
      )}

      <div className={styles.layout}>
        <div className={styles.settings}>
          <section aria-labelledby="mail-settings-title">
            <div className={styles.sectionTitle}>
              <FiSliders aria-hidden="true" />
              <h4 id="mail-settings-title">Cấu hình gửi</h4>
            </div>
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              disabled={unavailable}
              onFinish={() => {
                if (!unavailable && changed)
                  mutation.mutate({ enabled, recipient: recipient.trim() });
              }}
              scrollToFirstError={{ focus: true }}
            >
              <div className={styles.toggleRow}>
                <div>
                  <label htmlFor="production-mail-enabled">
                    Tự động gửi báo cáo
                  </label>
                  <p>Áp dụng cho cả hai camera.</p>
                </div>
                <Switch
                  id="production-mail-enabled"
                  checked={enabled}
                  onChange={setEnabled}
                  aria-label="Tự động gửi báo cáo"
                  checkedChildren="Bật"
                  unCheckedChildren="Tắt"
                />
              </div>

              <Form.Item
                name="recipient"
                label="Email nhận báo cáo"
                validateTrigger="onBlur"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: 'Vui lòng nhập email nhận báo cáo.'
                  },
                  {
                    validator: async (_, value: string) => {
                      const emails = [
                        ...new Set(
                          (value || '')
                            .split(/[,;\r\n]+/)
                            .map((email) => email.trim().toLowerCase())
                            .filter(Boolean)
                        )
                      ];
                      if (!emails.length)
                        throw new Error('Vui lòng nhập email nhận báo cáo.');
                      if (emails.length > 20)
                        throw new Error('Chỉ được nhập tối đa 20 email.');
                      const invalid = emails.find(
                        (email) =>
                          email.length > 254 ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                      );
                      if (invalid)
                        throw new Error(`Email không hợp lệ: ${invalid}`);
                    }
                  }
                ]}
                extra="Tối đa 20 email, cách nhau bằng dấu phẩy hoặc xuống dòng."
              >
                <Input.TextArea
                  size="large"
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  placeholder="nguoinhan1@congty.com, nguoinhan2@congty.com"
                  spellCheck={false}
                  onChange={(event) => setRecipient(event.target.value)}
                />
              </Form.Item>

              <div className={styles.actions}>
                <Button
                  tone="success"
                  htmlType="submit"
                  disabled={unavailable || !changed}
                  loading={mutation.isPending}
                  aria-describedby="mail-save-note"
                >
                  Lưu cấu hình
                </Button>
                <Button disabled={unavailable || !changed} onClick={reset}>
                  Đặt lại
                </Button>
                <Button
                  disabled={unavailable}
                  loading={testMutation.isPending}
                  onClick={() => void sendTest()}
                >
                  Gửi báo cáo hôm nay
                </Button>
              </div>
              <p id="mail-save-note" className={styles.note}>
                {changed && 'Có thay đổi chưa lưu. '}
                Cấu hình áp dụng cả báo cáo đang chờ gửi.
              </p>
            </Form>
          </section>

          <section className={styles.rules} aria-labelledby="mail-rules-title">
            <div className={styles.sectionTitle}>
              <FiClock aria-hidden="true" />
              <h4 id="mail-rules-title">Điều kiện gửi tự động</h4>
            </div>
            <p>
              Gửi khi thoát ứng dụng, nếu đã chạy ít nhất{' '}
              <strong>10 phút</strong>.
            </p>
            <p className={styles.note}>
              Gửi thủ công không cần chờ đủ 10 phút.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
