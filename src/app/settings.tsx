import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { queryClient } from '@/api/queries';
import { Tap } from '@/components/Pressable';
import { T } from '@/components/T';
import { Avatar } from '@/components/TabHeader';
import { toast } from '@/components/Toast';
import { player } from '@/player/engine';
import { useSession } from '@/store/session';
import { useSettings, type Bitrate } from '@/store/settings';
import { colors } from '@/theme';

const QUALITIES: { value: Bitrate; label: string; hint: string }[] = [
  { value: 96, label: 'Baja', hint: '96 kbit/s' },
  { value: 128, label: 'Normal', hint: '128 kbit/s' },
  { value: 192, label: 'Alta', hint: '192 kbit/s' },
  { value: 320, label: 'Muy alta', hint: '320 kbit/s' },
  { value: 0, label: 'Original', hint: 'Sin transcodificar (máxima calidad)' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession((s) => s.session);
  const logout = useSession((s) => s.logout);
  const { maxBitrate, setMaxBitrate } = useSettings();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Tap hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Tap>
        <T variant="h3" style={{ flex: 1, textAlign: 'center', marginRight: 26 }}>Configuración</T>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.profile}>
          <Avatar size={56} />
          <View style={{ flex: 1 }}>
            <T variant="h2">{session?.username}</T>
            <T variant="caption" numberOfLines={1}>{session?.serverUrl}</T>
          </View>
        </View>

        <Section title="Calidad del audio">
          <T variant="caption" style={{ paddingHorizontal: 16, marginBottom: 6 }}>
            Calidad de streaming. Las opciones inferiores a «Original» piden a Navidrome que convierta a MP3 y gastan menos datos.
          </T>
          {QUALITIES.map((q) => (
            <Tap key={q.value} style={styles.option} onPress={() => setMaxBitrate(q.value)}>
              <View style={{ flex: 1 }}>
                <T variant="body" style={{ fontSize: 16 }}>{q.label}</T>
                <T variant="small">{q.hint}</T>
              </View>
              {maxBitrate === q.value && <Ionicons name="checkmark" size={22} color={colors.accent} />}
            </Tap>
          ))}
          <T variant="small" style={{ paddingHorizontal: 16, marginTop: 4 }}>Se aplica a partir de la siguiente canción que pongas.</T>
        </Section>

        <Section title="Almacenamiento">
          <Tap
            style={styles.option}
            onPress={async () => {
              await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
              queryClient.clear();
              toast('Caché borrada');
            }}
          >
            <T variant="body" style={{ fontSize: 16, flex: 1 }}>Borrar caché</T>
            <Ionicons name="trash-outline" size={20} color={colors.subtext} />
          </Tap>
        </Section>

        <Section title="Acerca de">
          <View style={styles.option}>
            <T variant="body" style={{ fontSize: 16, flex: 1 }}>Versión</T>
            <T variant="caption">{Constants.expoConfig?.version ?? '1.0.0'}</T>
          </View>
        </Section>

        <Tap
          style={styles.logout}
          onPress={() => {
            player.reset();
            queryClient.clear();
            logout();
          }}
        >
          <T variant="h3" color="#000">Cerrar sesión</T>
        </Tap>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 24 }}>
      <T variant="h2" style={{ paddingHorizontal: 16, marginBottom: 10 }}>{title}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 52 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  logout: { alignSelf: 'center', marginTop: 40, backgroundColor: colors.text, borderRadius: 999, paddingHorizontal: 32, paddingVertical: 13 },
});
