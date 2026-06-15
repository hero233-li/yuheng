import { create } from 'zustand';

interface AuthState {
  username?: string;
  terminalName?: string;
  isLoggedIn: boolean;
  login: (payload: { username: string; terminalName: string }) => void;
  logout: () => void;
}

const STORAGE_KEY = 'automation_auth';

function readAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { isLoggedIn: false };
    }
    const parsed = JSON.parse(raw);
    return {
      username: parsed.username,
      terminalName: parsed.terminalName || parsed.terminalName,
      isLoggedIn: Boolean(parsed.username),
    };
  } catch {
    return { isLoggedIn: false };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readAuth(),
  login: ({ username, terminalName }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, terminalName }));
    set({ username, terminalName, isLoggedIn: true });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ username: undefined, terminalName: undefined, isLoggedIn: false });
  },
}));
