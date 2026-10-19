import axiosPrivate from '@/api/axiosInstance';
import { STORAGE_URL } from '@/configs/environment.config';
import { queryClient } from '@/lib/queryClient';
import { User } from '@/types/authType';
import { Gender } from '@schemas/genderEnum.schema';
import {
  authStore,
  clearAuth,
  setAuthChannelName,
  setSessionId,
  setToken,
  setUser
} from '@stores/authStore';

const expiresInMins = parseInt(import.meta.env.VITE_EXPIRES_TIME) || 120;

type AuthResponse = {
  id: string;
  name: string;
  gender: Gender;
  role_id: number;
  role_name: string;
  image: string;
  token: string;
  session_id?: string | null;
  auth_channel_name?: string | null;
  logged_in_elsewhere?: boolean;
  login_conflict_message?: string | null;
  is_birthday: boolean;
  birthday_employees: Array<{
    id: string;
    name: string;
    image?: string;
    birthday?: string;
  }>;
  cleaning_duties: Array<{
    date: string;
    type: string;
  }>;
  permissions: User['permissions'];
};

export const authLogin = async (
  username: string,
  password: string,
  remember?: boolean
) => {
  const data = {
    phone: username,
    password: password,
    remember: remember || false,
    expiresInMins: expiresInMins
  };

  const response: AuthResponse = await axiosPrivate.post('/api/login', data);

  const userData: User = {
    id: response.id,
    name: response.name,
    gender: response.gender,
    role: {
      id: response.role_id.toString(),
      name: response.role_name
    },
    permissions: response.permissions
  };

  if (response.image) {
    userData.image_url = `${STORAGE_URL}/${response.image}`;
  }

  // Set auth state
  setUser(userData);
  setToken(response.token);
  setSessionId(response.session_id ?? null);
  setAuthChannelName(response.auth_channel_name ?? null);

  // Store login-provided notification data in sessionStorage
  if (response.is_birthday !== undefined) {
    sessionStorage.setItem(
      'login_is_birthday',
      JSON.stringify(response.is_birthday)
    );
  }
  if (response.birthday_employees) {
    sessionStorage.setItem(
      'login_birthday_employees',
      JSON.stringify(response.birthday_employees)
    );
  }
  if (response.cleaning_duties) {
    sessionStorage.setItem(
      'login_cleaning_duties',
      JSON.stringify(response.cleaning_duties)
    );
  }

  return response;
};

export const authLogout = async () => {
  try {
    await axiosPrivate.post('/api/logout');

    return { message: 'Logged out successfully' };
  } catch (error) {
    console.warn('Logout API call failed:', error);
    return { message: 'Logged out locally' };
  } finally {
    clearAuth();
    queryClient.clear();
  }
};

export const authCancelLogin = async () => {
  try {
    await axiosPrivate.post('/api/logout');
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    clearAuth();
    queryClient.clear();
  }
};

export const authConfirmLogin = async () => {
  await axiosPrivate.post('/api/auth/confirm-login');
};

export const authCheck = async () => {
  const checkedToken = authStore.state.token;
  const response: AuthResponse = await axiosPrivate.post('/api/auth/check');
  // Do not restore a session that was logged out/replaced during the request.
  if (!checkedToken || authStore.state.token !== checkedToken) {
    throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
  }
  const currentUser = authStore.state.user;

  // Session checks may omit permissions. An explicit [] still revokes all grants.
  const userData: User = {
    id: response.id ?? currentUser?.id ?? '',
    name: response.name ?? currentUser?.name ?? '',
    gender: response.gender ?? currentUser?.gender ?? ('male' as Gender),
    role: response.role_id
      ? { id: response.role_id.toString(), name: response.role_name }
      : (currentUser?.role ?? { id: '', name: '' }),
    permissions: response.permissions ?? currentUser?.permissions ?? []
  };

  if (response?.image) {
    userData.image_url = `${STORAGE_URL}/${response.image}`;
  } else if (currentUser?.image_url) {
    userData.image_url = currentUser.image_url;
  }

  setUser(userData);
  if ('session_id' in response) {
    setSessionId(response.session_id ?? null);
  }
  if ('auth_channel_name' in response) {
    setAuthChannelName(response.auth_channel_name ?? null);
  }

  return response;
};
