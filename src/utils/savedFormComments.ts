import AsyncStorage from '@react-native-async-storage/async-storage';

/** Last comments entered on seva forms — auto-fill next visit, still editable. */
export type SavedCommentKey =
  | 'japa_annadanam'
  | 'general_annadanam'
  | 'nithya_homam';

const storageKey = (key: SavedCommentKey) => `saved_form_comments:${key}`;

export const getSavedFormComments = async (
  key: SavedCommentKey,
): Promise<string> => {
  try {
    const value = await AsyncStorage.getItem(storageKey(key));
    return String(value || '').trim();
  } catch {
    return '';
  }
};

export const saveFormComments = async (
  key: SavedCommentKey,
  comments: string,
): Promise<void> => {
  const trimmed = String(comments || '').trim();
  if (!trimmed) {
    return;
  }
  try {
    await AsyncStorage.setItem(storageKey(key), trimmed.slice(0, 1000));
  } catch {
    // Ignore storage failures — form still works without remember.
  }
};
