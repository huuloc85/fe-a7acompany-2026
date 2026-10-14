/** Supports both Laravel validation errors and the legacy API envelope. */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Thất bại!'
): string {
  const apiError = error as {
    response?: {
      status?: number;
      headers?: Record<string, unknown>;
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
        error?: { message?: string; errors?: Record<string, string[]> };
      };
    };
  } | null;
  const response = apiError?.response;
  const data = response?.data;
  const errors = data?.errors ?? data?.error?.errors;
  const detail = errors ? Object.values(errors).flat()[0] : undefined;
  const message = detail || data?.message || data?.error?.message || fallback;
  const requestId = response?.headers?.['x-request-id'];
  return `${response?.status ? `[${response.status}] ` : ''}${message}${
    typeof requestId === 'string' ? ` (Mã lỗi: ${requestId})` : ''
  }`;
}
