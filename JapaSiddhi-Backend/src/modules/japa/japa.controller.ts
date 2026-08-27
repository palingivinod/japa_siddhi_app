import {
  Request,
  Response,
  NextFunction,
} from 'express';

import japaService from './japa.service';

import apiResponse from '../../utils/apiResponse';



class JapaController {


  async createSession(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId =
        req.user?.id;


      if (!userId) {

        return apiResponse.error(
          res,
          'User not authenticated',
          401,
        );

      }


      const result =
        await japaService.createSession(
          userId,
          req.body,
        );


      return apiResponse.success(
        res,
        'Japa session completed successfully',
        result,
      );


    } catch (error) {

      next(error);

    }

  }



  async validateTap(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        japaService.validateTapChant(
          req.body.expectedSeconds,
          req.body.actualSeconds,
        );


      return apiResponse.success(
        res,
        'Tap validation completed',
        result,
      );


    } catch(error) {

      next(error);

    }

  }




  async validateVoice(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        japaService.validateVoiceChant(
          req.body.matchPercentage,
        );


      return apiResponse.success(
        res,
        'Voice validation completed',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async getSummary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId =
        req.user?.id;


      if (!userId) {

        return apiResponse.error(
          res,
          'User not authenticated',
          401,
        );

      }


      const result =
        await japaService.getSummary(
          userId,
        );


      return apiResponse.success(
        res,
        'Japa summary fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }


  async getCommunity(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaService.getCommunity(userId);
      return apiResponse.success(res, 'Community japa fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async joinCommunity(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaService.joinCommunity(userId, req.body?.mantraId);
      return apiResponse.success(res, 'Joined community japa', result);
    } catch (error) {
      next(error);
    }
  }

  async getProgress(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaService.getProgress(userId);
      return apiResponse.success(res, 'Japa progress fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async saveReference(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaService.saveReference(
        userId,
        req.body?.mantraId ?? null,
        Number(req.body?.durationMs ?? 2500),
      );
      return apiResponse.success(res, 'Reference chant saved', result);
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaService.getAnalytics(userId);
      return apiResponse.success(res, 'Japa analytics fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async getMilestones(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaService.getMilestones(userId);
      return apiResponse.success(res, 'Japa milestones fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async getReference(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaService.getReference(userId);
      return apiResponse.success(res, 'Reference chant fetched', result);
    } catch (error) {
      next(error);
    }
  }

}


export default new JapaController();