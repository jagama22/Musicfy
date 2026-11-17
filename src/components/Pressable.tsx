import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

/** Pressable con la respuesta táctil sutil de Spotify (se encoge y atenúa un poco). */
export function Tap({
  style,
  scale = 0.97,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number }) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style, pressed && { opacity: 0.7, transform: [{ scale }] }]}
    />
  );
}
