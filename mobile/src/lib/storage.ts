import AsyncStorage from '@react-native-async-storage/async-storage';

export async function safeGetItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    if (data === null) return fallback;
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

export async function safeSetItem(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[Storage] Failed to write "${key}":`, e);
  }
}
