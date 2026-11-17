import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/store/session';
import { colorFor } from '@/theme';
import { useNav } from '@/utils/nav';
import { Tap } from './Pressable';
import { T } from './T';

export function Avatar({ size = 32 }: { size?: number }) {
  const user = useSession((s) => s.session?.username ?? '?');
  const nav = useNav();
  return (
    <Tap onPress={nav.settings} hitSlop={8}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(user), alignItems: 'center', justifyContent: 'center' }}>
        <T variant="bodyBold" color="#000" style={{ fontSize: size * 0.45 }}>{user[0]?.toUpperCase()}</T>
      </View>
    </Tap>
  );
}

/** Cabecera de las pestañas principales: avatar + título + iconos a la derecha. */
export function TabHeader({ title, right }: { title?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar />
      {title ? <T variant="h1" style={{ flex: 1 }}>{title}</T> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? '#1ed760' : '#2a2a2a',
      }}
    >
      <T variant="small" color={active ? '#000' : '#fff'} style={{ fontSize: 13 }}>{label}</T>
    </Tap>
  );
}
