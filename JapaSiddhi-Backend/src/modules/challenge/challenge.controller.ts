import {
  Request,
  Response,
  NextFunction,
} from 'express';

import challengeService from './challenge.service';

import apiResponse from '../../utils/apiResponse';

class ChallengeController {

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await challengeService.create(
          req.body,
        );

      return apiResponse.success(
        res,
        'Challenge created successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async getActiveChallenges(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await challengeService.getActiveChallenges();

      return apiResponse.success(
        res,
        'Challenges fetched successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await challengeService.getById(
          Number(req.params.id),
          req.user?.id,
        );

      return apiResponse.success(
        res,
        'Challenge fetched successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async join(
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
        await challengeService.join(
          Number(req.params.id),
          userId,
        );

      return apiResponse.success(
        res,
        'Challenge joined successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async updateProgress(
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

      const {

        currentValue,

      } = req.body;

      const result =
        await challengeService.updateProgress(
          Number(req.params.id),
          userId,
          currentValue,
        );

      return apiResponse.success(
        res,
        'Challenge progress updated successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async leaderboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await challengeService.leaderboard(
          Number(req.params.id),
          req.user?.id,
        );

      return apiResponse.success(
        res,
        'Challenge leaderboard fetched successfully',
        result,
      );

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
      const result = await challengeService.getProgress(
        Number(req.params.id),
        userId,
      );
      return apiResponse.success(res, 'Challenge progress fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async rate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await challengeService.rate(
        Number(req.params.id),
        userId,
        Number(req.body?.rating),
        req.body?.feedback,
      );
      return apiResponse.success(res, 'Challenge rating saved', result);
    } catch (error) {
      next(error);
    }
  }


  async listRewards(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await challengeService.listRewards(
        Number(req.params.id),
        userId,
      );
      return apiResponse.success(res, 'Challenge rewards fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async claimReward(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await challengeService.claimReward(
        Number(req.params.id),
        userId,
        Number(req.body?.rewardId),
      );
      return apiResponse.success(res, 'Reward claimed successfully', result);
    } catch (error: any) {
      if (error?.message) {
        return apiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  async submitRewardDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await challengeService.submitRewardDelivery(
        Number(req.params.id),
        userId,
        {
          fullName: String(req.body?.fullName || ''),
          mobile: String(req.body?.mobile || req.body?.mobileNumber || ''),
          address: String(req.body?.address || ''),
          city: String(req.body?.city || ''),
          state: String(req.body?.state || ''),
          pinCode: String(req.body?.pinCode || req.body?.postalCode || ''),
        },
      );
      return apiResponse.success(
        res,
        'Reward delivery details saved successfully',
        result,
      );
    } catch (error: any) {
      if (error?.message) {
        return apiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

}

export default new ChallengeController();
