import fs from 'fs';
import path from 'path';

import {
  UpdateProfileRequest,
} from './profile.types';

import profileRepository from './profile.repository';
import authRepository from '../auth/auth.repository';
import AppError from '../../utils/appError';
import {uploadsRoot} from '../../middleware/upload.middleware';

class ProfileService {

  async getProfile(
    userId: number,
  ) {

    return await profileRepository.getProfile(
      userId,
    );

  }

  async updateProfile(
    userId: number,
    data: UpdateProfileRequest,
  ) {
    // fullName and email are locked after registration
    const {
      fullName: _ignoredName,
      email: _ignoredEmail,
      ...editable
    } = data;

    // A mobile already in use must not be taken from its owner, which would
    // leave them unable to sign in with their own number.
    const nextMobile = String(editable.mobileNumber || '').replace(/\D/g, '');
    if (nextMobile) {
      const current = await profileRepository.getProfile(userId);
      const currentMobile = String(current?.mobileNumber || '').replace(
        /\D/g,
        '',
      );
      if (nextMobile !== currentMobile) {
        const owner = await authRepository.findUserByMobile('', nextMobile);
        if (owner && Number(owner.id) !== Number(userId)) {
          throw new AppError(
            'That mobile number already belongs to another account.',
            409,
          );
        }
      }
    }

    await profileRepository.updateProfile(
      userId,
      editable,
    );

    const profile =
      await profileRepository.getProfile(
        userId,
      );

    return {
      success: true,
      profile,
    };

  }

  async updatePhoto(userId: number, profilePhoto: string) {
    const current = await profileRepository.getProfile(userId);
    await profileRepository.updatePhoto(userId, profilePhoto);

    const previous = String(current?.profilePhoto || '');
    if (
      previous &&
      previous.startsWith('/uploads/') &&
      previous !== profilePhoto
    ) {
      const relative = previous.replace(/^\/uploads\/?/, '');
      const resolvedRoot = path.resolve(uploadsRoot);
      const absolute = path.resolve(uploadsRoot, relative);
      if (
        absolute === resolvedRoot ||
        !absolute.startsWith(resolvedRoot + path.sep)
      ) {
        return profileRepository.getProfile(userId);
      }
      fs.promises.unlink(absolute).catch(() => undefined);
    }

    return profileRepository.getProfile(userId);
  }

  async listAddresses(userId: number) {
    return profileRepository.listAddresses(userId);
  }

  async saveAddress(userId: number, address: string) {
    return profileRepository.saveAddress(userId, address);
  }

}

export default new ProfileService();