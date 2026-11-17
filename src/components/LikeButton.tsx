import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useStarredIds, useToggleStar } from '@/api/queries';
import type { Song } from '@/api/types';
import { colors } from '@/theme';
import { Tap } from './Pressable';
import { toast } from './Toast';

interface Props {
  kind: 'song' | 'album' | 'artist';
  id: string;
  song?: Song;
  size?: number;
  color?: string;
}

export function LikeButton({ kind, id, song, size = 24, color = colors.subtext }: Props) {
  const starred = useStarredIds().has(id);
  const toggle = useToggleStar();
  return (
    <Tap
      hitSlop={10}
      scale={0.85}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggle.mutate({ kind, id, starred, song });
        if (kind === 'song') toast(starred ? 'Eliminada de Canciones que te gustan' : 'Añadida a Canciones que te gustan');
        else toast(starred ? 'Eliminado de Tu biblioteca' : 'Añadido a Tu biblioteca');
      }}
    >
      <Ionicons
        name={starred ? (kind === 'song' ? 'heart' : 'checkmark-circle') : kind === 'song' ? 'heart-outline' : 'add-circle-outline'}
        size={size}
        color={starred ? colors.accent : color}
      />
    </Tap>
  );
}
