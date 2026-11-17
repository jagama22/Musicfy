import { useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Song } from '@/api/types';
import { player, type PlayContext } from '@/player/engine';
import { colorFor, colors, darken } from '@/theme';
import { Cover } from './Cover';
import { PlayButton, ShuffleToggle } from './PlayButton';
import { Tap } from './Pressable';
import { ErrorState, Loading, useBottomSpace } from './States';
import { T } from './T';
import { TrackRow } from './TrackRow';

export interface CollectionProps {
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  title: string;
  coverArt?: string;
  /** Arte personalizado (Canciones que te gustan, mixes). */
  art?: ReactNode;
  colorKey: string;
  /** Línea bajo el título: artista, propietario… */
  owner?: ReactNode;
  meta?: string;
  description?: string;
  songs: Song[];
  context: PlayContext;
  /** Iconos de acción a la izquierda (me gusta, menú…). */
  actions?: ReactNode;
  rowProps?: (song: Song, index: number) => Partial<React.ComponentProps<typeof TrackRow>>;
  footer?: ReactNode;
  emptyNode?: ReactNode;
}

export function CollectionScreen(p: CollectionProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottom = useBottomSpace();
  const scrollY = useRef(new Animated.Value(0)).current;
  const base = colorFor(p.colorKey);
  const coverSize = Math.min(width * 0.62, 260);

  if (p.loading) return <Loading />;
  if (p.error) return <ErrorState error={p.error} onRetry={p.onRetry} />;

  const barOpacity = scrollY.interpolate({ inputRange: [coverSize * 0.6, coverSize + 40], outputRange: [0, 1], extrapolate: 'clamp' });
  const coverScale = scrollY.interpolate({ inputRange: [-100, 0, coverSize], outputRange: [1.1, 1, 0.75], extrapolate: 'clamp' });
  const coverOpacity = scrollY.interpolate({ inputRange: [0, coverSize], outputRange: [1, 0.15], extrapolate: 'clamp' });

  const header = (
    <View>
      <LinearGradient
        colors={[base, darken(base, 0.55), colors.bg]}
        locations={[0, 0.55, 1]}
        style={[StyleSheet.absoluteFill, { top: -400 }]}
      />
      <View style={{ paddingTop: insets.top + 56, alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ scale: coverScale }], opacity: coverOpacity, ...shadow }}>
          {p.art ?? <Cover coverArt={p.coverArt} size={coverSize} radius={2} icon="disc" />}
        </Animated.View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 8 }}>
        <T variant="h1" numberOfLines={2}>{p.title}</T>
        {p.description ? <T variant="caption" numberOfLines={3}>{p.description}</T> : null}
        {p.owner}
        {p.meta ? <T variant="caption">{p.meta}</T> : null}
        <View style={styles.actions}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, flex: 1 }}>{p.actions}</View>
          <ShuffleToggle size={28} />
          <PlayButton
            context={p.context}
            onPlay={() => player.playSongs(p.songs, undefined, p.context)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.FlatList
        data={p.songs}
        keyExtractor={(s, i) => `${s.id}-${i}`}
        ListHeaderComponent={header}
        ListEmptyComponent={p.emptyNode ? <View>{p.emptyNode}</View> : undefined}
        ListFooterComponent={<View style={{ paddingBottom: bottom }}>{p.footer}</View>}
        renderItem={({ item, index }) => (
          <TrackRow
            song={item}
            onPress={() => player.playSongs(p.songs, index, p.context)}
            {...p.rowProps?.(item, index)}
          />
        )}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
      <TopBar title={p.title} color={darken(base, 0.35)} opacity={barOpacity} />
    </View>
  );
}

export function TopBar({ title, color, opacity }: { title: string; color: string; opacity: Animated.AnimatedInterpolation<number> | number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top, height: insets.top + 52 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity }]} pointerEvents="none" />
      <Tap hitSlop={12} onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Tap>
      <Animated.View style={{ flex: 1, opacity, marginRight: 48 }} pointerEvents="none">
        <T variant="h3" numberOfLines={1} style={{ textAlign: 'center' }}>{title}</T>
      </Animated.View>
    </View>
  );
}

/** Arte de «Canciones que te gustan»: degradado violeta con corazón. */
export function LikedArt({ size }: { size: number }) {
  return (
    <LinearGradient colors={['#450af5', '#8e8ee5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size > 80 ? 2 : 4, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="heart" size={size * 0.42} color="#fff" />
    </LinearGradient>
  );
}

/** Arte de un mix: color sólido con el nombre del mix, al estilo de los «Daily Mix». */
export function MixArt({ size, title, colorKey }: { size: number; title: string; colorKey: string }) {
  const c = colorFor(colorKey);
  return (
    <LinearGradient colors={[c, darken(c, 0.5)]} style={{ width: size, height: size, borderRadius: 4, padding: size * 0.08, justifyContent: 'space-between' }}>
      <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="musical-note" size={size * 0.1} color={c} />
      </View>
      <View>
        <T variant="display" numberOfLines={2} style={{ fontSize: size * 0.14, lineHeight: size * 0.16 }}>{title}</T>
        <View style={{ height: 4, width: '100%', backgroundColor: c, marginTop: 6, borderRadius: 2, opacity: 0.9 }} />
      </View>
    </LinearGradient>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.5,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 12,
};

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4, marginBottom: 12 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  back: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
