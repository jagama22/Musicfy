import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, SplashScreen, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { queryClient } from '@/api/queries';
import { SongMenuHost } from '@/components/SongMenu';
import { ToastHost } from '@/components/Toast';
import { player } from '@/player/engine';
import { useSession } from '@/store/session';
import { colors } from '@/theme';
import { installGlobalErrorHandler, loadLastError, recordError } from '@/utils/errors';

SplashScreen.preventAutoHideAsync().catch(() => {});
installGlobalErrorHandler();
loadLastError();

/** Si una pantalla falla al pintarse, mostramos el error en vez de cerrar la app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    recordError(error);
  }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>Algo ha fallado</Text>
      <Text style={{ color: colors.subtext, fontSize: 14, textAlign: 'center' }} selectable>
        {error.message}
      </Text>
      <Pressable onPress={retry} style={{ marginTop: 8, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 }}>
        <Text style={{ color: '#000', fontWeight: '700' }}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const hydrated = useSession((s) => s.hydrated);
  const loggedIn = useSession((s) => !!s.session);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (ready && loggedIn) player.restore();
  }, [ready, loggedIn]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={loggedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="player"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }}
            />
            <Stack.Screen name="queue" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>
          <Stack.Protected guard={!loggedIn}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
        <SongMenuHost />
        <ToastHost />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
