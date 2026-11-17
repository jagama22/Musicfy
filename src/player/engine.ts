import { createAudioPlaylist, setAudioModeAsync, type AudioPlaylist } from 'expo-audio';
import { create } from 'zustand';
import { api, coverUrl, streamUrl } from '@/api/subsonic';
import type { Song } from '@/api/types';
import { shuffle as shuffleArr } from '@/api/queries';

/**
 * Motor de reproducción.
 * - El audio lo gestiona un único AudioPlaylist nativo (expo-audio): segundo plano,
 *   pantalla de bloqueo y botones siguiente/anterior del sistema.
 * - En JS mantenemos una copia exacta de la cola (`queue`) con los metadatos de cada canción,
 *   en el mismo orden que las fuentes del playlist nativo.
 */

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayContext {
  kind: 'album' | 'playlist' | 'artist' | 'liked' | 'genre' | 'mix' | 'search' | 'song' | 'restored';
  id?: string;
  name: string;
}

export interface QueueItem {
  uid: string;
  song: Song;
  /** Añadida a mano con «Añadir a la cola». */
  manual: boolean;
  /** Posición original dentro del contexto (para deshacer el aleatorio). */
  pos: number;
  /** Añadida por la reproducción automática al terminar el contexto. */
  autoplay?: boolean;
}

interface PlayerState {
  queue: QueueItem[];
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
  context: PlayContext | null;
}

export const usePlayer = create<PlayerState>(() => ({
  queue: [],
  index: -1,
  shuffle: false,
  repeat: 'off',
  context: null,
}));

export const useCurrentSong = () => usePlayer((s) => s.queue[s.index]?.song);

let uidCounter = 0;
const newUid = () => `q${Date.now().toString(36)}${(uidCounter++).toString(36)}`;
const toItem = (song: Song, pos: number, manual = false): QueueItem => ({ uid: newUid(), song, manual, pos });

/**
 * Fuente de audio para el playlist nativo. IMPORTANTE: en iOS/Android `add()` e `insert()`
 * esperan un objeto `{ uri }` (el JS de expo-audio no convierte strings en estos métodos,
 * solo en `createAudioPlaylist` y `replace`). Pasar un string hace que la app se cierre.
 */
const sourceFor = (song: Song) => ({ uri: streamUrl(song.id) });

// ---------- Instancia nativa ----------

let playlist: AudioPlaylist | null = null;
let lockScreenActive = false;
let listenedSeconds = 0;
let lastTrackId: string | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let autoplayLoading = false;

export function getPlaylist(): AudioPlaylist {
  if (playlist) return playlist;
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }).catch(() => {});
  playlist = createAudioPlaylist({ updateInterval: 500, loop: 'none' });
  playlist.addListener('trackChanged', ({ currentIndex }) => onTrackChanged(currentIndex));
  playlist.addListener('playlistStatusUpdate', (st) => {
    if (st.playing) listenedSeconds = Math.max(listenedSeconds, st.currentTime);
  });
  return playlist;
}

function setIndex(index: number) {
  usePlayer.setState({ index });
}

function metadataFor(song: Song) {
  return {
    title: song.title,
    artist: song.artist,
    albumTitle: song.album,
    artworkUrl: coverUrl(song.coverArt, 600),
  };
}

function updateLockScreen() {
  const song = usePlayer.getState().queue[usePlayer.getState().index]?.song;
  if (!song || !playlist) return;
  try {
    if (!lockScreenActive) {
      playlist.setActiveForLockScreen(true, metadataFor(song), { showNextTrack: true, showPreviousTrack: true });
      lockScreenActive = true;
    } else {
      playlist.updateLockScreenMetadata(metadataFor(song));
    }
  } catch {
    // Algunas plataformas (web antiguas) no soportan Media Session.
  }
}

function onTrackChanged(currentIndex: number) {
  const { queue } = usePlayer.getState();
  setIndex(currentIndex);
  scrobbleTransition(queue[currentIndex]?.song);
  updateLockScreen();
  scheduleSaveQueue();
  maybeAutoplay();
}

