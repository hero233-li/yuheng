import { create } from 'zustand';

interface AuthState {
  username?: string;
  branchName?: string;
  isLoggedIn: boolean;
  login: (payload: { username: string; branchName: string }) => void;
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
      branchName: parsed.branchName,
      isLoggedIn: Boolean(parsed.username),
    };
  } catch {
    return { isLoggedIn: false };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readAuth(),
  login: ({ username, branchName }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, branchName }));
    set({ username, branchName, isLoggedIn: true });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ username: undefined, branchName: undefined, isLoggedIn: false });
  },
}));
