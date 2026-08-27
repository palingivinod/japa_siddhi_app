import {
  CreateFeedbackRequest,
} from './feedback.types';

import feedbackRepository from './feedback.repository';
import emailOtpService from '../../services/emailOtp.service';

class FeedbackService {

  async create(
    data: CreateFeedbackRequest,
  ) {

    const id =
      await feedbackRepository.create(
        data,
      );

    await emailOtpService.notifyAdmin(
      'New app feedback',
      [
        'A devotee submitted feedback.',
        `Title: ${data.title}`,
        `Rating: ${data.rating}`,
        `Message: ${data.message}`,
        `Feedback ID: ${id}`,
      ].join('\n'),
    );

    return {

      id,

    };

  }

  async getById(
    id: number,
  ) {

    const feedback =
      await feedbackRepository.getById(
        id,
      );

    if (!feedback) {

      throw new Error(
        'Feedback not found',
      );

    }

    return feedback;

  }

  async getUserFeedback(
    userId: number,
  ) {

    return feedbackRepository.getUserFeedback(
      userId,
    );

  }

  async getAll() {

    return feedbackRepository.getAll();

  }

}

export default new FeedbackService();