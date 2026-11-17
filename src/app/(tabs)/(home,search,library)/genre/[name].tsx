import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlbumsByGenre, useGenreSongs } from '@/api/queries';
import { MediaCard } from '@/components/Cards';
import { MixArt, TopBar } from '@/components/CollectionScreen';
import { PlayButton } from '@/components/PlayButton';
import { Tap } from '@/components/Pressable';
import { ErrorState, Loading, useBottomSpace } from '@/components/States';
import { T } from '@/components/T';
import { player } from '@/player/engine';
import { colorFor, colors } from '@/theme';
import { useNav } from '@/utils/nav';

export default function GenreScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpace();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const albums = useAlbumsByGenre(name);
  const songs = useGenreSongs(name);
  const tile = (width - 16 * 2 - 14) / 2;

  if (albums.isLoading) return <Loading />;
  if (albums.error) return <ErrorState error={albums.error} onRetry={albums.refetch} />;

  const ctx = { kind: 'genre' as const, id: name, name };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={albums.data ?? []}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 20, paddingBottom: bottom }}
        ListHeaderComponent={
          <View>
            <LinearGradient colors={[colorFor(name), colors.bg]} style={[StyleSheet.absoluteFill, { top: -300 }]} />
            <View style={{ paddingTop: insets.top + 64, paddingHorizontal: 16 }}>
              <T variant="display" style={{ fontSize: 40, lineHeight: 44 }}>{name}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 }}>
                <Tap onPress={() => nav.mix(`genre:${name}`)}>
                  <MixArt size={88} title={name} colorKey={name} />
                </Tap>
                <View style={{ flex: 1 }}>
                  <T variant="h3">Mix de {name}</T>
                  <T variant="caption">{songs.data?.length ?? 0} canciones al azar del género</T>
                </View>
                <PlayButton context={ctx} onPlay={() => songs.data && player.playSongs(songs.data, 0, ctx, { shuffle: false })} />
              </View>
              <T variant="h2" style={{ marginTop: 28 }}>Álbumes</T>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <MediaCard
            size={tile}
            item={{ key: item.id, title: item.name, subtitle: item.artist, coverArt: item.coverArt, onPress: () => nav.album(item.id) }}
          />
        )}
      />
      <TopBar title={name} color={colorFor(name)} opacity={0} />
    </View>
  );
}
