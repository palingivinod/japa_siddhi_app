import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import {NextFunction, Request, Response} from 'express';

import environment from '../config/environment';
import apiResponse from '../utils/apiResponse';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'video/3gpp',
  'video/3gpp2',
]);

const LOCAL_UPLOADS = path.join(process.cwd(), 'uploads');

const canUseDir = (dir: string): boolean => {
  try {
    fs.mkdirSync(dir, {recursive: true});
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Prefer UPLOAD_PATH (e.g. /var/data/uploads on Render Disk).
 * If that path is not writable yet (disk missing / wrong mount), fall back
 * so the server still boots instead of crashing with EACCES.
 */
const resolveUploadsRoot = (): string => {
  const configured = String(environment.UPLOAD_PATH || 'uploads').trim();
  const preferred = path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);

  if (canUseDir(preferred)) {
    if (preferred !== LOCAL_UPLOADS) {
      console.log(`Uploads directory: ${preferred}`);
    }
    return preferred;
  }

  console.warn(
    `UPLOAD_PATH "${preferred}" is not writable (EACCES). ` +
      'On Render, attach a Disk with Mount Path /var/data, then set ' +
      'UPLOAD_PATH=/var/data/uploads. Falling back to local ./uploads for now.',
  );
  canUseDir(LOCAL_UPLOADS);
  return LOCAL_UPLOADS;
};

export const uploadsRoot = resolveUploadsRoot();

const profileDir = path.join(uploadsRoot, 'profiles');
const feedbackDir = path.join(uploadsRoot, 'feedback');
const supportDir = path.join(uploadsRoot, 'support');

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, {recursive: true});
};

// Best-effort at boot; real ensure happens again in multer destination.
try {
  ensureDir(profileDir);
  ensureDir(feedbackDir);
  ensureDir(supportDir);
} catch (error) {
  console.warn('Could not pre-create upload subfolders:', error);
}

const makeFilename = (file: Express.Multer.File, fallbackExt: string) => {
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  let ext = originalExt;
  if (!ext || ext.length > 8) {
    if (file.mimetype === 'image/png') {
      ext = '.png';
    } else if (file.mimetype === 'image/webp') {
      ext = '.webp';
    } else if (file.mimetype === 'video/webm') {
      ext = '.webm';
    } else if (file.mimetype === 'video/quicktime') {
      ext = '.mov';
    } else if (file.mimetype.startsWith('video/')) {
      ext = '.mp4';
    } else {
      ext = fallbackExt;
    }
  }
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
};

const diskDestination = (dir: string) =>
  (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    try {
      ensureDir(dir);
      cb(null, dir);
    } catch (error: any) {
      cb(error, dir);
    }
  };

const profileStorage = multer.diskStorage({
  destination: diskDestination(profileDir),
  filename: (_req, file, cb) => cb(null, makeFilename(file, '.jpg')),
});

const feedbackStorage = multer.diskStorage({
  destination: diskDestination(feedbackDir),
  filename: (_req, file, cb) => cb(null, makeFilename(file, '.mp4')),
});

const supportStorage = multer.diskStorage({
  destination: diskDestination(supportDir),
  filename: (_req, file, cb) => cb(null, makeFilename(file, '.jpg')),
});

const profileUploader = multer({
  storage: profileStorage,
  limits: {fileSize: 5 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
  },
});

const feedbackUploader = multer({
  storage: feedbackStorage,
  limits: {fileSize: 40 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    if (VIDEO_TYPES.has(file.mimetype) || IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only MP4/MOV/WebM video (or image) is allowed for feedback'));
  },
});

const supportUploader = multer({
  storage: supportStorage,
  limits: {fileSize: 8 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, or WebP screenshots are allowed'));
  },
});

const wrapUpload =
  (
    middleware: ReturnType<typeof multer.prototype.single>,
    tooLargeMessage: string,
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, err => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return apiResponse.error(res, tooLargeMessage, 400);
        }
        return apiResponse.error(res, err.message, 400);
      }
      return apiResponse.error(
        res,
        err.message || 'Could not upload file',
        400,
      );
    });
  };

export const handleProfilePhotoUpload = wrapUpload(
  profileUploader.single('photo'),
  'Photo must be 5 MB or smaller',
);

export const handleFeedbackVideoUpload = wrapUpload(
  feedbackUploader.single('video'),
  'Feedback video must be 40 MB or smaller',
);

export const handleSupportScreenshotUpload = wrapUpload(
  supportUploader.single('screenshot'),
  'Screenshot must be 8 MB or smaller',
);

export const publicPhotoPath = (filename: string) =>
  `/uploads/profiles/${filename}`;

export const publicFeedbackPath = (filename: string) =>
  `/uploads/feedback/${filename}`;

export const publicSupportPath = (filename: string) =>
  `/uploads/support/${filename}`;
