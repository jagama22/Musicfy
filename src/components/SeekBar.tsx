import { useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { formatTime } from '@/player/hooks';
import { colors } from '@/theme';
import { T } from './T';

/** Barra de progreso arrastrable del reproductor. */
export function SeekBar({ position, duration, onSeek }: { position: number; duration: number; onSeek: (s: number) => void }) {
  const [width, setWidth] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const startX = useRef(0);
  const ref = useRef({ width: 1, duration: 0, onSeek });
  ref.current = { width, duration, onSeek };

  const ratioAt = (x: number) => Math.max(0, Math.min(1, x / ref.current.width));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        setDrag(ratioAt(startX.current));
      },
      onPanResponderMove: (_e, g) => setDrag(ratioAt(startX.current + g.dx)),
      onPanResponderRelease: (_e, g) => {
        const r = ratioAt(startX.current + g.dx);
        ref.current.onSeek(r * ref.current.duration);
        setTimeout(() => setDrag(null), 400);
      },
    }),
  ).current;

  const ratio = drag ?? (duration > 0 ? Math.min(1, position / duration) : 0);
  const shownPos = drag !== null ? drag * duration : position;

  return (
    <View>
      <View
        {...pan.panHandlers}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 24, justifyContent: 'center' }}
      >
        <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}>
          <View style={{ width: `${ratio * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.text }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: ratio * width - (drag !== null ? 8 : 6),
            width: drag !== null ? 16 : 12,
            height: drag !== null ? 16 : 12,
            borderRadius: 8,
            backgroundColor: colors.text,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T variant="small" color="rgba(255,255,255,0.7)">{formatTime(shownPos)}</T>
        <T variant="small" color="rgba(255,255,255,0.7)">-{formatTime(Math.max(0, duration - shownPos))}</T>
      </View>
    </View>
  );
}
