export const colors = {
  bg: '#121212',
  base: '#000000',
  card: '#181818',
  elevated: '#1f1f1f',
  highlight: '#2a2a2a',
  pressed: '#333333',
  text: '#ffffff',
  subtext: '#b3b3b3',
  muted: '#7a7a7a',
  accent: '#1ed760',
  accentDark: '#1db954',
  danger: '#f15e6c',
  overlay: 'rgba(0,0,0,0.6)',
};

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  black: 'Figtree_800ExtraBold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Altura reservada abajo para tab bar + mini-player. */
export const TAB_BAR_HEIGHT = 56;
export const MINI_PLAYER_HEIGHT = 56;

// Paleta apagada para cabeceras/fondos dinámicos, al estilo de los degradados de Spotify.
const palette = [
  '#5038a0', '#8c1932', '#1e3264', '#477d95', '#e8115b', '#148a08', '#bc5900', '#503750',
  '#af2896', '#7358ff', '#e13300', '#1e3264', '#27856a', '#8d67ab', '#ba5d07', '#b02897',
  '#0d73ec', '#283ea3', '#a56752', '#777777', '#509bf5', '#dc148c', '#608108', '#e91429',
];

export function colorFor(key: string | undefined | null): string {
  if (!key) return palette[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

/** Oscurece un color hex (factor 0..1). */
export function darken(hex: string, factor = 0.5): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - factor));
  const g = Math.round(((n >> 8) & 255) * (1 - factor));
  const b = Math.round((n & 255) * (1 - factor));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
