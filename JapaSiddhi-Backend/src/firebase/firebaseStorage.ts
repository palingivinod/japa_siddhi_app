import fs from 'fs';
import path from 'path';
import {randomUUID} from 'crypto';

import {admin, isFirebaseReady} from './firebase';

const DEFAULT_BUCKET = 'japa-siddhi-a1626.firebasestorage.app';

const resolveBucketName = () =>
  String(process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim() ||
  DEFAULT_BUCKET;

export const isFirebaseStorageReady = () => isFirebaseReady();

type UploadFolder = 'notifications' | 'feedback' | 'support' | 'rewards';

/**
 * Upload a local file to Firebase Storage and return a durable public
 * download URL (survives Render redeploys).
 */
export const uploadFileToFirebase = async (opts: {
  localPath: string;
  filename: string;
  folder: UploadFolder;
  contentType?: string;
}): Promise<string> => {
  if (!isFirebaseReady()) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_* keys) on Render.',
    );
  }

  const localPath = String(opts.localPath || '').trim();
  if (!localPath || !fs.existsSync(localPath)) {
    throw new Error('Upload file is missing on disk.');
  }

  const folder = String(opts.folder || 'notifications').trim() || 'notifications';
  const filename =
    String(opts.filename || path.basename(localPath)).trim() ||
    `file-${Date.now()}`;
  const destination = `${folder}/${filename}`;
  const token = randomUUID();
  const contentType =
    String(opts.contentType || '').trim() || 'application/octet-stream';

  const bucket = admin.storage().bucket(resolveBucketName());
  await bucket.upload(localPath, {
    destination,
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
      cacheControl: 'public,max-age=31536000',
    },
    resumable: false,
  });

  const encoded = encodeURIComponent(destination);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
};

/** @deprecated Prefer uploadFileToFirebase({ folder: 'notifications', ... }) */
export const uploadNotifyFileToFirebase = async (opts: {
  localPath: string;
  filename: string;
  contentType?: string;
}): Promise<string> =>
  uploadFileToFirebase({
    ...opts,
    folder: 'notifications',
  });

/** Best-effort delete of the ephemeral local copy after a successful cloud upload. */
export const deleteLocalUploadQuietly = (localPath: string) => {
  try {
    if (localPath && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } catch {
    // ignore
  }
};
