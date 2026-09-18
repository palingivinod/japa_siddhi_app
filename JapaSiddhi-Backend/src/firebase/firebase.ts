import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let initialized = false;

const parseServiceAccount = () => {
  const fromEnv = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv);
    } catch (error) {
      console.warn(
        'FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. Firebase Admin skipped.',
        error,
      );
      return null;
    }
  }

  const serviceAccountPath = path.join(
    process.cwd(),
    'firebase-service-account.json',
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.warn(
      'Firebase service account file not found. Firebase initialization skipped.',
    );
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(serviceAccountPath);
};

const initializeFirebase = () => {
  if (initialized) {
    return;
  }

  if (admin.apps.length) {
    initialized = true;
    return;
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  console.log('Firebase Admin Initialized');
};

/** True when Admin SDK is ready to send FCM pushes. */
export const isFirebaseReady = () => {
  initializeFirebase();
  return Boolean(admin.apps.length);
};

export {admin, initializeFirebase};
