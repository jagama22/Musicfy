import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Song } from '@/api/types';
import { usePlayer } from '@/player/engine';
import { colors } from '@/theme';
import { Cover } from './Cover';
import { Tap } from './Pressable';
import { T } from './T';
import { openSongMenu } from './SongMenu';

interface Props {
  song: Song;
  onPress: () => void;
  showCover?: boolean;
  /** Número de pista (vista álbum) o posición (populares del artista). */
  number?: number;
  subtitle?: string;
  playlistCtx?: { playlistId: string; index: number };
  right?: React.ReactNode;
}

function TrackRowBase({ song, onPress, showCover = true, number, subtitle, playlistCtx, right }: Props) {
  const isCurrent = usePlayer((s) => s.queue[s.index]?.song.id === song.id);
  return (
    <View style={styles.wrap}>
    <Tap style={styles.row} onPress={onPress} scale={0.99} onLongPress={() => openSongMenu(song, playlistCtx)}>
      {number !== undefined && (
        <T variant="body" color={isCurrent ? colors.accent : colors.subtext} style={styles.number}>
          {number}
        </T>
      )}
      {showCover && <Cover coverArt={song.coverArt} size={48} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body" numberOfLines={1} color={isCurrent ? colors.accent : colors.text} style={{ fontSize: 16 }}>
          {song.title}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isCurrent && <Ionicons name="stats-chart" size={11} color={colors.accent} />}
          <T variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {subtitle ?? song.artist}
          </T>
        </View>
      </View>
      {right}
    </Tap>
      <Tap hitSlop={8} style={styles.more} onPress={() => openSongMenu(song, playlistCtx)}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.subtext} />
      </Tap>
    </View>
  );
}

export const TrackRow = memo(TrackRowBase);

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingVertical: 7 },
  more: { paddingHorizontal: 16, paddingVertical: 14 },
  number: { width: 22, textAlign: 'center', fontSize: 15 },
});
