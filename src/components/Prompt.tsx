import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { Tap } from './Pressable';
import { T } from './T';

/** Diálogo a pantalla completa para pedir un texto (nombre de playlist…), como en Spotify. */
export function PromptModal({
  visible,
  title,
  initial = '',
  placeholder,
  confirmLabel = 'Crear',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Modal visible={visible} animationType="fade" transparent onShow={() => setValue(initial)} onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={{ width: '100%', paddingHorizontal: 32, gap: 28, alignItems: 'center' }}>
          <T variant="h2" style={{ textAlign: 'center' }}>{title}</T>
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            selectionColor={colors.accent}
            style={styles.input}
            onSubmitEditing={() => onConfirm(value.trim() || placeholder || '')}
          />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Tap style={[styles.pill, { borderWidth: 1, borderColor: colors.muted }]} onPress={onCancel}>
              <T variant="bodyBold">Cancelar</T>
            </Tap>
            <Tap style={[styles.pill, { backgroundColor: colors.accent }]} onPress={() => onConfirm(value.trim() || placeholder || '')}>
              <T variant="bodyBold" color="#000">{confirmLabel}</T>
            </Tap>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18,18,18,0.97)', alignItems: 'center', justifyContent: 'center' },
  input: {
    width: '100%',
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 28,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
    paddingVertical: 8,
  },
  pill: { borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 },
});
