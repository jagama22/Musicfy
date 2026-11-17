import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { create } from 'zustand';
import { T } from './T';
import { MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const useToastStore = create<{ msg: string | null; n: number }>(() => ({ msg: null, n: 0 }));

export const toast = (msg: string) => useToastStore.setState((s) => ({ msg, n: s.n + 1 }));

export function ToastHost() {
  const { msg, n } = useToastStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!msg) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(({ finished }) => finished && useToastStore.setState({ msg: null }));
  }, [n, msg, opacity]);

  if (!msg) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { opacity, bottom: insets.bottom + TAB_BAR_HEIGHT + MINI_PLAYER_HEIGHT + 16 }]}
    >
      <T variant="bodyBold" color="#000" style={{ fontSize: 14, textAlign: 'center' }}>
        {msg}
      </T>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
});
