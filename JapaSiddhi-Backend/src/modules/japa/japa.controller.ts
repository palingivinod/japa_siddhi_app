import {
  Request,
  Response,
  NextFunction,
} from 'express';

import japaService from './japa.service';
import milestoneRewardService from './milestoneReward.service';

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
      const year = req.query.year ? Number(req.query.year) : undefined;
      const result = await japaService.getAnalytics(userId, year);
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

  async listMilestoneRewards(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await milestoneRewardService.listRewards(
        userId,
        Number(req.query.target),
      );
      return apiResponse.success(res, 'Milestone rewards fetched', result);
    } catch (error: any) {
      if (error?.message) {
        return apiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  async claimMilestoneReward(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await milestoneRewardService.claim(
        userId,
        Number(req.params.target),
        Number(req.body?.rewardId),
        {
          fullName: String(req.body?.fullName || ''),
          mobile: String(req.body?.mobile || req.body?.mobileNumber || ''),
          address: String(req.body?.address || ''),
          city: String(req.body?.city || ''),
          state: String(req.body?.state || ''),
          pinCode: String(req.body?.pinCode || req.body?.postalCode || ''),
        },
      );
      return apiResponse.success(res, 'Milestone reward submitted', result);
    } catch (error: any) {
      if (error?.message) {
        return apiResponse.error(res, error.message, 400);
      }
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