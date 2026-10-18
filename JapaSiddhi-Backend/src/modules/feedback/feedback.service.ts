import {CreateFeedbackRequest} from './feedback.types';
import feedbackRepository from './feedback.repository';
import emailOtpService from '../../services/emailOtp.service';
import mysql from '../../database/mysql';

class FeedbackService {
  private async resolveDevotee(userId: number) {
    try {
      const rows = await mysql.query<
        Array<{fullName?: string; email?: string; mobile?: string}>
      >(
        `
        SELECT
          full_name AS fullName,
          email,
          mobile_number AS mobile
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId],
      );
      const row = rows?.[0];
      return {
        name: String(row?.fullName || '').trim() || `User #${userId}`,
        email: String(row?.email || '').trim() || '-',
        mobile: String(row?.mobile || '').trim() || '-',
      };
    } catch {
      return {name: `User #${userId}`, email: '-', mobile: '-'};
    }
  }

  async create(data: CreateFeedbackRequest, mediaBaseUrl?: string) {
    const id = await feedbackRepository.create(data);
    const videoLink = data.videoUrl
      ? `${mediaBaseUrl || ''}${data.videoUrl}`
      : '-';
    const devotee = await this.resolveDevotee(data.userId);

    await emailOtpService.notifyAdmin(
      'New app feedback',
      [
        'A devotee submitted feedback.',
        `Name: ${devotee.name}`,
        `User ID: ${data.userId}`,
        `Email: ${devotee.email}`,
        `Mobile: ${devotee.mobile}`,
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
