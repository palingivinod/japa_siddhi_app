import {
  AppState,
  InteractionManager,
  PermissionsAndroid,
  Permission,
  Platform,
} from 'react-native';

/**
 * Serialize Android runtime permission prompts.
 *
 * Play Console crash (v41):
 *   PermissionsModule.requestPermission → SparseArray.put
 *   → ArrayIndexOutOfBoundsException
 *
 * That native crash happens when two permission dialogs overlap (e.g. push
 * register on login + again on AppState 'active'), or when the activity is
 * not ready. JS try/catch cannot stop it — we must avoid the bad call.
 */

let queue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

const waitForUiIdle = () =>
  new Promise<void>(resolve => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

export const checkAndroidPermission = async (
  permission: Permission,
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    return await PermissionsAndroid.check(permission);
  } catch {
    return false;
  }
};

export const requestAndroidPermissionSafe = async (
  permission: Permission,
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const run = async (): Promise<boolean> => {
    try {
      if (await checkAndroidPermission(permission)) {
        return true;
      }
      if (AppState.currentState !== 'active') {
        return false;
      }
      await waitForUiIdle();
      await sleep(120);
      if (AppState.currentState !== 'active') {
        return false;
      }
      const result = await PermissionsAndroid.request(permission);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const next = queue.then(run, run);
  // Keep the chain alive even if a request rejects.
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};
