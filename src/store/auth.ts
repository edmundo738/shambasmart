import { create } from 'zustand';

export type PlanId = 'free' | 'pro' | 'studio';

export interface User {
  name: string;
  email: string;
  plan: PlanId;
}

const KEY = 'pixelforge_user_v1';

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  setPlan: (plan: PlanId) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: readUser(),
  login: (name, email) => {
    const user: User = { name: name.trim() || 'Artista', email: email.trim(), plan: 'free' };
    try {
      localStorage.setItem(KEY, JSON.stringify(user));
    } catch { /* ignora */ }
    set({ user });
  },
  logout: () => {
    try {
      localStorage.removeItem(KEY);
    } catch { /* ignora */ }
    set({ user: null });
  },
  setPlan: (plan) => set((s) => {
    if (!s.user) return {};
    const user = { ...s.user, plan };
    try {
      localStorage.setItem(KEY, JSON.stringify(user));
    } catch { /* ignora */ }
    return { user };
  }),
}));
