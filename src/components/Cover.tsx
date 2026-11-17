import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { coverUrl } from '@/api/subsonic';
import { colors } from '@/theme';

interface Props {
  coverArt?: string;
  /** URL externa (p. ej. imagen de artista de Last.fm). Tiene prioridad sobre coverArt. */
  uri?: string;
  size: number;
  round?: boolean;
  radius?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function Cover({ coverArt, uri, size, round, radius = 4, icon = 'musical-notes', style }: Props) {
  const reqSize = size <= 64 ? 150 : size <= 180 ? 300 : 600;
  const src = uri || coverUrl(coverArt, reqSize);
  const borderRadius = round ? size / 2 : radius;
  return (
    <View
      style={[
        { width: size, height: size, borderRadius, backgroundColor: colors.highlight, overflow: 'hidden' },
        { alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.38} color={colors.muted} style={{ position: 'absolute' }} />
      {src ? (
        <Image
          source={{ uri: src, cacheKey: uri ? undefined : `cover-${coverArt}-${reqSize}` }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
          recyclingKey={coverArt ?? uri}
        />
      ) : null}
    </View>
  );
}
