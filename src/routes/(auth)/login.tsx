// Credential Management API – not yet in TS's default lib definitions
declare global {
  interface PasswordCredentialInit {
    id: string;
    password: string;
  }
  interface PasswordCredential extends Credential {
    readonly password: string;
  }
  // eslint-disable-next-line no-var
  var PasswordCredential:
    | {
        new (init: PasswordCredentialInit): PasswordCredential;
        prototype: PasswordCredential;
      }
    | undefined;
}

import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createFileRoute,
  useNavigate,
  useSearch
} from '@tanstack/react-router';
import type { FormProps } from 'antd';
import { Button, Form, Input, message, Modal } from 'antd';

import {
  authCancelLogin,
  authConfirmLogin,
  authLogin
} from '@services/AuthService';
import { shouldEnforceDuplicateLoginForRole } from '@utils/authUtil';
import { getSafeAuthRedirect } from '@utils/authRedirect';
import logo from '@assets/images/logo/logoAsset.svg';

import { FaRegUser } from 'react-icons/fa';
import { IoLockClosedOutline } from 'react-icons/io5';
import { FiArrowRight, FiShield } from 'react-icons/fi';
import { useMidAutumnMode } from '@hooks/useMidAutumnMode';

type FieldType = {
  username: string;
  password: string;
};

type LoginSearch = {
  redirect?: string;
};

const storeBrowserPassword = async (username: string, password: string) => {
  if (!window.PasswordCredential) return;

  try {
    const PC = window.PasswordCredential;
    const cred = new PC({
      id: username,
      password
    });

    await navigator.credentials.store(cred);
  } catch {
    // Ignore password-store failures; login should still navigate smoothly.
  }
};

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: search.redirect as string | undefined
  }),
  head: () => ({
    title: 'Đăng nhập',
    meta: [
      {
        name: 'description',
        content: 'Trang đăng nhập của ứng dụng'
      }
    ]
  })
});

