import {
  Request,
  Response,
  NextFunction,
} from 'express';

import japaGoalService from './japaGoal.service';

import apiResponse from '../../utils/apiResponse';



class JapaGoalController {


  async createGoal(
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
        await japaGoalService.createGoal(
          userId,
          req.body,
        );


      return apiResponse.success(
        res,
        'Japa goal created successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async getGoals(
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
        await japaGoalService.getGoals(
          userId,
        );


      return apiResponse.success(
        res,
        'Japa goals fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async getGoal(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId =
        req.user?.id;


      const goalId =
        Number(req.params.id);


      const result =
        await japaGoalService.getGoal(
          goalId,
          userId!,
        );


      return apiResponse.success(
        res,
        'Japa goal fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId =
        req.user?.id;


      await japaGoalService.updateStatus(
        Number(req.params.id),
        userId!,
        req.body.status,
      );


      return apiResponse.success(
        res,
        'Japa goal updated successfully',
      );


    } catch(error) {

      next(error);

    }

  }



  async cancelGoal(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId =
        req.user?.id;


      await japaGoalService.cancelGoal(
        Number(req.params.id),
        userId!,
      );


      return apiResponse.success(
        res,
        'Japa goal cancelled successfully',
      );


    } catch(error) {

      next(error);

    }

  }

  async extendGoal(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const goalId = Number(req.params.id);
      if (!goalId) {
        return apiResponse.error(res, 'Invalid goal id', 400);
      }
      const targetCount = Number(req.body?.targetCount);
      if (!Number.isFinite(targetCount) || targetCount < 1) {
        return apiResponse.error(res, 'targetCount is required', 400);
      }
      const result = await japaGoalService.extendGoal(goalId, userId, {
        targetCount,
        days: req.body?.days,
        endDate: req.body?.endDate ?? null,
        notes: req.body?.notes ?? null,
      });
      return apiResponse.success(
        res,
        'Japa goal extended successfully',
        result,
      );
    } catch (error: any) {
      if (error?.statusCode) {
        return apiResponse.error(
          res,
          error.message || 'Unable to extend goal',
          error.statusCode,
        );
      }
      next(error);
    }
  }

  async changeDeadline(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const goalId = Number(req.params.id);
      if (!goalId) {
        return apiResponse.error(res, 'Invalid goal id', 400);
      }
      const result = await japaGoalService.changeDeadline(
        goalId,
        userId,
        String(req.body?.endDate || ''),
      );
      return apiResponse.success(
        res,
        'Deadline updated successfully',
        result,
      );
    } catch (error: any) {
      if (error?.statusCode) {
        return apiResponse.error(
          res,
          error.message || 'Unable to change deadline',
          error.statusCode,
        );
      }
      next(error);
    }
  }


}


export default new JapaGoalController();