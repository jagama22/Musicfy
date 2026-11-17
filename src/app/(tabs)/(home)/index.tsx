import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useAlbumList, useGenres, usePlaylists, useStarred } from '@/api/queries';
import type { Album } from '@/api/types';
import { Shelf, type CardItem } from '@/components/Cards';
import { LikedArt, MixArt } from '@/components/CollectionScreen';
import { Cover } from '@/components/Cover';
import { Tap } from '@/components/Pressable';
import { EmptyState, useBottomSpace } from '@/components/States';
import { T } from '@/components/T';
import { Avatar, Chip } from '@/components/TabHeader';
import { colorFor, colors, darken } from '@/theme';
import { useNav } from '@/utils/nav';

type Filter = 'all' | 'music' | 'playlists';

function greeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 13) return 'Buenos días';
  if (h >= 13 && h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpace();
  const nav = useNav();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const recent = useAlbumList('recent', 20);
  const frequent = useAlbumList('frequent', 20);
  const newest = useAlbumList('newest', 20);
  const random = useAlbumList('random', 20);
  const playlists = usePlaylists();
  const genres = useGenres();
  const starred = useStarred();

  const albumCards = (list: Album[] | undefined): CardItem[] =>
    (list ?? []).map((a) => ({
      key: a.id,
      title: a.name,
      subtitle: a.artist,
      coverArt: a.coverArt,
      onPress: () => nav.album(a.id),
    }));

  // Accesos rápidos (rejilla 2×4): Me gusta + playlists + álbumes recientes.
  const quick = useMemo(() => {
    const items: { key: string; title: string; art: React.ReactNode; onPress: () => void }[] = [];
    if ((starred.data?.song?.length ?? 0) > 0)
      items.push({ key: 'liked', title: 'Canciones que te gustan', art: <LikedArt size={56} />, onPress: nav.liked });
    (playlists.data ?? []).slice(0, 3).forEach((p) =>
      items.push({ key: p.id, title: p.name, art: <Cover coverArt={p.coverArt} size={56} radius={0} />, onPress: () => nav.playlist(p.id) }),
    );
    (recent.data ?? []).forEach((a) => {
      if (items.length < 8) items.push({ key: a.id, title: a.name, art: <Cover coverArt={a.coverArt} size={56} radius={0} />, onPress: () => nav.album(a.id) });
    });
    return items.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starred.data, playlists.data, recent.data]);

  // «Mixes» generados a partir de tus géneros con más canciones.
  const mixes: CardItem[] = (genres.data ?? []).slice(0, 6).map((g, i) => ({
    key: `genre:${g.value}`,
    title: `Mix ${i + 1}`,
    subtitle: g.value,
    onPress: () => nav.mix(`genre:${g.value}`),
  }));

  // Artistas destacados a partir de lo que más escuchas.
  const artists: CardItem[] = useMemo(() => {
    const seen = new Set<string>();
    const out: CardItem[] = [];
    for (const a of [...(frequent.data ?? []), ...(recent.data ?? [])]) {
      if (!a.artistId || seen.has(a.artistId)) continue;
      seen.add(a.artistId);
      out.push({ key: a.artistId, title: a.artist ?? '', subtitle: 'Artista', coverArt: a.coverArt, round: true, onPress: () => nav.artist(a.artistId) });
    }
    return out.slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequent.data, recent.data]);

  const playlistCards: CardItem[] = (playlists.data ?? []).map((p) => ({
    key: p.id,
    title: p.name,
    subtitle: `Playlist · ${p.owner ?? ''}`,
    coverArt: p.coverArt,
    onPress: () => nav.playlist(p.id),
  }));

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  const topColor = darken(colorFor(recent.data?.[0]?.id ?? 'home'), 0.3);
  const showMusic = filter !== 'playlists';
  const showPlaylists = filter !== 'music';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[topColor, colors.bg]} locations={[0, 0.35]} style={[StyleSheet.absoluteFill, { height: 420 }]} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.subtext} />}
      >
        <View style={styles.headerRow}>
          <Avatar />
          <Chip label="Todo" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Música" active={filter === 'music'} onPress={() => setFilter('music')} />
          <Chip label="Playlists" active={filter === 'playlists'} onPress={() => setFilter('playlists')} />
        </View>

        <T variant="h1" style={{ paddingHorizontal: 16, marginTop: 14, marginBottom: 14 }}>{greeting()}</T>

        <View style={styles.grid}>
          {quick.map((q) => (
            <Tap key={q.key} style={styles.quick} onPress={q.onPress} scale={0.98}>
              {q.art}
              <T variant="bodyBold" numberOfLines={2} style={{ flex: 1, fontSize: 13, paddingHorizontal: 8 }}>{q.title}</T>
            </Tap>
          ))}
        </View>

        {showMusic && mixes.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <T variant="h2" style={{ paddingHorizontal: 16, marginBottom: 12 }}>Tus mixes más escuchados</T>
            <FlatList
              horizontal
              data={mixes}
              keyExtractor={(m) => m.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
              renderItem={({ item }) => (
                <Tap style={{ width: 150 }} onPress={item.onPress}>
                  <MixArt size={150} title={item.title} colorKey={item.subtitle ?? item.key} />
                  <T variant="caption" numberOfLines={2} style={{ marginTop: 8 }}>{item.subtitle}</T>
                </Tap>
              )}
            />
          </View>
        )}
        {showMusic && <Shelf title="Escuchado recientemente" items={albumCards(recent.data)} size={130} />}
        {showPlaylists && <Shelf title="Tus playlists" items={playlistCards} />}
        {showMusic && <Shelf title="Tus álbumes más escuchados" items={albumCards(frequent.data)} />}
        {showMusic && <Shelf title="Tus artistas favoritos" items={artists} />}
        {showMusic && <Shelf title="Novedades en tu biblioteca" items={albumCards(newest.data)} />}
        {showMusic && (
          <View>
            <Shelf title="Descubre algo nuevo" items={albumCards(random.data)} />
          </View>
        )}
        {filter === 'playlists' && !playlistCards.length && (
          <EmptyState icon="musical-notes-outline" title="Aún no tienes playlists" text="Créalas desde Tu biblioteca." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  quick: {
    width: '48.5%',
    flexGrow: 1,
    flexBasis: '45%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
});
