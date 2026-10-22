import { User } from '@/types/authType';
import { Store } from '@tanstack/react-store';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  sessionId: string | null;
  authChannelName: string | null;
};

// Load state from localStorage or set default values
const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
  token: localStorage.getItem('token') || null,
  sessionId: localStorage.getItem('auth_session_id') || null,
  authChannelName: localStorage.getItem('auth_channel_name') || null
};

// Create the store instance
export const authStore = new Store(initialState);

// Subscribe to state changes to update localStorage
authStore.subscribe((state) => {
  localStorage.setItem('user', JSON.stringify(state.currentVal.user));

  localStorage.setItem(
    'isAuthenticated',
    state.currentVal.isAuthenticated ? 'true' : 'false'
  );
  localStorage.setItem('token', state.currentVal.token || '');
  localStorage.setItem('auth_session_id', state.currentVal.sessionId || '');
  localStorage.setItem(
    'auth_channel_name',
    state.currentVal.authChannelName || ''
  );
});

// Utility functions to update the store state
export const setUser = (user: User) => {
  authStore.setState((prevState) => {
    return { ...prevState, user, isAuthenticated: true };
  });
};

export const updateUserImage = (imageUrl: string) => {
  authStore.setState((prevState) => {
    if (!prevState.user) return prevState;
    return {
      ...prevState,
      user: {
        ...prevState.user,
        image_url: imageUrl
      }
    };
  });
};

export const setAuth = (isAuthenticated: boolean) => {
  authStore.setState((prevState) => {
    return { ...prevState, isAuthenticated };
  });
};

export const setToken = (token: string) => {
  authStore.setState((prevState) => {
    return { ...prevState, token };
  });
};

export const setSessionId = (sessionId: string | null) => {
  authStore.setState((prevState) => {
    return { ...prevState, sessionId };
  });
};

export const setAuthChannelName = (authChannelName: string | null) => {
  authStore.setState((prevState) => {
    return { ...prevState, authChannelName };
  });
};

export const clearAuth = () => {
  try {
    sessionStorage.removeItem('cap7a.vnc-password');
    sessionStorage.removeItem('cap7a.tail.vnc-password');
    sessionStorage.removeItem('cap7a.spike.vnc-password');
    localStorage.removeItem('cap7a.vnc-password');
  } catch {
    /* Logout still works when browser storage is restricted. */
  }
  // Clear localStorage first để đảm bảo beforeLoad không thấy dữ liệu cũ
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('token');
  localStorage.removeItem('auth_session_id');
  localStorage.removeItem('auth_channel_name');

  // Clear store state
  authStore.setState((prevState) => {
    return {
      ...prevState,
      isAuthenticated: false,
      user: null,
      token: null,
      sessionId: null,
      authChannelName: null
    };
  });
};
