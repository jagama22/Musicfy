import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { toast } from '@/components/Toast';

const KEY = 'musicfy-last-error';

export interface LastError {
  message: string;
  stack?: string;
  at: string;
}

export const useLastError = create<{ error: LastError | null }>(() => ({ error: null }));

export async function loadLastError() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) useLastError.setState({ error: JSON.parse(raw) });
  } catch {}
}

export function recordError(e: unknown) {
  const err = e as Error;
  const entry: LastError = {
    message: String(err?.message ?? e),
    stack: err?.stack?.split('\n').slice(0, 8).join('\n'),
    at: new Date().toISOString(),
  };
  useLastError.setState({ error: entry });
  AsyncStorage.setItem(KEY, JSON.stringify(entry)).catch(() => {});
  return entry;
}

export function clearLastError() {
  useLastError.setState({ error: null });
  AsyncStorage.removeItem(KEY).catch(() => {});
}

/**
 * En la versión Release, React Native cierra la app ante cualquier error de JavaScript no capturado.
 * Aquí lo interceptamos: lo guardamos (visible en Configuración) y avisamos con un mensaje,
 * en lugar de cerrar la app.
 */
export function installGlobalErrorHandler() {
  const EU = (globalThis as { ErrorUtils?: { setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } })
    .ErrorUtils;
  if (!EU || __DEV__) return;
  EU.setGlobalHandler((error) => {
    const entry = recordError(error);
    try {
      toast(`Algo ha fallado: ${entry.message.slice(0, 120)}`);
    } catch {}
  });
}
