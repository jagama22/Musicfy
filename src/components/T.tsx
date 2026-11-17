import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '@/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyBold' | 'caption' | 'small' | 'tiny';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.black, fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  h1: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bold, fontSize: 16 },
  body: { fontFamily: fonts.regular, fontSize: 15 },
  bodyBold: { fontFamily: fonts.semibold, fontSize: 15 },
  caption: { fontFamily: fonts.regular, fontSize: 13, color: colors.subtext },
  small: { fontFamily: fonts.medium, fontSize: 12, color: colors.subtext },
  tiny: { fontFamily: fonts.semibold, fontSize: 10, color: colors.subtext },
};

export function T({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...rest} style={[{ color: colors.text }, variants[variant], color ? { color } : null, style]} />;
}
