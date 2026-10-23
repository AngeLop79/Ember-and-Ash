import { create } from "zustand";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

type AuthStore = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  signIn: (user: AuthUser) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

let refreshing: Promise<void> | null = null;
let revision = 0;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  hasHydrated: false,
  signIn: (user) => {
    revision++;
    set({ user, isAuthenticated: true, hasHydrated: true });
  },
  signOut: async () => {
    const response = await fetch("/api/auth", { method: "DELETE" });
    if (!response.ok) throw new Error("Impossibile uscire. Riprova.");
    revision++;
    set({ user: null, isAuthenticated: false, hasHydrated: true });
  },
  refreshSession: () => {
    if (refreshing) return refreshing;
    const startedAtRevision = revision;
    refreshing = (async () => {
      const response = await fetch("/api/auth", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossibile verificare la sessione.");
      const user: AuthUser | null = result.user;
      if (revision === startedAtRevision) {
        set({ user, isAuthenticated: user !== null, hasHydrated: true });
      }
    })().finally(() => { refreshing = null; });
    return refreshing;
  },
}));
