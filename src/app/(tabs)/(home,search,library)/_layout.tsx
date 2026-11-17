import { Stack } from 'expo-router';
import { colors } from '@/theme';

// Cada pestaña tiene su propia pila de navegación, con las mismas pantallas de detalle
// (álbum, artista, playlist…) compartidas entre las tres.
export const unstable_settings = {
  home: { anchor: 'index' },
  search: { anchor: 'search' },
  library: { anchor: 'library' },
};

export default function TabStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
