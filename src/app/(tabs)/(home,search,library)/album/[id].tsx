import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAlbum, useArtist } from '@/api/queries';
import { Shelf } from '@/components/Cards';
import { CollectionScreen } from '@/components/CollectionScreen';
import { Cover } from '@/components/Cover';
import { LikeButton } from '@/components/LikeButton';
import { Tap } from '@/components/Pressable';
import { T } from '@/components/T';
import { formatDuration } from '@/player/hooks';
import { useNav } from '@/utils/nav';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNav();
  const q = useAlbum(id);
  const album = q.data;
  const artist = useArtist(album?.artistId ?? '');
  const more = (artist.data?.album ?? []).filter((a) => a.id !== id);
  const songs = album?.song ?? [];
  const multiDisc = new Set(songs.map((s) => s.discNumber ?? 1)).size > 1;

  return (
    <CollectionScreen
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      title={album?.name ?? ''}
      coverArt={album?.coverArt}
      colorKey={id}
      songs={songs}
      context={{ kind: 'album', id, name: album?.name ?? '' }}
      owner={
        album?.artistId ? (
          <Tap style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => nav.artist(album.artistId)}>
            <Cover coverArt={artist.data?.coverArt ?? album.coverArt} uri={artist.data?.artistImageUrl} size={24} round icon="person" />
            <T variant="bodyBold" style={{ fontSize: 14 }}>{album.artist}</T>
          </Tap>
        ) : null
      }
      meta={[album?.year ? `Álbum · ${album.year}` : 'Álbum', album?.genre].filter(Boolean).join(' · ')}
      actions={album ? <LikeButton kind="album" id={album.id} size={28} /> : null}
      rowProps={(s) => ({ showCover: false, number: multiDisc ? undefined : s.track, subtitle: s.artist })}
      footer={
        <View>
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 2 }}>
            <T variant="bodyBold" style={{ fontSize: 14 }}>{album?.year ?? ''}</T>
            <T variant="caption">
              {songs.length} canciones · {formatDuration(album?.duration)}
            </T>
          </View>
          <Shelf
            title={`Más de ${album?.artist ?? 'este artista'}`}
            items={more.map((a) => ({ key: a.id, title: a.name, subtitle: a.year ? String(a.year) : 'Álbum', coverArt: a.coverArt, onPress: () => nav.album(a.id) }))}
          />
        </View>
      }
    />
  );
}
