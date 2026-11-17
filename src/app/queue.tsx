import { SectionList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cover } from '@/components/Cover';
import { Tap } from '@/components/Pressable';
import { T } from '@/components/T';
import { player, usePlayer, type QueueItem } from '@/player/engine';
import { colors } from '@/theme';

interface Row {
  item: QueueItem;
  index: number;
}

export default function QueueScreen() {
  const insets = useSafeAreaInsets();
  const { queue, index, context } = usePlayer();
  const current = queue[index];
  const upcoming = queue.map((item, i) => ({ item, index: i })).slice(index + 1);
  const manual = upcoming.filter((r) => r.item.manual);
  const rest = upcoming.filter((r) => !r.item.manual).slice(0, 200);

  const sections = [
    ...(current ? [{ key: 'now', title: 'Reproduciendo ahora', data: [{ item: current, index }] }] : []),
    ...(manual.length ? [{ key: 'manual', title: 'Siguiente en la cola', data: manual }] : []),
    ...(rest.length ? [{ key: 'rest', title: `Siguiente de: ${context?.name ?? 'tu cola'}`, data: rest }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top || 12 }}>
      <View style={styles.header}>
        <Tap hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </Tap>
        <T variant="h3" style={{ flex: 1, textAlign: 'center' }}>Cola</T>
        <View style={{ width: 28 }} />
      </View>
      <SectionList<Row, { key: string; title: string; data: Row[] }>
        sections={sections}
        keyExtractor={(r) => r.item.uid}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <T variant="h3" style={{ flex: 1 }} numberOfLines={1}>{section.title}</T>
            {section.key !== 'now' && (
              <Tap onPress={() => player.clearUpcoming()}>
                <T variant="bodyBold" color={colors.subtext} style={{ fontSize: 13 }}>Borrar cola</T>
              </Tap>
            )}
          </View>
        )}
        renderItem={({ item: r, section }) => {
          const isNow = section.key === 'now';
          return (
            <View style={styles.row}>
              <Tap style={styles.main} scale={0.99} onPress={() => !isNow && player.skipTo(r.index)}>
                <Cover coverArt={r.item.song.coverArt} size={48} />
                <View style={{ flex: 1 }}>
                  <T variant="body" numberOfLines={1} color={isNow ? colors.accent : colors.text} style={{ fontSize: 16 }}>{r.item.song.title}</T>
                  <T variant="caption" numberOfLines={1}>{r.item.song.artist}</T>
                </View>
              </Tap>
              {!isNow && (
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  {r.index > index + 1 && (
                    <Tap hitSlop={8} onPress={() => player.move(r.index, index + 1)}>
                      <Ionicons name="arrow-up" size={20} color={colors.subtext} />
                    </Tap>
                  )}
                  <Tap hitSlop={8} onPress={() => player.removeAt(r.index)}>
                    <Ionicons name="remove-circle-outline" size={22} color={colors.subtext} />
                  </Tap>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
