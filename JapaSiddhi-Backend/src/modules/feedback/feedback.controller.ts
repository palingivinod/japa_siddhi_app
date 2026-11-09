import {Request, Response, NextFunction} from 'express';

import feedbackService from './feedback.service';
import apiResponse from '../../utils/apiResponse';
import {publicFeedbackPath} from '../../middleware/upload.middleware';
import {absoluteMediaUrl} from '../../utils/mediaUrl';

class FeedbackController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }

      const rawRating = Number(req.body?.rating || 0);
      const rating =
        rawRating >= 1 && rawRating <= 5 ? Math.round(rawRating) : 0;
      const title = String(req.body?.title || 'App feedback').trim() || 'App feedback';
      const message = String(req.body?.message || '').trim();

      const file = req.file as Express.Multer.File | undefined;
      if (!message && !file) {
        return apiResponse.error(res, 'Add a comment or a video.', 400);
      }

      let videoUrl: string | null = file?.filename
        ? publicFeedbackPath(file.filename)
        : null;

      if (file?.path && file?.filename) {
        try {
          const {
            deleteLocalUploadQuietly,
            isFirebaseStorageReady,
            uploadFileToFirebase,
          } = await import('../../firebase/firebaseStorage');
          if (isFirebaseStorageReady()) {
            videoUrl = await uploadFileToFirebase({
              localPath: file.path,
              filename: file.filename,
              folder: 'feedback',
              contentType: file.mimetype,
            });
            deleteLocalUploadQuietly(file.path);
          }
        } catch (firebaseError: any) {
          console.warn(
            'Firebase Storage feedback upload failed; using local path:',
            firebaseError?.message || firebaseError,
          );
        }
      }

      const mediaBaseUrl =
        absoluteMediaUrl(req, '/')?.replace(/\/$/, '') ||
        `https://${req.get('host') || 'japasiddhi.onrender.com'}`;

      const result = await feedbackService.create(
        {
          userId,
          rating,
          title,
          message: message || 'Video attached',
          videoUrl,
        },
        mediaBaseUrl,
      );

      return apiResponse.success(res, 'Feedback submitted successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async getMyFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await feedbackService.getUserFeedback(userId);
      return apiResponse.success(res, 'Feedback fetched successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await feedbackService.getById(Number(req.params.id));
      return apiResponse.success(res, 'Feedback fetched successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await feedbackService.getAll();
      return apiResponse.success(
        res,
        'Feedback list fetched successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new FeedbackController();