function scrobbleTransition(next: Song | undefined) {
  const prev = usePlayer.getState().queue.find((q) => q.song.id === lastTrackId)?.song;
  if (prev && lastTrackId !== next?.id) {
    const threshold = Math.min(240, (prev.duration ?? 60) / 2);
    if (listenedSeconds >= threshold) api.scrobble(prev.id, true).catch(() => {});
  }
  listenedSeconds = 0;
  if (next && next.id !== lastTrackId) {
    lastTrackId = next.id;
    api.scrobble(next.id, false).catch(() => {});
  }
}

function scheduleSaveQueue() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { queue, index } = usePlayer.getState();
    if (!queue.length) return;
    const pos = Math.round((playlist?.currentTime ?? 0) * 1000);
    api.savePlayQueue(queue.map((q) => q.song.id).slice(0, 500), queue[index]?.song.id, pos).catch(() => {});
  }, 1500);
}

/** Como Spotify: al acabar la cola, sigue con canciones parecidas. */
async function maybeAutoplay() {
  const { queue, index, repeat } = usePlayer.getState();
  if (repeat !== 'off' || autoplayLoading || !queue.length) return;
  if (index < queue.length - 2) return;
  const seed = queue[index]?.song;
  if (!seed) return;
  autoplayLoading = true;
  try {
    let songs = await api.getSimilarSongs(seed.id, 25);
    if (!songs.length) songs = await api.getRandomSongs(25, seed.genre);
    const known = new Set(usePlayer.getState().queue.map((q) => q.song.id));
    const fresh = songs.filter((s) => !known.has(s.id));
    appendItems(fresh.map((s, i) => ({ ...toItem(s, 10_000 + i), autoplay: true })));
  } catch {
    // sin conexión o sin Last.fm: no pasa nada
  } finally {
    autoplayLoading = false;
  }
}

function appendItems(items: QueueItem[]) {
  if (!items.length) return;
  const pl = getPlaylist();
  items.forEach((it) => pl.add(sourceFor(it.song)));
  usePlayer.setState((s) => ({ queue: [...s.queue, ...items] }));
}

/**
 * Sustituye la parte de la cola a partir de `from` (siempre posterior a la canción actual)
 * por `newTail`, tocando solo el final del playlist nativo.
 *
 * Por qué: en iOS, `AudioPlaylist.insert()` (y quitar canciones anteriores a la actual)
 * reconstruye toda la cola nativa y la canción que suena vuelve a empezar desde 0:00.
 * Quitar canciones posteriores a la actual y añadir al final no la toca.
 */
function replaceTail(from: number, newTail: QueueItem[]) {
  const { queue, index } = usePlayer.getState();
  const start = Math.max(from, index + 1);
  const pl = getPlaylist();
  for (let i = queue.length - 1; i >= start; i--) pl.remove(i);
  newTail.forEach((it) => pl.add(sourceFor(it.song)));
  usePlayer.setState({ queue: [...queue.slice(0, start), ...newTail] });
  scheduleSaveQueue();
}

function loadQueue(items: QueueItem[], startIndex: number, autoPlay: boolean) {
  const pl = getPlaylist();
  pl.pause();
  pl.clear();
  items.forEach((it) => pl.add(sourceFor(it.song)));
  usePlayer.setState({ queue: items, index: startIndex });
  if (items.length) {
    pl.skipTo(startIndex);
    if (autoPlay) pl.play();
  }
  scrobbleTransition(items[startIndex]?.song);
  updateLockScreen();
  scheduleSaveQueue();
}

// ---------- API pública ----------

