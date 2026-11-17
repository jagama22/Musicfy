import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlbumList, useArtists, useCreatePlaylist, usePlaylists, useStarred } from '@/api/queries';
import { LikedArt } from '@/components/CollectionScreen';
import { Cover } from '@/components/Cover';
import { Tap } from '@/components/Pressable';
import { PromptModal } from '@/components/Prompt';
import { EmptyState, useBottomSpace } from '@/components/States';
import { T } from '@/components/T';
import { Chip, TabHeader } from '@/components/TabHeader';
import { toast } from '@/components/Toast';
import { colors } from '@/theme';
import { useNav } from '@/utils/nav';

type Filter = 'none' | 'playlists' | 'artists' | 'albums';
type Sort = 'recent' | 'alpha';

interface Entry {
  key: string;
  title: string;
  subtitle: string;
  coverArt?: string;
  uri?: string;
  round?: boolean;
  liked?: boolean;
  date?: string;
  pinned?: boolean;
  onPress: () => void;
}

export default function Library() {
  const nav = useNav();
  const bottom = useBottomSpace();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('none');
  const [sort, setSort] = useState<Sort>('recent');
  const [grid, setGrid] = useState(false);
  const [creating, setCreating] = useState(false);
  const playlists = usePlaylists();
  const starred = useStarred();
  const artists = useArtists();
  const allAlbums = useAlbumList('alphabeticalByName', 500);
  const createPl = useCreatePlaylist();

  const entries: Entry[] = useMemo(() => {
    const likedCount = starred.data?.song?.length ?? 0;
    const liked: Entry = {
      key: 'liked',
      title: 'Canciones que te gustan',
      subtitle: `Playlist · ${likedCount} canciones`,
      liked: true,
      pinned: true,
      onPress: nav.liked,
    };
    const pls: Entry[] = (playlists.data ?? []).map((p) => ({
      key: `p-${p.id}`,
      title: p.name,
      subtitle: `Playlist · ${p.owner ?? ''}`,
      coverArt: p.coverArt,
      date: p.changed ?? p.created,
      onPress: () => nav.playlist(p.id),
    }));
    const starredAlbums: Entry[] = (starred.data?.album ?? []).map((a) => ({
      key: `a-${a.id}`,
      title: a.name,
      subtitle: `Álbum · ${a.artist ?? ''}`,
      coverArt: a.coverArt,
      date: a.starred,
      onPress: () => nav.album(a.id),
    }));
    const starredArtists: Entry[] = (starred.data?.artist ?? []).map((a) => ({
      key: `r-${a.id}`,
      title: a.name,
      subtitle: 'Artista',
      coverArt: a.coverArt,
      uri: a.artistImageUrl,
      round: true,
      date: a.starred,
      onPress: () => nav.artist(a.id),
    }));

    let list: Entry[];
    if (filter === 'playlists') list = [liked, ...pls];
    else if (filter === 'artists')
      list = (artists.data ?? []).map((a) => ({
        key: `r-${a.id}`,
        title: a.name,
        subtitle: `Artista · ${a.albumCount ?? 0} álbumes`,
        coverArt: a.coverArt,
        uri: a.artistImageUrl,
        round: true,
        date: a.starred,
        onPress: () => nav.artist(a.id),
      }));
    else if (filter === 'albums')
      list = (allAlbums.data ?? []).map((a) => ({
        key: `a-${a.id}`,
        title: a.name,
        subtitle: `Álbum · ${a.artist ?? ''}`,
        coverArt: a.coverArt,
        date: a.created,
        onPress: () => nav.album(a.id),
      }));
    else list = [liked, ...pls, ...starredAlbums, ...starredArtists];

    const pinned = list.filter((e) => e.pinned);
    const rest = list.filter((e) => !e.pinned);
    rest.sort((a, b) => (sort === 'alpha' ? a.title.localeCompare(b.title) : (b.date ?? '').localeCompare(a.date ?? '')));
    return [...pinned, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, playlists.data, starred.data, artists.data, allAlbums.data]);

  const cols = 3;
  const tile = (width - 32 - (cols - 1) * 12) / cols;

  const renderArt = (e: Entry, size: number) =>
    e.liked ? <LikedArt size={size} /> : <Cover coverArt={e.coverArt} uri={e.uri} size={size} round={e.round} icon={e.round ? 'person' : 'musical-notes'} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TabHeader
        title="Tu biblioteca"
        right={
          <Tap hitSlop={10} onPress={() => setCreating(true)}>
            <Ionicons name="add" size={30} color={colors.text} />
          </Tap>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 6, alignItems: 'center' }}>
        {filter !== 'none' && (
          <Tap onPress={() => setFilter('none')} style={styles.clearChip}>
            <Ionicons name="close" size={16} color={colors.text} />
          </Tap>
        )}
        {([['playlists', 'Playlists'], ['artists', 'Artistas'], ['albums', 'Álbumes']] as const)
          .filter(([k]) => filter === 'none' || filter === k)
          .map(([k, l]) => (
            <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(filter === k ? 'none' : k)} />
          ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <Tap style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={() => setSort(sort === 'recent' ? 'alpha' : 'recent')}>
          <Ionicons name="swap-vertical" size={16} color={colors.text} />
          <T variant="bodyBold" style={{ fontSize: 13 }}>{sort === 'recent' ? 'Recientes' : 'Alfabético'}</T>
        </Tap>
        <Tap hitSlop={10} onPress={() => setGrid(!grid)}>
          <Ionicons name={grid ? 'list' : 'grid-outline'} size={18} color={colors.text} />
        </Tap>
      </View>

      <FlatList
        key={grid ? 'grid' : 'list'}
        data={entries}
        keyExtractor={(e) => e.key}
        numColumns={grid ? cols : 1}
        columnWrapperStyle={grid ? { gap: 12, paddingHorizontal: 16 } : undefined}
        contentContainerStyle={{ paddingBottom: bottom, gap: grid ? 16 : 0 }}
        initialNumToRender={20}
        ListEmptyComponent={<EmptyState icon="library-outline" title="Nada por aquí todavía" />}
        renderItem={({ item }) =>
          grid ? (
            <Tap style={{ width: tile }} onPress={item.onPress}>
              {renderArt(item, tile)}
              <T variant="bodyBold" numberOfLines={1} style={{ fontSize: 13, marginTop: 6, textAlign: item.round ? 'center' : 'left' }}>{item.title}</T>
              <T variant="small" numberOfLines={1} style={{ textAlign: item.round ? 'center' : 'left' }}>{item.subtitle}</T>
            </Tap>
          ) : (
            <Tap style={styles.row} onPress={item.onPress} scale={0.99}>
              {renderArt(item, 64)}
              <View style={{ flex: 1 }}>
                <T variant="body" numberOfLines={1} style={{ fontSize: 16 }}>{item.title}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  {item.pinned && <Ionicons name="pin" size={12} color={colors.accent} style={{ transform: [{ rotate: '45deg' }] }} />}
                  <T variant="caption" numberOfLines={1}>{item.subtitle}</T>
                </View>
              </View>
            </Tap>
          )
        }
      />

      <PromptModal
        visible={creating}
        title="Ponle nombre a tu playlist"
        placeholder="Mi playlist"
        onCancel={() => setCreating(false)}
        onConfirm={async (name) => {
          setCreating(false);
          const pl = await createPl.mutateAsync({ name });
          toast(`Playlist «${name}» creada`);
          if (pl?.id) nav.playlist(pl.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clearChip: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 6 },
});
