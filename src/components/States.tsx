import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from '@/theme';
import { usePlayer } from '@/player/engine';
import { Tap } from './Pressable';
import { T } from './T';

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.subtext} />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: colors.bg }}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.subtext} />
      <T variant="h3" style={{ textAlign: 'center' }}>Algo ha fallado</T>
      <T variant="caption" style={{ textAlign: 'center' }}>{(error as Error)?.message ?? 'Inténtalo de nuevo'}</T>
      {onRetry && (
        <Tap onPress={onRetry} style={{ marginTop: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.muted, paddingHorizontal: 20, paddingVertical: 8 }}>
          <T variant="bodyBold">Reintentar</T>
        </Tap>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text?: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
      <Ionicons name={icon} size={44} color={colors.subtext} />
      <T variant="h3" style={{ textAlign: 'center' }}>{title}</T>
      {text ? <T variant="caption" style={{ textAlign: 'center' }}>{text}</T> : null}
    </View>
  );
}

/** Espacio inferior para que el contenido no quede tapado por la tab bar y el mini-player. */
export function useBottomSpace() {
  const insets = useSafeAreaInsets();
  const hasQueue = usePlayer((s) => s.queue.length > 0);
  return insets.bottom + TAB_BAR_HEIGHT + (hasQueue ? MINI_PLAYER_HEIGHT + 8 : 0) + 24;
}
