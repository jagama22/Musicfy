import { useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGenreSongs, useRandomSongs } from '@/api/queries';
import { CollectionScreen, MixArt } from '@/components/CollectionScreen';

/** Mix generado: `genre:<nombre>` o `random`. */
export default function MixScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { width } = useWindowDimensions();
  const genre = key?.startsWith('genre:') ? key.slice(6) : '';
  const byGenre = useGenreSongs(genre);
  const random = useRandomSongs(`mix-${key}`, 60);
  const q = genre ? byGenre : random;
  const songs = q.data ?? [];
  const title = genre ? `Mix de ${genre}` : 'Mix aleatorio';
  const artists = [...new Set(songs.map((s) => s.artist).filter(Boolean))].slice(0, 4).join(', ');
  return (
    <CollectionScreen
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      title={title}
      art={<MixArt size={Math.min(width * 0.62, 260)} title={genre || 'Mix'} colorKey={genre || key} />}
      colorKey={genre || key}
      description={artists ? `${artists} y más` : undefined}
      songs={songs}
      context={{ kind: 'mix', id: key, name: title }}
      meta={`Creado para ti · ${songs.length} canciones`}
    />
  );
}
