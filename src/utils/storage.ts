import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Almacenamiento cifrado (Keychain) en iOS; localStorage en web. */
export const secureStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(name) ?? null;
    return SecureStore.getItemAsync(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === 'web') return globalThis.localStorage?.setItem(name, value);
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(name);
    await SecureStore.deleteItemAsync(name);
  },
};

export const plainStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};
