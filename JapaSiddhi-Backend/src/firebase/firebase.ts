import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let initialized = false;
let initError: string | null = null;

const normalizePrivateKey = (value: unknown) => {
  let key = String(value || '');
  // Render / .env often store the key with literal \n sequences.
  key = key.replace(/\\n/g, '\n').trim();
  // Strip accidental wrapping quotes from dashboard pastes.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).replace(/\\n/g, '\n').trim();
  }
  return key;
};

const fromSplitEnv = () => {
  const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || '');
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  return {
    type: 'service_account',
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
};

const fromJsonEnv = () => {
  let raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const b64 = String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim();

  if (!raw && b64) {
    try {
      raw = Buffer.from(b64, 'base64').toString('utf8').trim();
    } catch {
      initError = 'FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64.';
      return null;
    }
  }

  if (!raw) {
    return null;
  }

  // Dashboard pastes sometimes omit the outer braces.
  if (!raw.startsWith('{')) {
    raw = `{${raw}}`;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.private_key) {
      parsed.private_key = normalizePrivateKey(parsed.private_key);
    }
    if (!parsed?.client_email || !parsed?.private_key) {
      initError =
        'FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.';
      return null;
    }
    return parsed;
  } catch (error: any) {
    initError = `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (${
      error?.message || 'parse error'
    }). Paste the full JSON in one line, or use FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.`;
    console.warn(initError);
    return null;
  }
};

const fromFile = () => {
  const serviceAccountPath = path.join(
    process.cwd(),
    'firebase-service-account.json',
  );
  if (!fs.existsSync(serviceAccountPath)) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const parsed = require(serviceAccountPath);
  if (parsed?.private_key) {
    parsed.private_key = normalizePrivateKey(parsed.private_key);
  }
  return parsed;
};

const parseServiceAccount = () => {
  return fromJsonEnv() || fromSplitEnv() || fromFile();
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
    if (!initError) {
      initError =
        'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on Render.';
      console.warn(initError);
    }
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    initialized = true;
    initError = null;
    console.log(
      `Firebase Admin Initialized (project: ${
        (serviceAccount as any).project_id || 'unknown'
      })`,
    );
  } catch (error: any) {
    initError = error?.message || 'Firebase Admin credential rejected.';
    console.warn('Firebase Admin init failed:', initError);
  }
};

/** True when Admin SDK is ready to send FCM pushes. */
export const isFirebaseReady = () => {
  initializeFirebase();
  return Boolean(admin.apps.length);
};

export const getFirebaseInitError = () => {
  initializeFirebase();
  return admin.apps.length ? null : initError;
};

export {admin, initializeFirebase};
