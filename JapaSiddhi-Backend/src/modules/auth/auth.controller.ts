import { Request, Response, NextFunction } from 'express';

import authService from './auth.service';

import apiResponse from '../../utils/apiResponse';


class AuthController {


  async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await authService.login(
          req.body,
          {
            deviceType:
              req.body.deviceType,

            deviceModel:
              req.body.deviceModel,

            deviceOs:
              req.body.deviceOs,

            appVersion:
              req.body.appVersion,
          },
        );


      return apiResponse.success(
        res,
        'Login successful',
        result,
      );


    } catch (error) {

      next(error);

    }

  }



  async passwordLogin(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.passwordLogin(req.body);
      return apiResponse.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.register(req.body);
      return apiResponse.success(res, 'Registration successful', result);
    } catch (error) {
      next(error);
    }
  }

  async signIn(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.signIn(req.body);
      return apiResponse.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  async phoneLogin(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.phoneLogin(req.body);
      return apiResponse.success(
        res,
        result.isNewUser
          ? 'Registration successful'
          : 'Login successful',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async devLogin(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.devLogin(req.body);
      return apiResponse.success(
        res,
        'Development login successful',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async sendOtp(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.sendOtp(req.body);
      return apiResponse.success(res, 'OTP sent successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.verifyOtp(req.body);
      return apiResponse.success(res, 'OTP verified successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async completeProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {


      const userId =
        (req as Request & {user?: {id: number}}).user?.id;


      if (!userId) {

        throw new Error(
          'Unauthorized user',
        );

      }



      await authService.completeProfile(
        userId,
        req.body,
      );



      return apiResponse.success(
        res,
        'Profile completed successfully',
      );


    } catch (error) {

      next(error);

    }

  }




  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {


      const userId =
        (req as Request & {user?: {id: number}}).user?.id;



      if (!userId) {

        throw new Error(
          'Unauthorized user',
        );

      }



      const user =
        await authService.getProfile(
          userId,
        );



      return apiResponse.success(
        res,
        'Profile fetched successfully',
        user,
      );


    } catch (error) {

      next(error);

    }

  }

  async social(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      return apiResponse.success(
        res,
        'Use mobile number and email OTP to continue.',
        {
          provider: req.body?.provider || 'email',
          available: false,
        },
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = (req as Request & {user?: {id: number}}).user?.id;

      if (!userId) {
        throw new Error('Unauthorized user');
      }

      await authService.deleteAccount(userId);
      return apiResponse.success(res, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

}


export default new AuthController();