export const player = {
  /**
   * Reproduce una lista de canciones. Con `startIndex` indefinido y aleatorio activado,
   * empieza por una canción al azar (como pulsar el botón verde con shuffle).
   */
  playSongs(songs: Song[], startIndex: number | undefined, context: PlayContext, opts: { shuffle?: boolean } = {}) {
    if (!songs.length) return;
    const shuffleOn = opts.shuffle ?? usePlayer.getState().shuffle;
    let items = songs.map((s, i) => toItem(s, i));
    let start = startIndex ?? 0;
    if (shuffleOn) {
      const first = startIndex !== undefined ? items[startIndex] : items[Math.floor(Math.random() * items.length)];
      items = [first, ...shuffleArr(items.filter((x) => x !== first))];
      start = 0;
    }
    usePlayer.setState({ shuffle: shuffleOn, context });
    loadQueue(items, start, true);
  },

  togglePlay() {
    const pl = getPlaylist();
    if (!usePlayer.getState().queue.length) return;
    if (pl.playing) {
      pl.pause();
      scheduleSaveQueue();
    } else {
      pl.play();
    }
  },

  play: () => getPlaylist().play(),
  pause: () => getPlaylist().pause(),

  next() {
    const { index, queue, repeat } = usePlayer.getState();
    const pl = getPlaylist();
    if (index >= queue.length - 1) {
      if (repeat === 'all' && queue.length) pl.skipTo(0);
      return;
    }
    pl.next();
  },

  previous() {
    const pl = getPlaylist();
    if (pl.currentTime > 3 || usePlayer.getState().index === 0) {
      pl.seekTo(0);
      return;
    }
    pl.previous();
  },

  seek: (seconds: number) => getPlaylist().seekTo(seconds),

  skipTo(index: number) {
    const pl = getPlaylist();
    pl.skipTo(index);
    pl.play();
  },

  /** «Añadir a la cola»: va detrás de lo que ya añadiste a mano, antes del resto del contexto. */
  addToQueue(songs: Song | Song[]) {
    const list = Array.isArray(songs) ? songs : [songs];
    const { queue, index } = usePlayer.getState();
    if (!queue.length) {
      player.playSongs(list, 0, { kind: 'song', name: list[0]?.title ?? '' });
      return;
    }
    let insertAt = index + 1;
    while (insertAt < queue.length && queue[insertAt].manual) insertAt++;
    const items = list.map((s) => toItem(s, -1, true));
    replaceTail(insertAt, [...items, ...queue.slice(insertAt)]);
  },

  /** Quita una canción de las que vienen después de la actual. */
  removeAt(i: number) {
    const { queue, index } = usePlayer.getState();
    if (i <= index || i >= queue.length) return;
    // Quitar una canción posterior a la actual no reconstruye la cola nativa: es seguro.
    getPlaylist().remove(i);
    usePlayer.setState({ queue: queue.filter((_, k) => k !== i) });
    scheduleSaveQueue();
  },

  /** Mueve una canción de las que vienen después de la actual a otra posición posterior. */
  move(from: number, to: number) {
    const { queue, index } = usePlayer.getState();
    if (from <= index || to <= index || from === to || from >= queue.length) return;
    const nq = [...queue];
    const [item] = nq.splice(from, 1);
    nq.splice(to, 0, item);
    const start = Math.min(from, to);
    replaceTail(start, nq.slice(start));
  },

  clearUpcoming() {
    replaceTail(usePlayer.getState().index + 1, []);
  },

  toggleShuffle() {
    const { queue, index, shuffle } = usePlayer.getState();
    const on = !shuffle;
    if (queue.length > index + 1) {
      const upcoming = queue.slice(index + 1);
      const manual = upcoming.filter((q) => q.manual);
      const rest = upcoming.filter((q) => !q.manual);
      const reordered = on ? shuffleArr(rest) : [...rest].sort((a, b) => a.pos - b.pos);
      replaceTail(index + 1, [...manual, ...reordered]);
    }
    usePlayer.setState({ shuffle: on });
  },

  cycleRepeat() {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const next = order[(order.indexOf(usePlayer.getState().repeat) + 1) % order.length];
    getPlaylist().loop = next === 'off' ? 'none' : next === 'all' ? 'all' : 'single';
    usePlayer.setState({ repeat: next });
  },

  /** Recupera la última cola guardada en el servidor (sin empezar a sonar). */
  async restore() {
    if (usePlayer.getState().queue.length) return;
    try {
      const pq = await api.getPlayQueue();
      const songs = pq.entry ?? [];
      if (!songs.length) return;
      const idx = Math.max(0, songs.findIndex((s) => s.id === pq.current));
      usePlayer.setState({ context: { kind: 'restored', name: 'Tu última sesión' } });
      loadQueue(songs.map((s, i) => toItem(s, i)), idx, false);
      if (pq.position) {
        setTimeout(() => getPlaylist().seekTo((pq.position ?? 0) / 1000).catch(() => {}), 800);
      }
    } catch {
      // sin cola guardada
    }
  },

  reset() {
    const pl = getPlaylist();
    pl.pause();
    pl.clear();
    try {
      pl.clearLockScreenControls();
    } catch {}
    lockScreenActive = false;
    lastTrackId = undefined;
    usePlayer.setState({ queue: [], index: -1, context: null });
  },
};
