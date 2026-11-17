import { md5 } from 'js-md5';
import { getSession, type Session } from '@/store/session';
import { useSettings } from '@/store/settings';
import type {
  Album,
  AlbumListType,
  Artist,
  ArtistInfo,
  Genre,
  Playlist,
  PlayQueue,
  SearchResult,
  Song,
  Starred,
} from './types';

const API_VERSION = '1.16.1';
const CLIENT = 'musicfy';

export class SubsonicError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | (string | number)[]>;

export function normalizeServerUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

export function makeSession(serverUrl: string, username: string, password: string): Session {
  const salt = Math.random().toString(36).slice(2, 12);
  return { serverUrl: normalizeServerUrl(serverUrl), username: username.trim(), salt, token: md5(password + salt) };
}

function buildUrl(session: Session, method: string, params: Params = {}): string {
  const qs = new URLSearchParams({
    u: session.username,
    t: session.token,
    s: session.salt,
    v: API_VERSION,
    c: CLIENT,
    f: 'json',
  });
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
    else qs.append(k, String(v));
  }
  return `${session.serverUrl}/rest/${method}?${qs.toString()}`;
}

function requireSession(): Session {
  const s = getSession();
  if (!s) throw new SubsonicError('No hay sesión iniciada');
  return s;
}

async function call<T = Record<string, unknown>>(
  method: string,
  params: Params = {},
  session: Session = requireSession(),
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildUrl(session, method, params));
  } catch {
    throw new SubsonicError('No se pudo conectar con el servidor');
  }
  if (!res.ok) throw new SubsonicError(`Error HTTP ${res.status}`);
  const json = await res.json();
  const body = json?.['subsonic-response'];
  if (!body) throw new SubsonicError('Respuesta no válida del servidor');
  if (body.status !== 'ok') {
    const code = body.error?.code as number | undefined;
    const msg = code === 40 ? 'Usuario o contraseña incorrectos' : body.error?.message ?? 'Error desconocido';
    throw new SubsonicError(msg, code);
  }
  return body as T;
}

// ---------- URLs de medios ----------

export function coverUrl(id: string | undefined, size = 300): string | undefined {
  const s = getSession();
  if (!s || !id) return undefined;
  return buildUrl(s, 'getCoverArt', { id, size });
}

export function streamUrl(id: string): string {
  const s = requireSession();
  const maxBitRate = useSettings.getState().maxBitrate;
  return buildUrl(s, 'stream', maxBitRate ? { id, maxBitRate, format: 'mp3' } : { id });
}

// ---------- Endpoints ----------

export const api = {
  ping: (session: Session) => call('ping', {}, session),

  async getAlbumList(type: AlbumListType, size = 20, offset = 0, extra: Params = {}): Promise<Album[]> {
    const r = await call<{ albumList2?: { album?: Album[] } }>('getAlbumList2', { type, size, offset, ...extra });
    return r.albumList2?.album ?? [];
  },

  async getAlbum(id: string): Promise<Album> {
    const r = await call<{ album: Album }>('getAlbum', { id });
    return r.album;
  },

  async getArtists(): Promise<Artist[]> {
    const r = await call<{ artists?: { index?: { artist?: Artist[] }[] } }>('getArtists');
    return (r.artists?.index ?? []).flatMap((i) => i.artist ?? []);
  },

  async getArtist(id: string): Promise<Artist> {
    const r = await call<{ artist: Artist }>('getArtist', { id });
    return r.artist;
  },

  async getArtistInfo(id: string): Promise<ArtistInfo> {
    const r = await call<{ artistInfo2?: ArtistInfo }>('getArtistInfo2', { id, count: 12 });
    return r.artistInfo2 ?? {};
  },

  async getTopSongs(artist: string, count = 10): Promise<Song[]> {
    const r = await call<{ topSongs?: { song?: Song[] } }>('getTopSongs', { artist, count });
    return r.topSongs?.song ?? [];
  },

  async getSimilarSongs(id: string, count = 50): Promise<Song[]> {
    const r = await call<{ similarSongs2?: { song?: Song[] } }>('getSimilarSongs2', { id, count });
    return r.similarSongs2?.song ?? [];
  },

  async getRandomSongs(size = 50, genre?: string): Promise<Song[]> {
    const r = await call<{ randomSongs?: { song?: Song[] } }>('getRandomSongs', { size, genre });
    return r.randomSongs?.song ?? [];
  },

  async getGenres(): Promise<Genre[]> {
    const r = await call<{ genres?: { genre?: Genre[] } }>('getGenres');
    return (r.genres?.genre ?? []).sort((a, b) => b.songCount - a.songCount);
  },

  async getSongsByGenre(genre: string, count = 100): Promise<Song[]> {
    const r = await call<{ songsByGenre?: { song?: Song[] } }>('getSongsByGenre', { genre, count });
    return r.songsByGenre?.song ?? [];
  },

  async search(query: string, sizes = { artist: 8, album: 10, song: 25 }): Promise<SearchResult> {
    const r = await call<{ searchResult3?: SearchResult }>('search3', {
      query,
      artistCount: sizes.artist,
      albumCount: sizes.album,
      songCount: sizes.song,
    });
    return r.searchResult3 ?? {};
  },

  async getStarred(): Promise<Starred> {
    const r = await call<{ starred2?: Starred }>('getStarred2');
    return r.starred2 ?? {};
  },

  star: (p: { id?: string; albumId?: string; artistId?: string }) => call('star', p),
  unstar: (p: { id?: string; albumId?: string; artistId?: string }) => call('unstar', p),

  async getPlaylists(): Promise<Playlist[]> {
    const r = await call<{ playlists?: { playlist?: Playlist[] } }>('getPlaylists');
    return r.playlists?.playlist ?? [];
  },

  async getPlaylist(id: string): Promise<Playlist> {
    const r = await call<{ playlist: Playlist }>('getPlaylist', { id });
    return r.playlist;
  },

  async createPlaylist(name: string, songIds: string[] = []): Promise<Playlist | undefined> {
    const r = await call<{ playlist?: Playlist }>('createPlaylist', { name, songId: songIds });
    return r.playlist;
  },

  updatePlaylist: (p: {
    playlistId: string;
    name?: string;
    comment?: string;
    songIdToAdd?: string[];
    songIndexToRemove?: number[];
  }) => call('updatePlaylist', p),

  /** Reemplaza el contenido completo (sirve para reordenar). */
  replacePlaylistSongs: (playlistId: string, songIds: string[]) =>
    call('createPlaylist', { playlistId, songId: songIds }),

  deletePlaylist: (id: string) => call('deletePlaylist', { id }),

  scrobble: (id: string, submission: boolean) =>
    call('scrobble', { id, submission, time: submission ? Date.now() : undefined }),

  savePlayQueue: (ids: string[], current?: string, positionMs?: number) =>
    call('savePlayQueue', { id: ids, current, position: positionMs }),

  async getPlayQueue(): Promise<PlayQueue> {
    const r = await call<{ playQueue?: PlayQueue }>('getPlayQueue');
    return r.playQueue ?? {};
  },
};
