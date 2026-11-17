import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { player, useCurrentSong } from '@/player/engine';
import { usePlaybackStatus } from '@/player/hooks';
import { colorFor, colors, darken, MINI_PLAYER_HEIGHT } from '@/theme';
import { Cover } from './Cover';
import { LikeButton } from './LikeButton';
import { Tap } from './Pressable';
import { T } from './T';

export function MiniPlayer() {
  const song = useCurrentSong();
  const status = usePlaybackStatus();

  // Deslizar a izquierda/derecha cambia de canción, como en Spotify.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -50) player.next();
        else if (g.dx > 50) player.previous();
      },
    }),
  ).current;

  if (!song) return null;
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const bg = darken(colorFor(song.albumId ?? song.id), 0.45);

  return (
    <View style={styles.wrap} {...pan.panHandlers}>
      <View style={[styles.bar, { backgroundColor: bg }]}>
        <Tap scale={0.99} style={styles.info} onPress={() => router.push('/player')}>
          <Cover coverArt={song.coverArt} size={40} radius={4} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <T variant="bodyBold" numberOfLines={1} style={{ fontSize: 14 }}>{song.title}</T>
            <T variant="small" numberOfLines={1} color="#e0e0e0">{song.artist}</T>
          </View>
        </Tap>
        <LikeButton kind="song" id={song.id} song={song} size={24} color="#fff" />
        <Tap hitSlop={10} style={{ marginLeft: 18, marginRight: 12 }} onPress={() => player.togglePlay()}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color="#fff" />
        </Tap>
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, height: MINI_PLAYER_HEIGHT, justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MINI_PLAYER_HEIGHT,
    borderRadius: 6,
    overflow: 'hidden',
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingLeft: 8, marginRight: 8 },
  track: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 1 },
  fill: { height: 2, backgroundColor: colors.text, borderRadius: 1 },
});
