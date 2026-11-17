import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/utils/storage';

/**
 * Sesión con el servidor Navidrome. Nunca guardamos la contraseña en claro:
 * solo el token Subsonic = md5(password + salt) y su salt.
 */
export interface Session {
  serverUrl: string;
  username: string;
  token: string;
  salt: string;
}

interface SessionState {
  session: Session | null;
  hydrated: boolean;
  setSession: (s: Session) => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (session) => set({ session }),
      logout: () => set({ session: null }),
    }),
    {
      name: 'musicfy-session',
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ session: s.session }),
      onRehydrateStorage: () => () => {
        useSession.setState({ hydrated: true });
      },
    },
  ),
);

export const getSession = () => useSession.getState().session;
