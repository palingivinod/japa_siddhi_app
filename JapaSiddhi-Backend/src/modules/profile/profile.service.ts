import {
  UpdateProfileRequest,
} from './profile.types';

import profileRepository from './profile.repository';

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

    await profileRepository.updateProfile(
      userId,
      data,
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

  async listAddresses(userId: number) {
    return profileRepository.listAddresses(userId);
  }

  async saveAddress(userId: number, address: string) {
    return profileRepository.saveAddress(userId, address);
  }

}

export default new ProfileService();