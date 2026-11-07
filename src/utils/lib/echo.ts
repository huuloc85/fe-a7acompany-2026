import Echo from 'laravel-echo';
import type { Broadcaster } from 'laravel-echo';
import { API_URL } from '@/configs/environment.config';
import Pusher from 'pusher-js';
import { getActiveAuthToken } from '@/utils/employeePreview';

declare global {
  interface Window {
    Echo: Echo<keyof Broadcaster>;
    Pusher: typeof Pusher;
  }
}

// Pusher logs for dev:
// Pusher.logToConsole = false;

window.Pusher = Pusher;

const broadcastingAuthEndpoint = `${API_URL.replace(/\/+$/, '')}/broadcasting/auth`;
const userAuthEndpoint = `${API_URL.replace(/\/+$/, '')}/broadcasting/user-auth`;
const getAuthHeaders = (): Record<string, string> => {
  const token = getActiveAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const isLocalDev = ['localhost', '127.0.0.1'].includes(
  window.location.hostname
);

export const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_PUSHER_KEY as string,
  cluster: (import.meta.env.VITE_PUSHER_CLUSTER as string)?.trim(),
  forceTLS: true,
  ...(isLocalDev
    ? { enabledTransports: ['xhr_streaming', 'xhr_polling'] }
    : {}),
  authEndpoint: broadcastingAuthEndpoint,
  auth: {
    headers: getAuthHeaders()
  },
  channelAuthorization: {
    endpoint: broadcastingAuthEndpoint,
    transport: 'ajax',
    headersProvider: getAuthHeaders
  },
  userAuthentication: {
    endpoint: userAuthEndpoint,
    transport: 'ajax',
    headers: getAuthHeaders(),
    headersProvider: getAuthHeaders
  }
});

window.Echo = echo;
