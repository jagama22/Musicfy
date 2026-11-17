import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { player, usePlayer, type PlayContext } from '@/player/engine';
import { useIsContextActive, usePlaybackStatus } from '@/player/hooks';
import { colors } from '@/theme';
import { Tap } from './Pressable';

/** Botón verde redondo. Si el contexto ya está sonando, alterna pausa/play. */
export function PlayButton({
  context,
  onPlay,
  size = 52,
}: {
  context: Pick<PlayContext, 'kind' | 'id'>;
  onPlay: () => void;
  size?: number;
}) {
  const active = useIsContextActive(context.kind, context.id);
  const status = usePlaybackStatus();
  const playing = active && status.playing;
  return (
    <Tap
      scale={0.94}
      onPress={() => (active ? player.togglePlay() : onPlay())}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ marginLeft: playing ? 0 : 3 }}>
        <Ionicons name={playing ? 'pause' : 'play'} size={size * 0.48} color="#000" />
      </View>
    </Tap>
  );
}

export function ShuffleToggle({ size = 26 }: { size?: number }) {
  const shuffle = usePlayer((s) => s.shuffle);
  return (
    <Tap hitSlop={10} onPress={() => player.toggleShuffle()}>
      <Ionicons name="shuffle" size={size} color={shuffle ? colors.accent : colors.subtext} />
    </Tap>
  );
}
