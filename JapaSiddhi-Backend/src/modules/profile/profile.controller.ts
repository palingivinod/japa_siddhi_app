import {
  Request,
  Response,
  NextFunction,
} from 'express';

import profileService from './profile.service';
import japaRepository from '../japa/japa.repository';
import {publicPhotoPath} from '../../middleware/upload.middleware';

import apiResponse from '../../utils/apiResponse';

class ProfileController {

  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId = req.user?.id;

      if (!userId) {

        return apiResponse.error(
          res,
          'User not authenticated',
          401,
        );

      }

      const result =
        await profileService.getProfile(
          userId,
        );

      if (!result) {

        return apiResponse.error(
          res,
          'Profile not found',
          404,
        );

      }

      return apiResponse.success(
        res,
        'Profile fetched successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }



  async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId = req.user?.id;

      if (!userId) {

        return apiResponse.error(
          res,
          'User not authenticated',
          401,
        );

      }

      const result =
        await profileService.updateProfile(
          userId,
          req.body,
        );

      return apiResponse.success(
        res,
        'Profile updated successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async uploadPhoto(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      if (!req.file?.filename) {
        return apiResponse.error(res, 'Photo is required', 400);
      }

      const result = await profileService.updatePhoto(
        userId,
        publicPhotoPath(req.file.filename),
      );

      return apiResponse.success(res, 'Profile photo updated', result);
    } catch (error) {
      next(error);
    }
  }

  async getSettings(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaRepository.getSettings(userId);
      return apiResponse.success(res, 'Settings fetched', {
        languageCode: result.languageCode,
        notificationsOn: Number(result.notificationsOn) === 1,
        autoLockOn: Number(result.autoLockOn) === 1,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await japaRepository.saveSettings(userId, {
        languageCode: req.body?.languageCode,
        notificationsOn:
          req.body?.notificationsOn === undefined
            ? undefined
            : req.body.notificationsOn ? 1 : 0,
        autoLockOn:
          req.body?.autoLockOn === undefined
            ? undefined
            : req.body.autoLockOn ? 1 : 0,
      });
      return apiResponse.success(res, 'Settings updated', {
        languageCode: result.languageCode,
        notificationsOn: Number(result.notificationsOn) === 1,
        autoLockOn: Number(result.autoLockOn) === 1,
      });
    } catch (error) {
      next(error);
    }
  }

  async listAddresses(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await profileService.listAddresses(userId);
      return apiResponse.success(res, 'Addresses fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async saveAddress(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const address = String(req.body?.address || '').trim();
      if (!address) {
        return apiResponse.error(res, 'Address is required', 400);
      }
      const result = await profileService.saveAddress(userId, address);
      return apiResponse.success(res, 'Address saved', result);
    } catch (error) {
      next(error);
    }
  }

}

export default new ProfileController();