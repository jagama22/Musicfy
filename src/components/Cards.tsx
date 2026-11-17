import { FlatList, StyleSheet, View } from 'react-native';
import { Cover } from './Cover';
import { Tap } from './Pressable';
import { T } from './T';

export interface CardItem {
  key: string;
  title: string;
  subtitle?: string;
  coverArt?: string;
  uri?: string;
  round?: boolean;
  onPress: () => void;
}

export function MediaCard({ item, size = 150 }: { item: CardItem; size?: number }) {
  return (
    <Tap style={{ width: size }} onPress={item.onPress}>
      <Cover coverArt={item.coverArt} uri={item.uri} size={size} round={item.round} icon={item.round ? 'person' : 'disc'} />
      <T
        variant={item.round ? 'bodyBold' : 'bodyBold'}
        numberOfLines={item.subtitle ? 1 : 2}
        style={{ marginTop: 8, fontSize: 14, textAlign: item.round ? 'center' : 'left' }}
      >
        {item.title}
      </T>
      {item.subtitle ? (
        <T variant="caption" numberOfLines={2} style={{ marginTop: 2, textAlign: item.round ? 'center' : 'left' }}>
          {item.subtitle}
        </T>
      ) : null}
    </Tap>
  );
}

/** Carrusel horizontal con título, como las «estanterías» de la pantalla de inicio. */
export function Shelf({ title, items, size = 150 }: { title: string; items: CardItem[]; size?: number }) {
  if (!items.length) return null;
  return (
    <View style={{ marginTop: 28 }}>
      <T variant="h2" style={styles.shelfTitle}>{title}</T>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(i) => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
        renderItem={({ item }) => <MediaCard item={item} size={size} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shelfTitle: { paddingHorizontal: 16, marginBottom: 12 },
});
