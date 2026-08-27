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

}

export default new ChallengeController();