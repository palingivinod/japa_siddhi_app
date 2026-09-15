import {Router} from 'express';

import feedbackController from './feedback.controller';
import authenticate from '../../middleware/auth.middleware';
import {handleFeedbackVideoUpload} from '../../middleware/upload.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  handleFeedbackVideoUpload,
  feedbackController.create,
);

router.get('/', authenticate, feedbackController.getMyFeedback);

router.get('/all', authenticate, feedbackController.getAll);

router.get('/:id', authenticate, feedbackController.getById);

export default router;
