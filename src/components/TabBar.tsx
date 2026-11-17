import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { colors, TAB_BAR_HEIGHT } from '@/theme';
import { useLastTab, type TabGroup } from '@/utils/nav';
import { MiniPlayer } from './MiniPlayer';
import { Tap } from './Pressable';
import { T } from './T';

const TABS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = {
  '(home)': { label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  '(search)': { label: 'Buscar', icon: 'search-outline', iconActive: 'search' },
  '(library)': { label: 'Tu biblioteca', icon: 'library-outline', iconActive: 'library' },
};

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)', '#000']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <MiniPlayer />
      <View style={[styles.tabs, { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom }]}>
        {state.routes.map((route, i) => {
          const cfg = TABS[route.name];
          if (!cfg) return null;
          const focused = state.index === i;
          return (
            <Tap
              key={route.key}
              style={styles.tab}
              scale={0.9}
              onPress={() => {
                useLastTab.setState({ tab: route.name as TabGroup });
                // Con la pestaña ya activa, el stack interno vuelve a su raíz al recibir tabPress (como Spotify).
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
            >
              <Ionicons name={focused ? cfg.iconActive : cfg.icon} size={25} color={focused ? colors.text : colors.subtext} />
              <T variant="tiny" color={focused ? colors.text : colors.subtext} style={{ marginTop: 3 }}>
                {cfg.label}
              </T>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 24 },
  tabs: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center' },
});
