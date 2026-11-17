import { useRef, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { fetchArtistSongs, useArtist, useArtistInfo, useStarredIds, useToggleStar, useTopSongs } from '@/api/queries';
import { coverUrl } from '@/api/subsonic';
import type { Song } from '@/api/types';
import { Shelf } from '@/components/Cards';
import { TopBar } from '@/components/CollectionScreen';
import { PlayButton, ShuffleToggle } from '@/components/PlayButton';
import { Tap } from '@/components/Pressable';
import { ErrorState, Loading, useBottomSpace } from '@/components/States';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { TrackRow } from '@/components/TrackRow';
import { player } from '@/player/engine';
import { colorFor, colors, darken } from '@/theme';
import { useNav } from '@/utils/nav';

const stripHtml = (s?: string) => (s ?? '').replace(/<a [^>]*>.*?<\/a>/g, '').replace(/<[^>]+>/g, '').trim();

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const bottom = useBottomSpace();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showAll, setShowAll] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);

  const artist = useArtist(id);
  const info = useArtistInfo(id);
  const top = useTopSongs(artist.data?.name);
  const following = useStarredIds().has(id);
  const toggleStar = useToggleStar();

  if (artist.isLoading) return <Loading />;
  if (artist.error || !artist.data) return <ErrorState error={artist.error} onRetry={artist.refetch} />;

  const a = artist.data;
  const albums = [...(a.album ?? [])].sort((x, y) => (y.year ?? 0) - (x.year ?? 0));
  const popular = (top.data ?? []).slice(0, showAll ? 10 : 5);
  const heroH = Math.min(width * 0.95, 380);
  const image = info.data?.largeImageUrl || a.artistImageUrl || coverUrl(a.coverArt ?? albums[0]?.coverArt, 600);
  const ctx = { kind: 'artist' as const, id, name: a.name };
  const base = colorFor(id);

  const playArtist = async () => {
    let songs: Song[] = top.data ?? [];
    if (!songs.length) songs = await fetchArtistSongs(id);
    player.playSongs(songs, undefined, ctx);
  };

  const heroScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.6, 1], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, heroH * 0.8], outputRange: [1, 0.2], extrapolate: 'clamp' });
  const barOpacity = scrollY.interpolate({ inputRange: [heroH * 0.6, heroH - 40], outputRange: [0, 1], extrapolate: 'clamp' });
  const bio = stripHtml(info.data?.biography);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.View style={[styles.hero, { height: heroH, opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: darken(base, 0.4) }]} />
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom }}
      >
        <View style={{ height: heroH, justifyContent: 'flex-end', padding: 16 }}>
          <T variant="display" style={{ fontSize: 44, lineHeight: 48 }} numberOfLines={2}>{a.name}</T>
        </View>
        <View style={{ backgroundColor: colors.bg, paddingTop: 12 }}>
          <View style={styles.actions}>
            <T variant="caption" style={{ position: 'absolute', top: -6, left: 16 }}>
              {a.albumCount ?? albums.length} álbumes
            </T>
            <Tap
              style={[styles.follow, following && { borderColor: colors.text }]}
              onPress={() => {
                toggleStar.mutate({ kind: 'artist', id, starred: following });
                toast(following ? 'Has dejado de seguir al artista' : 'Siguiendo');
              }}
            >
              <T variant="bodyBold" style={{ fontSize: 13 }}>{following ? 'Siguiendo' : 'Seguir'}</T>
            </Tap>
            <View style={{ flex: 1 }} />
            <ShuffleToggle size={28} />
            <PlayButton context={ctx} onPlay={playArtist} />
          </View>

          {popular.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <T variant="h2" style={{ paddingHorizontal: 16, marginBottom: 8 }}>Populares</T>
              {popular.map((s, i) => (
                <TrackRow key={s.id} song={s} number={i + 1} subtitle={s.album} onPress={() => player.playSongs(top.data ?? [], i, ctx)} />
              ))}
              {(top.data?.length ?? 0) > 5 && (
                <Tap onPress={() => setShowAll(!showAll)} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <T variant="bodyBold" color={colors.subtext} style={{ fontSize: 13 }}>{showAll ? 'Mostrar menos' : 'Ver más'}</T>
                </Tap>
              )}
            </View>
          )}

          <Shelf
            title="Discografía"
            items={albums.map((al) => ({
              key: al.id,
              title: al.name,
              subtitle: [al.year, 'Álbum'].filter(Boolean).join(' · '),
              coverArt: al.coverArt,
              onPress: () => nav.album(al.id),
            }))}
          />

          <Shelf
            title="A los fans también les gusta"
            items={(info.data?.similarArtist ?? []).map((s) => ({
              key: s.id,
              title: s.name,
              subtitle: 'Artista',
              coverArt: s.coverArt,
              uri: s.artistImageUrl,
              round: true,
              onPress: () => nav.artist(s.id),
            }))}
            size={130}
          />

          {bio ? (
            <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
              <T variant="h2" style={{ marginBottom: 12 }}>Información</T>
              <Tap onPress={() => setBioOpen(!bioOpen)} style={styles.bio}>
                <T variant="body" numberOfLines={bioOpen ? undefined : 4} style={{ fontSize: 14, lineHeight: 20 }}>{bio}</T>
              </Tap>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>
      <TopBar title={a.name} color={darken(base, 0.35)} opacity={barOpacity} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  follow: { borderWidth: 1, borderColor: colors.muted, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
  bio: { backgroundColor: colors.elevated, borderRadius: 8, padding: 16 },
});
