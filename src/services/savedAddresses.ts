import AsyncStorage from '@react-native-async-storage/async-storage';

import apiService from './apiService';
import {userScopedKey} from './session';

const STORAGE_BASE = 'saved_delivery_addresses';
/** Addresses used to live under one shared key, so that copy is dropped. */
const SHARED_KEY = 'saved_delivery_addresses';

let sharedKeyDropped = false;

const storageKey = () => userScopedKey(STORAGE_BASE);

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
