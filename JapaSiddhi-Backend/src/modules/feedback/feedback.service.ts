import {CreateFeedbackRequest} from './feedback.types';
import feedbackRepository from './feedback.repository';
import emailOtpService from '../../services/emailOtp.service';

class FeedbackService {
  async create(data: CreateFeedbackRequest, mediaBaseUrl?: string) {
    const id = await feedbackRepository.create(data);
    const videoLink = data.videoUrl
      ? `${mediaBaseUrl || ''}${data.videoUrl}`
      : '-';

    await emailOtpService.notifyAdmin(
      'New app feedback',
      [
        'A devotee submitted feedback.',
        `User ID: ${data.userId}`,
        `Title: ${data.title}`,
        `Rating: ${data.rating}`,
        `Message: ${data.message}`,
        `Video: ${videoLink}`,
        `Feedback ID: ${id}`,
      ].join('\n'),
    );

    return {id, videoUrl: data.videoUrl || null};
  }

  async getById(id: number) {
    const feedback = await feedbackRepository.getById(id);
    if (!feedback) {
      throw new Error('Feedback not found');
    }
    return feedback;
  }

  async getUserFeedback(userId: number) {
    return feedbackRepository.getUserFeedback(userId);
  }

  async getAll() {
    return feedbackRepository.getAll();
  }
}

export default new FeedbackService();
