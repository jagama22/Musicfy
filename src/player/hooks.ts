import { useAudioPlaylistStatus } from 'expo-audio';
import { getPlaylist, usePlayer, type PlayContext } from './engine';

export function usePlaybackStatus() {
  return useAudioPlaylistStatus(getPlaylist());
}

/** ¿Está sonando (o en pausa) algo de este contexto? Para el botón verde de las cabeceras. */
export function useIsContextActive(kind: PlayContext['kind'], id?: string) {
  return usePlayer((s) => s.context?.kind === kind && s.context?.id === id && s.queue.length > 0);
}

export function formatTime(sec: number | undefined): string {
  if (!sec || !isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(sec: number | undefined): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
