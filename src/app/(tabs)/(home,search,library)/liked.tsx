import { useWindowDimensions } from 'react-native';
import { useStarred } from '@/api/queries';
import { CollectionScreen, LikedArt } from '@/components/CollectionScreen';
import { EmptyState } from '@/components/States';
import { useSession } from '@/store/session';

export default function LikedScreen() {
  const q = useStarred();
  const user = useSession((s) => s.session?.username);
  const { width } = useWindowDimensions();
  const songs = q.data?.song ?? [];
  return (
    <CollectionScreen
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      title="Canciones que te gustan"
      art={<LikedArt size={Math.min(width * 0.62, 260)} />}
      colorKey="liked-songs"
      songs={songs}
      context={{ kind: 'liked', id: 'liked', name: 'Canciones que te gustan' }}
      meta={`${user ?? ''} · ${songs.length} canciones`}
      emptyNode={<EmptyState icon="heart-outline" title="Las canciones que te gustan aparecerán aquí" text="Guarda canciones pulsando el corazón." />}
    />
  );
}
