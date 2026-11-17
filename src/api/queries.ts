import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { api } from './subsonic';
import type { AlbumListType, Song } from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

export const keys = {
  albumList: (type: AlbumListType, size: number) => ['albumList', type, size] as const,
  album: (id: string) => ['album', id] as const,
  artists: ['artists'] as const,
  artist: (id: string) => ['artist', id] as const,
  artistInfo: (id: string) => ['artistInfo', id] as const,
  topSongs: (name: string) => ['topSongs', name] as const,
  playlists: ['playlists'] as const,
  playlist: (id: string) => ['playlist', id] as const,
  starred: ['starred'] as const,
  genres: ['genres'] as const,
  genreSongs: (g: string) => ['genreSongs', g] as const,
  random: (tag: string) => ['random', tag] as const,
  search: (q: string) => ['search', q] as const,
};

export const useAlbumList = (type: AlbumListType, size = 20) =>
  useQuery({ queryKey: keys.albumList(type, size), queryFn: () => api.getAlbumList(type, size) });

export const useAlbumsByGenre = (genre: string) =>
  useQuery({
    queryKey: ['albumsByGenre', genre],
    queryFn: () => api.getAlbumList('byGenre', 60, 0, { genre }),
    enabled: !!genre,
  });

/** Todas las canciones de un artista (recorriendo sus álbumes). */
export async function fetchArtistSongs(artistId: string): Promise<Song[]> {
  const artist = await queryClient.fetchQuery({ queryKey: keys.artist(artistId), queryFn: () => api.getArtist(artistId) });
  const albums = await Promise.all(
    (artist.album ?? []).map((a) => queryClient.fetchQuery({ queryKey: keys.album(a.id), queryFn: () => api.getAlbum(a.id) })),
  );
  return albums.flatMap((a) => a.song ?? []);
}

export const useAlbum = (id: string) =>
  useQuery({ queryKey: keys.album(id), queryFn: () => api.getAlbum(id), enabled: !!id });

export const useArtists = () => useQuery({ queryKey: keys.artists, queryFn: api.getArtists });

export const useArtist = (id: string) =>
  useQuery({ queryKey: keys.artist(id), queryFn: () => api.getArtist(id), enabled: !!id });

export const useArtistInfo = (id: string) =>
  useQuery({ queryKey: keys.artistInfo(id), queryFn: () => api.getArtistInfo(id), enabled: !!id });

export const useTopSongs = (name: string | undefined) =>
  useQuery({ queryKey: keys.topSongs(name ?? ''), queryFn: () => api.getTopSongs(name!), enabled: !!name });

export const usePlaylists = () => useQuery({ queryKey: keys.playlists, queryFn: api.getPlaylists });

export const usePlaylist = (id: string) =>
  useQuery({ queryKey: keys.playlist(id), queryFn: () => api.getPlaylist(id), enabled: !!id });

export const useStarred = () => useQuery({ queryKey: keys.starred, queryFn: api.getStarred });

export const useGenres = () => useQuery({ queryKey: keys.genres, queryFn: api.getGenres });

export const useGenreSongs = (genre: string) =>
  useQuery({
    queryKey: keys.genreSongs(genre),
    queryFn: async () => shuffle(await api.getSongsByGenre(genre, 200)).slice(0, 60),
    enabled: !!genre,
  });

export const useRandomSongs = (tag: string, size = 50, genre?: string) =>
  useQuery({ queryKey: keys.random(tag), queryFn: () => api.getRandomSongs(size, genre) });

export const useSearch = (q: string) =>
  useQuery({
    queryKey: keys.search(q),
    queryFn: () => api.search(q),
    enabled: q.trim().length > 0,
    placeholderData: (prev) => prev,
  });

// ---------- Favoritos ----------

/** Conjunto de IDs de canciones favoritas, derivado de getStarred2. */
export function useStarredIds() {
  const { data } = useStarred();
  return new Set([
    ...(data?.song ?? []).map((s) => s.id),
    ...(data?.album ?? []).map((a) => a.id),
    ...(data?.artist ?? []).map((a) => a.id),
  ]);
}

export function useToggleStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { kind: 'song' | 'album' | 'artist'; id: string; starred: boolean; song?: Song }) => {
      const arg = p.kind === 'song' ? { id: p.id } : p.kind === 'album' ? { albumId: p.id } : { artistId: p.id };
      return p.starred ? api.unstar(arg) : api.star(arg);
    },
    onMutate: async (p) => {
      // Actualización optimista para que el corazón responda al instante.
      await qc.cancelQueries({ queryKey: keys.starred });
      const prev = qc.getQueryData(keys.starred);
      qc.setQueryData(keys.starred, (old: any) => {
        const o = { song: [], album: [], artist: [], ...(old ?? {}) };
        const list = p.kind;
        if (p.starred) o[list] = o[list].filter((x: { id: string }) => x.id !== p.id);
        else if (p.kind === 'song' && p.song) o.song = [{ ...p.song, starred: new Date().toISOString() }, ...o.song];
        else o[list] = [{ id: p.id, starred: new Date().toISOString() }, ...o[list]];
        return o;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => ctx?.prev && qc.setQueryData(keys.starred, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.starred }),
  });
}

// ---------- Playlists ----------

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { name: string; songIds?: string[] }) => api.createPlaylist(p.name, p.songIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.playlists }),
  });
}

export function useAddToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { playlistId: string; songIds: string[] }) =>
      api.updatePlaylist({ playlistId: p.playlistId, songIdToAdd: p.songIds }),
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: keys.playlist(p.playlistId) });
      qc.invalidateQueries({ queryKey: keys.playlists });
    },
  });
}

export function useRemoveFromPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { playlistId: string; index: number }) =>
      api.updatePlaylist({ playlistId: p.playlistId, songIndexToRemove: [p.index] }),
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: keys.playlist(p.playlistId) });
      qc.invalidateQueries({ queryKey: keys.playlists });
    },
  });
}

export function useReorderPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { playlistId: string; songIds: string[] }) => api.replacePlaylistSongs(p.playlistId, p.songIds),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: keys.playlist(p.playlistId) }),
  });
}

export function useRenamePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { playlistId: string; name: string; comment?: string }) => api.updatePlaylist(p),
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: keys.playlist(p.playlistId) });
      qc.invalidateQueries({ queryKey: keys.playlists });
    },
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePlaylist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.playlists }),
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
