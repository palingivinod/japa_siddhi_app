import AsyncStorage from '@react-native-async-storage/async-storage';

import apiService from './apiService';

const STORAGE_KEY = 'saved_delivery_addresses';

const unique = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter(item => {
    const value = String(item || '').trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const readLocal = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return unique(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return [];
  }
};

const writeLocal = async (items: string[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unique(items)));
};

export const loadSavedAddresses = async () => {
  const local = await readLocal();
  try {
    const response = await apiService.get('/profile/addresses');
    const remote = (response.data.data || [])
      .map((item: any) => String(item.address || item || ''))
      .filter(Boolean);
    const merged = unique([...remote, ...local]);
    await writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
};

export const saveDeliveryAddress = async (address: string) => {
  const next = String(address || '').trim();
  if (!next) {
    return loadSavedAddresses();
  }
  const local = unique([next, ...(await readLocal())]);
  await writeLocal(local);
  try {
    const response = await apiService.post('/profile/addresses', {address: next});
    const remote = (response.data.data || [])
      .map((item: any) => String(item.address || item || ''))
      .filter(Boolean);
    const merged = unique([...remote, ...local]);
    await writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
};
