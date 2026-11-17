import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, makeSession } from '@/api/subsonic';
import { queryClient } from '@/api/queries';
import { Tap } from '@/components/Pressable';
import { T } from '@/components/T';
import { useSession } from '@/store/session';
import { colors, fonts } from '@/theme';

export default function Login() {
  const insets = useSafeAreaInsets();
  const setSession = useSession((s) => s.setSession);
  const [server, setServer] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!server || !user || !pass) {
      setError('Rellena todos los campos');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = makeSession(server, user, pass);
      await api.ping(session);
      queryClient.clear();
      setSession(session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#1f4d33', colors.bg]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Ionicons name="musical-notes" size={44} color="#000" />
        </View>
        <T variant="display" style={{ textAlign: 'center', marginTop: 24 }}>Tu música.{'\n'}Tu servidor.</T>
        <T variant="caption" style={{ textAlign: 'center', marginTop: 10, marginBottom: 36 }}>
          Conéctate a tu Navidrome para empezar a escuchar.
        </T>

        <Field label="Servidor" value={server} onChange={setServer} placeholder="http://34.0.0.1:4533" keyboard="url" />
        <Field label="Usuario" value={user} onChange={setUser} placeholder="usuario" />
        <Field label="Contraseña" value={pass} onChange={setPass} placeholder="••••••••" secure onSubmit={submit} />

        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color="#fff" />
            <T variant="bodyBold" style={{ flex: 1, fontSize: 14 }}>{error}</T>
          </View>
        ) : null}

        <Tap style={styles.button} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#000" /> : <T variant="h3" color="#000">Iniciar sesión</T>}
        </Tap>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(p: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboard?: 'url' | 'default';
  onSubmit?: () => void;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <T variant="bodyBold" style={{ marginBottom: 8, fontSize: 14 }}>{p.label}</T>
      <TextInput
        value={p.value}
        onChangeText={p.onChange}
        placeholder={p.placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={p.secure}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={p.keyboard === 'url' ? 'url' : 'default'}
        selectionColor={colors.accent}
        onSubmitEditing={p.onSubmit}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 28, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: { alignSelf: 'center', width: 84, height: 84, borderRadius: 42, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  input: {
    backgroundColor: '#2a2a2a',
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 16,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e91429', borderRadius: 6, padding: 12, marginBottom: 12 },
  button: { backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
});
