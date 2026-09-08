import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import {NextFunction, Request, Response} from 'express';

import environment from '../config/environment';
import apiResponse from '../utils/apiResponse';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const uploadsRoot = path.isAbsolute(environment.UPLOAD_PATH)
  ? environment.UPLOAD_PATH
  : path.join(process.cwd(), environment.UPLOAD_PATH);

const profileDir = path.join(uploadsRoot, 'profiles');

fs.mkdirSync(profileDir, {recursive: true});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profileDir);
  },
  filename: (_req, file, cb) => {
    const originalExt = path.extname(file.originalname || '').toLowerCase();
    let ext = originalExt;
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png' && ext !== '.webp') {
      if (file.mimetype === 'image/png') {
        ext = '.png';
      } else if (file.mimetype === 'image/webp') {
        ext = '.webp';
      } else {
        ext = '.jpg';
      }
    }
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const uploader = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
  },
});

export const handleProfilePhotoUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploader.single('photo')(req, res, err => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return apiResponse.error(res, 'Photo must be 5 MB or smaller', 400);
      }
      return apiResponse.error(res, err.message, 400);
    }
    return apiResponse.error(
      res,
      err.message || 'Could not upload photo',
      400,
    );
  });
};

export const publicPhotoPath = (filename: string) =>
  `/uploads/profiles/${filename}`;
