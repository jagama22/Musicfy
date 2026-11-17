import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGenres, usePlaylists, useSearch } from '@/api/queries';
import type { Album, Artist, Playlist, Song } from '@/api/types';
import { Cover } from '@/components/Cover';
import { Tap } from '@/components/Pressable';
import { EmptyState, useBottomSpace } from '@/components/States';
import { T } from '@/components/T';
import { Chip, TabHeader } from '@/components/TabHeader';
import { TrackRow } from '@/components/TrackRow';
import { player } from '@/player/engine';
import { useSettings, type RecentSearch } from '@/store/settings';
import { colorFor, colors, fonts } from '@/theme';
import { useNav } from '@/utils/nav';

type Filter = 'all' | 'song' | 'artist' | 'album' | 'playlist';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

type Row =
  | { type: 'song'; item: Song; songs: Song[]; index: number }
  | { type: 'artist'; item: Artist }
  | { type: 'album'; item: Album }
  | { type: 'playlist'; item: Playlist };

export default function Search() {
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpace();
  const nav = useNav();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const q = useDebounced(text.trim());
  const search = useSearch(q);
  const playlists = usePlaylists();
  const genres = useGenres();
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useSettings();

  const rows: Row[] = useMemo(() => {
    if (!q) return [];
    const r = search.data ?? {};
    const songs = r.song ?? [];
    const pls = (playlists.data ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    const songRows: Row[] = songs.map((s, i) => ({ type: 'song', item: s, songs, index: i }));
    const artistRows: Row[] = (r.artist ?? []).map((a) => ({ type: 'artist', item: a }));
    const albumRows: Row[] = (r.album ?? []).map((a) => ({ type: 'album', item: a }));
    const plRows: Row[] = pls.map((p) => ({ type: 'playlist', item: p }));
    switch (filter) {
      case 'song': return songRows;
      case 'artist': return artistRows;
      case 'album': return albumRows;
      case 'playlist': return plRows;
      default:
        // «Todo»: mezcla al estilo Spotify (artista principal arriba, luego canciones, álbumes…).
        return [...artistRows.slice(0, 1), ...songRows.slice(0, 6), ...albumRows.slice(0, 4), ...artistRows.slice(1, 4), ...plRows.slice(0, 3), ...songRows.slice(6, 15)];
    }
  }, [q, search.data, playlists.data, filter]);

  const remember = (r: RecentSearch) => addRecentSearch(r);

  const openRecent = (r: RecentSearch) => {
    if (r.kind === 'album') nav.album(r.id);
    else if (r.kind === 'artist') nav.artist(r.id);
    else if (r.kind === 'playlist') nav.playlist(r.id);
    else nav.album(r.subtitle);
  };

  const renderRow = ({ item: row }: { item: Row }) => {
    switch (row.type) {
      case 'song':
        return (
          <TrackRow
            song={row.item}
            subtitle={`Canción · ${row.item.artist ?? ''}`}
            onPress={() => {
              remember({ kind: 'song', id: row.item.id, title: row.item.title, subtitle: row.item.albumId, coverArt: row.item.coverArt });
              player.playSongs([row.item], 0, { kind: 'song', id: row.item.id, name: row.item.title });
            }}
          />
        );
      case 'artist':
        return (
          <ResultRow
            round
            coverArt={row.item.coverArt}
            uri={row.item.artistImageUrl}
            title={row.item.name}
            subtitle="Artista"
            onPress={() => {
              remember({ kind: 'artist', id: row.item.id, title: row.item.name, subtitle: 'Artista', coverArt: row.item.coverArt });
              nav.artist(row.item.id);
            }}
          />
        );
      case 'album':
        return (
          <ResultRow
            coverArt={row.item.coverArt}
            title={row.item.name}
            subtitle={`Álbum · ${row.item.artist ?? ''}`}
            onPress={() => {
              remember({ kind: 'album', id: row.item.id, title: row.item.name, subtitle: `Álbum · ${row.item.artist ?? ''}`, coverArt: row.item.coverArt });
              nav.album(row.item.id);
            }}
          />
        );
      case 'playlist':
        return (
          <ResultRow
            coverArt={row.item.coverArt}
            title={row.item.name}
            subtitle={`Playlist · ${row.item.owner ?? ''}`}
            onPress={() => {
              remember({ kind: 'playlist', id: row.item.id, title: row.item.name, subtitle: 'Playlist', coverArt: row.item.coverArt });
              nav.playlist(row.item.id);
            }}
          />
        );
    }
  };

  const searching = focused || text.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!searching && <TabHeader title="Buscar" />}
      <View style={[styles.searchRow, searching && { paddingTop: insets.top + 8, backgroundColor: '#242424', paddingBottom: 10 }]}>
        <View style={[styles.box, searching && { backgroundColor: '#3e3e3e' }]}>
          <Ionicons name="search" size={20} color={searching ? colors.text : '#121212'} />
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="¿Qué te apetece escuchar?"
            placeholderTextColor={searching ? colors.subtext : '#535353'}
            style={[styles.input, { color: searching ? colors.text : '#121212' }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            selectionColor={colors.accent}
          />
          {text ? (
            <Tap hitSlop={10} onPress={() => setText('')}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Tap>
          ) : null}
        </View>
        {searching && (
          <Tap onPress={() => { setText(''); setFocused(false); }} hitSlop={8}>
            <T variant="bodyBold">Cancelar</T>
          </Tap>
        )}
      </View>

      {searching && q ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}>
            {([['all', 'Todo'], ['song', 'Canciones'], ['artist', 'Artistas'], ['album', 'Álbumes'], ['playlist', 'Playlists']] as const).map(([k, l]) => (
              <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />
            ))}
          </ScrollView>
          <FlatList
            key="results"
            data={rows}
            keyExtractor={(r, i) => `${r.type}-${r.item.id}-${i}`}
            renderItem={renderRow}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: bottom }}
            ListEmptyComponent={
              search.isFetching ? undefined : (
                <EmptyState icon="search" title={`No se ha encontrado «${q}»`} text="Revisa la ortografía o prueba con otras palabras." />
              )
            }
          />
        </>
      ) : searching ? (
        <FlatList
          key="recent"
          data={recentSearches}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: bottom }}
          ListHeaderComponent={recentSearches.length ? <T variant="h3" style={{ padding: 16 }}>Búsquedas recientes</T> : (
            <EmptyState icon="musical-notes-outline" title="Escucha lo que te apetezca" text="Busca artistas, canciones, álbumes y playlists." />
          )}
          renderItem={({ item }) => (
            <ResultRow
              round={item.kind === 'artist'}
              coverArt={item.coverArt}
              title={item.title}
              subtitle={item.kind === 'song' ? 'Canción' : item.subtitle}
              onPress={() => openRecent(item)}
              right={
                <Tap hitSlop={10} onPress={() => removeRecentSearch(item.id)}>
                  <Ionicons name="close" size={20} color={colors.subtext} />
                </Tap>
              }
            />
          )}
          ListFooterComponent={
            recentSearches.length ? (
              <Tap onPress={clearRecentSearches} style={styles.clear}>
                <T variant="bodyBold" style={{ fontSize: 14 }}>Borrar búsquedas recientes</T>
              </Tap>
            ) : undefined
          }
        />
      ) : (
        <FlatList
          key="genres"
          data={genres.data ?? []}
          keyExtractor={(g) => g.value}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: bottom }}
          ListHeaderComponent={<T variant="h3" style={{ paddingHorizontal: 16, marginTop: 12 }}>Explorar todo</T>}
          renderItem={({ item }) => (
            <Tap style={[styles.genre, { backgroundColor: colorFor(item.value) }]} onPress={() => nav.genre(item.value)}>
              <T variant="h3" numberOfLines={2} style={{ fontSize: 17 }}>{item.value}</T>
              <View style={styles.genreTile}>
                <T variant="tiny" color="#fff">{item.albumCount} álb.</T>
              </View>
            </Tap>
          )}
        />
      )}
    </View>
  );
}

function ResultRow(p: { title: string; subtitle?: string; coverArt?: string; uri?: string; round?: boolean; onPress: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.result}>
      <Tap style={styles.resultMain} onPress={p.onPress} scale={0.99}>
        <Cover coverArt={p.coverArt} uri={p.uri} size={52} round={p.round} icon={p.round ? 'person' : 'disc'} />
        <View style={{ flex: 1 }}>
          <T variant="body" numberOfLines={1} style={{ fontSize: 16 }}>{p.title}</T>
          {p.subtitle ? <T variant="caption" numberOfLines={1}>{p.subtitle}</T> : null}
        </View>
      </Tap>
      {p.right ?? <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, height: 46 },
  genre: { flex: 1, height: 100, borderRadius: 6, padding: 12, overflow: 'hidden' },
  genreTile: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  resultMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clear: { alignSelf: 'center', borderWidth: 1, borderColor: colors.muted, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, marginTop: 16 },
});
