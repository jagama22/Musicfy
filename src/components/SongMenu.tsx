import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import {
  useAddToPlaylist,
  useCreatePlaylist,
  usePlaylists,
  useRemoveFromPlaylist,
  useStarredIds,
  useToggleStar,
} from '@/api/queries';
import { api } from '@/api/subsonic';
import type { Song } from '@/api/types';
import { player } from '@/player/engine';
import { colors, fonts } from '@/theme';
import { useNav } from '@/utils/nav';
import { Cover } from './Cover';
import { Tap } from './Pressable';
import { T } from './T';
import { toast } from './Toast';

interface MenuState {
  song: Song | null;
  playlistCtx?: { playlistId: string; index: number };
  /** Abre directamente el selector de playlist (desde el reproductor). */
  startStep?: Step;
}
type Step = 'menu' | 'playlists' | 'new';

const useMenuStore = create<MenuState>(() => ({ song: null }));

export const openSongMenu = (song: Song, playlistCtx?: MenuState['playlistCtx']) =>
  useMenuStore.setState({ song, playlistCtx, startStep: 'menu' });
export const openAddToPlaylist = (song: Song) => useMenuStore.setState({ song, playlistCtx: undefined, startStep: 'playlists' });
const close = () => useMenuStore.setState({ song: null });

export function SongMenuHost() {
  const { song, playlistCtx, startStep } = useMenuStore();
  return (
    <Modal visible={!!song} transparent animationType="slide" onRequestClose={close}>
      {song ? <MenuBody key={song.id + startStep} song={song} playlistCtx={playlistCtx} startStep={startStep ?? 'menu'} /> : null}
    </Modal>
  );
}

function MenuBody({ song, playlistCtx, startStep }: { song: Song; playlistCtx?: MenuState['playlistCtx']; startStep: Step }) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const [step, setStep] = useState<Step>(startStep);
  const [newName, setNewName] = useState('');
  const starred = useStarredIds().has(song.id);
  const toggleStar = useToggleStar();
  const playlists = usePlaylists();
  const addTo = useAddToPlaylist();
  const create = useCreatePlaylist();
  const removeFrom = useRemoveFromPlaylist();

  const Item = ({ icon, label, onPress, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color?: string }) => (
    <Tap style={styles.item} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color ?? colors.subtext} />
      <T variant="body" style={{ fontSize: 16 }}>{label}</T>
    </Tap>
  );

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close}>
        <View style={{ flex: 1, backgroundColor: colors.overlay }} />
      </Pressable>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Cover coverArt={song.coverArt} size={52} />
          <View style={{ flex: 1 }}>
            <T variant="bodyBold" numberOfLines={1}>{song.title}</T>
            <T variant="caption" numberOfLines={1}>{song.artist}</T>
          </View>
        </View>
        <View style={styles.divider} />

        {step === 'menu' && (
          <ScrollView style={{ maxHeight: 460 }}>
            <Item
              icon={starred ? 'heart' : 'heart-outline'}
              color={starred ? colors.accent : undefined}
              label={starred ? 'Quitar de Canciones que te gustan' : 'Añadir a Canciones que te gustan'}
              onPress={() => {
                toggleStar.mutate({ kind: 'song', id: song.id, starred, song });
                close();
              }}
            />
            <Item icon="add-circle-outline" label="Añadir a playlist" onPress={() => setStep('playlists')} />
            {playlistCtx && (
              <Item
                icon="remove-circle-outline"
                label="Quitar de esta playlist"
                onPress={() => {
                  removeFrom.mutate(playlistCtx);
                  toast('Eliminada de la playlist');
                  close();
                }}
              />
            )}
            <Item
              icon="list"
              label="Añadir a la cola"
              onPress={() => {
                player.addToQueue(song);
                toast('Añadida a la cola');
                close();
              }}
            />
            <Item
              icon="radio-outline"
              label="Ir a radio de la canción"
              onPress={async () => {
                close();
                try {
                  const similar = await api.getSimilarSongs(song.id, 50);
                  const songs = [song, ...similar.filter((s) => s.id !== song.id)];
                  player.playSongs(songs, 0, { kind: 'mix', id: `radio-${song.id}`, name: `Radio de ${song.title}` }, { shuffle: false });
                } catch {
                  toast('No se pudo crear la radio');
                }
              }}
            />
            {song.albumId && <Item icon="disc-outline" label="Ir al álbum" onPress={() => { close(); nav.album(song.albumId); }} />}
            {song.artistId && <Item icon="person-outline" label="Ir al artista" onPress={() => { close(); nav.artist(song.artistId); }} />}
          </ScrollView>
        )}

        {step === 'playlists' && (
          <ScrollView style={{ maxHeight: 460 }}>
            <Item icon="add" color={colors.text} label="Nueva playlist" onPress={() => setStep('new')} />
            {(playlists.data ?? []).map((p) => (
              <Tap
                key={p.id}
                style={styles.item}
                onPress={() => {
                  addTo.mutate({ playlistId: p.id, songIds: [song.id] });
                  toast(`Añadida a ${p.name}`);
                  close();
                }}
              >
                <Cover coverArt={p.coverArt} size={40} icon="musical-notes" />
                <View style={{ flex: 1 }}>
                  <T variant="body" numberOfLines={1}>{p.name}</T>
                  <T variant="small">{p.songCount ?? 0} canciones</T>
                </View>
              </Tap>
            ))}
          </ScrollView>
        )}

        {step === 'new' && (
          <View style={{ padding: 20, gap: 20 }}>
            <T variant="h2" style={{ textAlign: 'center' }}>Ponle nombre a tu playlist</T>
            <TextInput
              autoFocus
              value={newName}
              onChangeText={setNewName}
              placeholder="Mi playlist"
              placeholderTextColor={colors.muted}
              style={styles.input}
              selectionColor={colors.accent}
            />
            <Tap
              style={styles.pill}
              onPress={async () => {
                const name = newName.trim() || 'Mi playlist';
                await create.mutateAsync({ name, songIds: [song.id] });
                toast(`Añadida a ${name}`);
                close();
              }}
            >
              <T variant="bodyBold" color="#000">Crear</T>
            </Tap>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#242424', borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#5a5a5a', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#3e3e3e', marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 13 },
  input: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 24,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
    paddingVertical: 8,
  },
  pill: {
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 36,
    paddingVertical: 12,
  },
});
