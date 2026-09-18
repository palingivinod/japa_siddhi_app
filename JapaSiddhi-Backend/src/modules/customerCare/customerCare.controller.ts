import {Request, Response, NextFunction} from 'express';

import customerCareService from './customerCare.service';
import apiResponse from '../../utils/apiResponse';
import {publicSupportPath} from '../../middleware/upload.middleware';

class CustomerCareController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }

      const subject = String(req.body?.subject || '').trim();
      const message = String(req.body?.message || '').trim();
      const orderService = String(req.body?.orderService || '').trim();
      if (!subject || !message) {
        return apiResponse.error(
          res,
          'Subject and description are required.',
          400,
        );
      }

      const file = req.file as Express.Multer.File | undefined;
      const screenshotUrl = file?.filename
        ? publicSupportPath(file.filename)
        : null;
      const mediaBaseUrl = `${req.protocol}://${req.get('host')}`;

      const result = await customerCareService.create(
        {
          userId,
          subject,
          message,
          orderService,
          screenshotUrl,
        },
        mediaBaseUrl,
      );

      return apiResponse.success(
        res,
        'Support ticket created successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async getMyTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await customerCareService.getUserTickets(userId);
      return apiResponse.success(
        res,
        'Support tickets fetched successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerCareService.getById(Number(req.params.id));
      return apiResponse.success(
        res,
        'Support ticket fetched successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const {reply, status} = req.body;
      const result = await customerCareService.reply(
        Number(req.params.id),
        reply,
        status,
      );
      return apiResponse.success(
        res,
        'Support ticket updated successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerCareService.getConfig();
      return apiResponse.success(res, 'Support config fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async getFaqs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerCareService.getFaqs();
      return apiResponse.success(res, 'FAQ fetched', result);
    } catch (error) {
      next(error);
    }
  }
}

export default new CustomerCareController();
