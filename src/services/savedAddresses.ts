import AsyncStorage from '@react-native-async-storage/async-storage';

import apiService from './apiService';
import {userScopedKey} from './session';

const STORAGE_BASE = 'saved_delivery_addresses';
const LATEST_KEY = 'latest_selected_delivery_address';
/** Addresses used to live under one shared key, so that copy is dropped. */
const SHARED_KEY = 'saved_delivery_addresses';

let sharedKeyDropped = false;

const storageKey = () => userScopedKey(STORAGE_BASE);
const latestKey = () => userScopedKey(LATEST_KEY);

const dropSharedAddresses = async () => {
  if (sharedKeyDropped) {
    return;
  }
  sharedKeyDropped = true;
  try {
    await AsyncStorage.removeItem(SHARED_KEY);
  } catch {
    sharedKeyDropped = false;
  }
};

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
  await dropSharedAddresses();
  try {
    const raw = await AsyncStorage.getItem(await storageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return unique(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return [];
  }
};

const writeLocal = async (items: string[]) => {
  await AsyncStorage.setItem(await storageKey(), JSON.stringify(unique(items)));
};

export const getLatestSelectedAddress = async (): Promise<string> => {
  try {
    const latest = await AsyncStorage.getItem(await latestKey());
    if (latest && latest.trim()) {
      return latest.trim();
    }
  } catch {
    // ignore
  }
  const all = await loadSavedAddresses();
  return all[0] || '';
};

export const setLatestSelectedAddress = async (address: string): Promise<void> => {
  const clean = String(address || '').trim();
  if (!clean) return;
  try {
    await AsyncStorage.setItem(await latestKey(), clean);
  } catch {
    // ignore
  }
};

export const loadSavedAddresses = async (): Promise<string[]> => {
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

export const saveDeliveryAddress = async (address: string): Promise<string[]> => {
  const next = String(address || '').trim();
  if (!next) {
    return loadSavedAddresses();
  }
  await setLatestSelectedAddress(next);
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

export const updateDeliveryAddress = async (
  oldAddress: string,
  newAddress: string,
): Promise<string[]> => {
  const prev = String(oldAddress || '').trim();
  const next = String(newAddress || '').trim();
  if (!next) {
    return loadSavedAddresses();
  }
  if (!prev || prev.toLowerCase() === next.toLowerCase()) {
    return saveDeliveryAddress(next);
  }

  const local = unique([
    next,
    ...(await readLocal()).filter(item => item.toLowerCase() !== prev.toLowerCase()),
  ]);
  await writeLocal(local);

  try {
    const latest = await AsyncStorage.getItem(await latestKey());
    if (latest && latest.trim().toLowerCase() === prev.toLowerCase()) {
      await setLatestSelectedAddress(next);
    }
  } catch {
    await setLatestSelectedAddress(next);
  }

  try {
    const response = await apiService.put('/profile/addresses', {
      oldAddress: prev,
      address: next,
    });
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
