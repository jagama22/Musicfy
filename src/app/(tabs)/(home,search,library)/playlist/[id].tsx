import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useDeletePlaylist, usePlaylist, useRenamePlaylist } from '@/api/queries';
import { CollectionScreen } from '@/components/CollectionScreen';
import { Tap } from '@/components/Pressable';
import { PromptModal } from '@/components/Prompt';
import { EmptyState } from '@/components/States';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { player } from '@/player/engine';
import { formatDuration } from '@/player/hooks';
import { colors } from '@/theme';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = usePlaylist(id);
  const pl = q.data;
  const rename = useRenamePlaylist();
  const del = useDeletePlaylist();
  const [editing, setEditing] = useState(false);
  const songs = pl?.entry ?? [];

  const confirmDelete = () => {
    const doIt = async () => {
      await del.mutateAsync(id);
      toast('Playlist eliminada');
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`¿Eliminar «${pl?.name}»?`)) doIt();
    } else {
      Alert.alert('¿Eliminar playlist?', `Se eliminará «${pl?.name}» del servidor.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doIt },
      ]);
    }
  };

  return (
    <>
      <CollectionScreen
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        title={pl?.name ?? ''}
        coverArt={pl?.coverArt}
        colorKey={id}
        description={pl?.comment}
        songs={songs}
        context={{ kind: 'playlist', id, name: pl?.name ?? '' }}
        owner={<T variant="bodyBold" style={{ fontSize: 14 }}>{pl?.owner}</T>}
        meta={[`${songs.length} canciones`, formatDuration(pl?.duration)].filter(Boolean).join(' · ')}
        actions={
          <>
            <Tap hitSlop={8} onPress={() => setEditing(true)}>
              <Ionicons name="pencil" size={22} color={colors.subtext} />
            </Tap>
            <Tap
              hitSlop={8}
              onPress={() => {
                player.addToQueue(songs);
                toast('Añadidas a la cola');
              }}
            >
              <Ionicons name="list" size={24} color={colors.subtext} />
            </Tap>
            <Tap hitSlop={8} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.subtext} />
            </Tap>
          </>
        }
        rowProps={(_s, index) => ({ playlistCtx: { playlistId: id, index } })}
        emptyNode={
          <View style={{ paddingTop: 20 }}>
            <EmptyState icon="add-circle-outline" title="Vamos a llenar esta playlist" text="Añade canciones desde el menú ··· de cualquier canción." />
          </View>
        }
      />
      <PromptModal
        visible={editing}
        title="Cambiar nombre"
        initial={pl?.name}
        confirmLabel="Guardar"
        onCancel={() => setEditing(false)}
        onConfirm={(name) => {
          setEditing(false);
          if (name && name !== pl?.name) rename.mutate({ playlistId: id, name });
        }}
      />
    </>
  );
}