function RouteComponent() {
  const isMidAutumn = useMidAutumnMode();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const search = useSearch({ from: '/(auth)/login' });

  useEffect(() => {
    const logoutMessage = sessionStorage.getItem('auth_logout_message');
    if (!logoutMessage) return;

    sessionStorage.removeItem('auth_logout_message');
    message.warning(logoutMessage);
  }, []);

  useEffect(() => {
    if (search.redirect && !getSafeAuthRedirect(search.redirect)) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [search.redirect]);

  const { mutate: loginMutation, isPending } = useMutation({
    mutationKey: ['authLogin'],
    mutationFn: ({ username, password }: FieldType) =>
      authLogin(username, password),
    onSuccess: (response) => {
      message.success('Đăng nhập thành công!');

      const redirectTo = getSafeAuthRedirect(search.redirect) ?? '/';

      const continueAfterLogin = async () => {
        const values = lastValuesRef.current;
        if (values) {
          void storeBrowserPassword(values.username, values.password);
        }

        await navigate({ to: redirectTo as '/', replace: true });
      };

      const shouldShowLoginConflict =
        response.logged_in_elsewhere &&
        shouldEnforceDuplicateLoginForRole(response.role_name);

      if (shouldShowLoginConflict) {
        Modal.confirm({
          className: 'login-conflict-modal',
          centered: true,
          maskClosable: false,
          width: 500,
          title: 'Tài khoản đang đăng nhập ở nơi khác',
          content:
            response.login_conflict_message ||
            'Tài khoản này đang được đăng nhập ở một nơi khác.',
          okText: 'Tiếp tục đăng nhập',
          cancelText: 'Huỷ đăng nhập',
          onOk: async () => {
            await authConfirmLogin();
            await continueAfterLogin();
          },
          onCancel: async () => {
            await authCancelLogin();
            form.resetFields(['password']);
          }
        });
      } else {
        void continueAfterLogin();
      }
    },
    onError: (error: unknown) => {
      form.resetFields(['password']);

      let errorMessage = 'Đăng nhập thất bại! Vui lòng thử lại.';

      try {
        const axiosError = error as {
          response?: {
            status: number;
            data?: {
              message?: string;
              error?: {
                message?: string;
                errors?: Record<string, string[]>;
              };
            };
          };
        };

        if (axiosError?.response) {
          const { status, data } = axiosError.response;

          switch (status) {
            case 401:
              errorMessage =
                data?.message || 'Số điện thoại hoặc mật khẩu không đúng!';
              break;
            case 403:
              errorMessage = data?.message || 'Bạn đã nghỉ việc!';
              break;
            case 422:
              if (data?.error?.errors) {
                const errors = Object.values(data.error.errors).flat();
                errorMessage =
                  errors.length > 0
                    ? errors[0]
                    : 'Thông tin đăng nhập không hợp lệ!';
              } else {
                errorMessage =
                  data?.error?.message ||
                  data?.message ||
                  'Thông tin đăng nhập không hợp lệ!';
              }
              break;
            case 429:
              errorMessage =
                'Bạn đã thực hiện quá nhiều lần đăng nhập. Vui lòng thử lại sau.';
              break;
            case 500:
              errorMessage = 'Lỗi hệ thống! Vui lòng thử lại sau.';
              break;
            default:
              errorMessage =
                data?.message ||
                data?.error?.message ||
                `Lỗi ${status}: Vui lòng thử lại.`;
          }
        } else if (error instanceof Error) {
          if (error.message.includes('Network Error')) {
            errorMessage =
              'Lỗi kết nối mạng! Vui lòng kiểm tra internet và thử lại.';
          } else {
            errorMessage = `Lỗi: ${error.message}`;
          }
        }
      } catch {
        errorMessage = 'Đăng nhập thất bại! Vui lòng thử lại.';
      }

      message.error(errorMessage);
    }
  });

  const lastValuesRef = useRef<FieldType | null>(null);

  const onFinish: FormProps<FieldType>['onFinish'] = (values) => {
    if (isPending) return;
    lastValuesRef.current = values;
    loginMutation({
      username: values.username,
      password: values.password
    });
  };

  return (
    <div
      className={
        isMidAutumn
          ? 'mid-autumn-login'
          : 'liquid-glass-card auth-glass-card flex min-w-0 flex-col items-center rounded-2xl px-6 py-8 sm:px-8'
      }
    >
      {/* ── Logo ── */}
      <div className={isMidAutumn ? 'mid-autumn-login-logo' : 'mb-8'}>
        <img
          src={logo}
          alt="Vinh Vinh Phát"
          className={isMidAutumn ? undefined : 'mx-auto h-28'}
        />
      </div>

      {/* ── Title ── */}
      {isMidAutumn ? (
        <div className="mid-autumn-login-heading">
          <span className="mid-autumn-login-greeting">
            MỘT NGÀY MỚI, CÙNG NHAU
          </span>
          <h1 className="uppercase">Chào mừng trở lại.</h1>
          <p>Đăng nhập để bắt đầu ngày làm việc của bạn.</p>
        </div>
      ) : (
        <div className="mb-6 text-center">
          <h1 className="mb-1 text-2xl font-bold text-black uppercase dark:text-white">
            Đăng Nhập
          </h1>
          <p className="text-sm text-black/40 dark:text-gray-500">
            Nhập thông tin tài khoản để tiếp tục
          </p>
        </div>
      )}

      {/* ── Form ── */}
      <div className="w-full min-w-0">
        <Form
          form={form}
          name="auth-login"
          id="auth-login-form"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="on"
          className="space-y-1"
        >
          <Form.Item<FieldType>
            name="username"
            label={isMidAutumn ? 'Tài khoản' : undefined}
            htmlFor="username"
            rules={[
              { required: true, message: 'Vui lòng nhập tên đăng nhập!' }
            ]}
          >
            <Input
              id="username"
              name="username"
              aria-label="Tài khoản"
              placeholder="Số điện thoại hoặc tên đăng nhập"
              prefix={<FaRegUser className="text-lg text-black/30" />}
              disabled={isPending}
              autoComplete="username"
              size="large"
              className={
                isMidAutumn
                  ? 'mid-autumn-input'
                  : '!rounded-xl !text-black placeholder:!text-black/30 hover:!border-gray-300 focus:!border-blue-400 dark:!text-white'
              }
            />
          </Form.Item>

          <Form.Item<FieldType>
            name="password"
            label={isMidAutumn ? 'Mật khẩu' : undefined}
            htmlFor="current-password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              id="current-password"
              name="password"
              aria-label="Mật khẩu"
              placeholder="Mật khẩu"
              prefix={<IoLockClosedOutline className="text-lg text-black/30" />}
              disabled={isPending}
              autoComplete="current-password"
              size="large"
              className={
                isMidAutumn
                  ? 'mid-autumn-input'
                  : '!rounded-xl !text-black placeholder:!text-black/30 hover:!border-gray-300 focus:!border-blue-400 dark:!text-white'
              }
            />
          </Form.Item>

          <Form.Item className="!mt-4">
            <Button
              block
              type="primary"
              htmlType="submit"
              loading={isPending}
              disabled={isPending}
              size="large"
              className={
                isMidAutumn
                  ? 'mid-autumn-submit'
                  : 'liquid-glass-button glass-button !h-12 !rounded-xl !text-base !font-semibold active:!scale-[0.98]'
              }
            >
              Đăng nhập {isMidAutumn && <FiArrowRight aria-hidden="true" />}
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* ── Notice ── */}
      {/* <p className="mt-4 text-center text-xs leading-relaxed text-black/50 dark:text-gray-400">
        Khi đăng nhập thành công, trình duyệt sẽ hỏi bạn có muốn lưu mật khẩu.
        Nhấn{' '}
        <span className="inline-block rounded bg-black/5 px-1.5 py-0.5 font-bold text-black/70 dark:bg-white/10 dark:text-gray-200">
          "Lưu"
        </span>{' '}
        để đăng nhập nhanh hơn lần sau.
      </p> */}

      {/* ── Footer ── */}
      {isMidAutumn ? (
        <>
          <p className="mid-autumn-login-help">
            Cần hỗ trợ tài khoản? <span>Liên hệ bộ phận nhân sự.</span>
          </p>
          <p className="mid-autumn-login-security">
            <FiShield aria-hidden="true" /> Hệ thống dành cho nhân viên Vinh
            Vinh Phát
          </p>
        </>
      ) : (
        <p className="mt-6 text-center text-xs text-black/25 dark:text-gray-600">
          VINH VINH PHAT ONE MEMBER CO.,LTD
        </p>
      )}
    </div>
  );
}
