import axios, { AxiosError } from 'axios';
import { queryClient } from '@/lib/queryClient';

import { ApiErrorResponse, ValidationErrors } from '@/types/apiType';
import { clearAuth } from '@stores/authStore';
import { getLoginRedirectSearch } from '@utils/authRedirect';
import { mapErrorCodesToMessages } from '@utils/validationMapper';
import { message } from 'antd';

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;
const LOGIN_CONFLICT_CODE = 'LOGGED_IN_ELSEWHERE';
const LOGIN_CONFLICT_MESSAGE =
  'Tài khoản của bạn đã được đăng nhập ở nơi khác.';

export const axiosPublic = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const axiosPrivate = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosPrivate.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosPrivate.interceptors.response.use(
  (response) => {
    // Trả về response.data để đơn giản hóa việc sử dụng
    return response.data;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Xử lý validation error
    if (status === 422 && data?.error?.errors) {
      const errorData: ValidationErrors = data.error.errors;
      const mappedErrors = mapErrorCodesToMessages(errorData, 'vi');
      error.response.data.error.errors = mappedErrors;
    }

    // Central handling logic
    switch (status) {
      case 401: {
        // Kiểm tra xem có phải request login không
        const isLoginRequest = error.config?.url?.includes('/api/login');
        const responseData = data as ApiErrorResponse & {
          code?: string | number;
          message?: string;
        };
        const errorCode = responseData?.code ?? responseData?.error?.code;
        const errorMessage =
          responseData?.message ?? responseData?.error?.message;
        const isLoginConflict = String(errorCode) === LOGIN_CONFLICT_CODE;

        if (!isLoginRequest) {
          if (isLoginConflict) {
            sessionStorage.setItem(
              'auth_logout_message',
              errorMessage || LOGIN_CONFLICT_MESSAGE
            );
          }

          // Chỉ clear auth và redirect nếu KHÔNG phải login request
          clearAuth();
          queryClient.clear();

          // Redirect trực tiếp và ngay lập tức
          const currentPath = window.location.pathname + window.location.search;
          const loginSearch = getLoginRedirectSearch(currentPath);
          const loginUrl = loginSearch
            ? `/login?redirect=${encodeURIComponent(loginSearch.redirect)}`
            : '/login';

          // Do not reload the login page when the session check itself fails
          // while the user is already on the login page.
          if (window.location.pathname !== '/login') {
            window.location.replace(loginUrl);
          }
        }
        // Nếu là login request, để component xử lý error
        break;
      }

      case 403:
        break;

      case 404:
        break;

      case 422:
        break;

      case 500:
        message.error(
          'Hệ thống gặp sự cố khi xử lý chức năng này. Quản trị viên vui lòng kiểm tra System Logs để biết chi tiết.' +
            (error.response.headers['x-request-id']
              ? ` Mã lỗi: ${error.response.headers['x-request-id']}`
              : '')
        );
        break;

      default:
        break;
    }

    // Always return the rejected error so component can catch if needed
    return Promise.reject(error);
  }
);

export default axiosPrivate;
