import { Store } from '@tanstack/react-store';

type UIState = {
  isSidebarClose: boolean;
  theme: 'light' | 'dark';
  appearance: 'liquid' | 'classic';
  isMobile: boolean;
};

const UI_STORAGE_KEYS = {
  isSidebarClose: 'isSidebarClose',
  theme: 'theme',
  appearance: 'appearance',
  appearancePreferenceSet: 'appearancePreferenceSet'
} as const;

const getStoredTheme = (): UIState['theme'] =>
  localStorage.getItem(UI_STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light';

const getStoredAppearance = (): UIState['appearance'] =>
  localStorage.getItem(UI_STORAGE_KEYS.appearancePreferenceSet) === 'true' &&
  localStorage.getItem(UI_STORAGE_KEYS.appearance) === 'liquid'
    ? 'liquid'
    : 'classic';

const rememberAppearancePreference = () => {
  localStorage.setItem(UI_STORAGE_KEYS.appearancePreferenceSet, 'true');
};

export const hasAppearancePreference = () =>
  localStorage.getItem(UI_STORAGE_KEYS.appearancePreferenceSet) === 'true';

export const getSavedAppearance = (): UIState['appearance'] =>
  localStorage.getItem(UI_STORAGE_KEYS.appearance) === 'liquid'
    ? 'liquid'
    : 'classic';

// Load state from localStorage or set default values
const initialState: UIState = {
  isSidebarClose: window.innerWidth < 768,
  theme: getStoredTheme(),
  appearance: getStoredAppearance(),
  isMobile: window.innerWidth < 768
};

const applyUIState = (state: UIState) => {
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
  document.documentElement.classList.toggle(
    'legacy-ui-mode',
    state.appearance === 'classic'
  );
  document.documentElement.classList.toggle(
    'liquid-ui-mode',
    state.appearance === 'liquid'
  );
  document.documentElement.setAttribute('data-theme', state.theme);
  document.documentElement.setAttribute('data-appearance', state.appearance);
};

applyUIState(initialState);

// Create the store instance
export const uiStore = new Store(initialState);

// Subscribe to state changes to update localStorage
uiStore.subscribe((state) => {
  localStorage.setItem(
    UI_STORAGE_KEYS.isSidebarClose,
    JSON.stringify(state.currentVal.isSidebarClose)
  );

  localStorage.setItem(UI_STORAGE_KEYS.theme, state.currentVal.theme);
  localStorage.setItem(UI_STORAGE_KEYS.appearance, state.currentVal.appearance);
  applyUIState(state.currentVal);
});

// Utility functions to update the store state
export const toggleSidebar = () => {
  uiStore.setState((prevState) => {
    const newState = !prevState.isSidebarClose;
    return { ...prevState, isSidebarClose: newState };
  });
};

export const setSidebarClosed = (closed: boolean) => {
  uiStore.setState((prevState) => ({
    ...prevState,
    isSidebarClose: closed
  }));
};

export const toggleTheme = () => {
  uiStore.setState((prevState) => {
    const newState = prevState.theme === 'light' ? 'dark' : 'light';
    return { ...prevState, theme: newState };
  });
};

export const toggleAppearance = () => {
  rememberAppearancePreference();
  uiStore.setState((prevState) => {
    const newState = prevState.appearance === 'liquid' ? 'classic' : 'liquid';
    return { ...prevState, appearance: newState };
  });
};

export const setAppearance = (appearance: UIState['appearance']) => {
  rememberAppearancePreference();
  uiStore.setState((prevState) => {
    return { ...prevState, appearance };
  });
};

export const updateScreenSize = () => {
  uiStore.setState((prevState) => {
    const newState = window.innerWidth < 768;
    return { ...prevState, isMobile: newState };
  });
};
