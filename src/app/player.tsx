import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cover } from '@/components/Cover';
import { LikeButton } from '@/components/LikeButton';
import { Tap } from '@/components/Pressable';
import { SeekBar } from '@/components/SeekBar';
import { openSongMenu } from '@/components/SongMenu';
import { T } from '@/components/T';
import { player, useCurrentSong, usePlayer, type PlayContext } from '@/player/engine';
import { usePlaybackStatus } from '@/player/hooks';
import { colorFor, colors, darken } from '@/theme';
import { useNav } from '@/utils/nav';

const contextLabel: Record<PlayContext['kind'], string> = {
  album: 'REPRODUCIENDO DESDE ÁLBUM',
  playlist: 'REPRODUCIENDO DESDE PLAYLIST',
  artist: 'REPRODUCIENDO DESDE ARTISTA',
  liked: 'REPRODUCIENDO DESDE TU BIBLIOTECA',
  genre: 'REPRODUCIENDO DESDE GÉNERO',
  mix: 'REPRODUCIENDO DESDE MIX',
  search: 'REPRODUCIENDO DESDE BÚSQUEDA',
  song: 'REPRODUCIENDO CANCIÓN',
  restored: 'CONTINÚA ESCUCHANDO',
};

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const song = useCurrentSong();
  const status = usePlaybackStatus();
  const { shuffle, repeat, context } = usePlayer();
  const nav = useNav();
  const translateY = useRef(new Animated.Value(0)).current;

  // Deslizar hacia abajo para cerrar (como Spotify).
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => g.dy > 0 && translateY.setValue(g.dy),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 140 || g.vy > 1.2) router.back();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  if (!song) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Tap onPress={() => router.back()}><T variant="bodyBold">Nada en reproducción</T></Tap>
      </View>
    );
  }

  const base = colorFor(song.albumId ?? song.id);
  const coverSize = Math.min(width - 48, height * 0.42, 420);
  const repeatIcon = repeat === 'off' ? 'repeat' : 'repeat';

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY }] }} {...pan.panHandlers}>
      <LinearGradient colors={[darken(base, 0.1), darken(base, 0.6), '#121212']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.container, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Tap hitSlop={12} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </Tap>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T variant="tiny" color={colors.text} style={{ letterSpacing: 1 }}>{context ? contextLabel[context.kind] : ''}</T>
            <T variant="bodyBold" numberOfLines={1} style={{ fontSize: 13 }}>{context?.name}</T>
          </View>
          <Tap hitSlop={12} onPress={() => openSongMenu(song)}>
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
          </Tap>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Cover coverArt={song.coverArt} size={coverSize} radius={6} style={styles.cover} />
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Tap onPress={() => nav.album(song.albumId)}>
              <T variant="h2" numberOfLines={1} style={{ fontSize: 22 }}>{song.title}</T>
            </Tap>
            <Tap onPress={() => nav.artist(song.artistId)}>
              <T variant="body" color="rgba(255,255,255,0.7)" numberOfLines={1} style={{ fontSize: 16 }}>{song.artist}</T>
            </Tap>
          </View>
          <LikeButton kind="song" id={song.id} song={song} size={28} color={colors.text} />
        </View>

        <View style={{ marginTop: 14 }}>
          <SeekBar position={status.currentTime} duration={status.duration || song.duration || 0} onSeek={(s) => player.seek(s)} />
        </View>

        <View style={styles.controls}>
          <Tap hitSlop={10} onPress={() => player.toggleShuffle()}>
            <Ionicons name="shuffle" size={28} color={shuffle ? colors.accent : colors.text} />
            {shuffle && <View style={styles.dot} />}
          </Tap>
          <Tap hitSlop={10} onPress={() => player.previous()}>
            <Ionicons name="play-skip-back" size={36} color={colors.text} />
          </Tap>
          <Tap scale={0.92} style={styles.play} onPress={() => player.togglePlay()}>
            <Ionicons name={status.playing ? 'pause' : 'play'} size={34} color="#000" style={{ marginLeft: status.playing ? 0 : 4 }} />
          </Tap>
          <Tap hitSlop={10} onPress={() => player.next()}>
            <Ionicons name="play-skip-forward" size={36} color={colors.text} />
          </Tap>
          <Tap hitSlop={10} onPress={() => player.cycleRepeat()}>
            <View>
              <Ionicons name={repeatIcon} size={28} color={repeat !== 'off' ? colors.accent : colors.text} />
              {repeat === 'one' && (
                <View style={styles.one}>
                  <T variant="tiny" color="#000" style={{ fontSize: 8 }}>1</T>
                </View>
              )}
            </View>
            {repeat !== 'off' && <View style={styles.dot} />}
          </Tap>
        </View>

        <View style={styles.bottomRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.accent} />
            <T variant="small" color={colors.accent}>Este iPhone</T>
          </View>
          <Tap hitSlop={12} onPress={() => router.push('/queue')}>
            <Ionicons name="list" size={24} color={colors.text} />
          </Tap>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48 },
  cover: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  play: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: -8, alignSelf: 'center', width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  one: { position: 'absolute', top: 7, right: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
});
