import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_SESSION_KEY = 'admin_session_v1';

export type AdminSession = {
  email: string;
  signedInAt: string;
};

export const saveAdminSession = async (email: string) => {
  const session: AdminSession = {
    email: email.trim().toLowerCase(),
    signedInAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getAdminSession = async (): Promise<AdminSession | null> => {
  const raw = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
};

export const clearAdminSession = async () => {
  await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
};
