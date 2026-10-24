import {Request, Response, NextFunction} from 'express';
import mantraRepository from './mantra.repository';
import apiResponse from '../../utils/apiResponse';

class MantraController {
  async categories(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await mantraRepository.listCategories();
      return apiResponse.success(res, 'Mantra categories fetched successfully', data);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await mantraRepository.getActiveMantras(
        req.query.list as string,
        Number(req.query.include) || 0,
      );
      return apiResponse.success(res, 'Mantras fetched successfully', data);
    } catch (error) {
      next(error);
    }
  }
}

export default new MantraController();
