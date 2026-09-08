import apiService from '../../../services/apiService';
import {PickedPhoto, isRemotePhoto} from '../../../services/profilePhoto';

export interface CompleteProfileRequest {
  fullName: string;
  email?: string;
  phoneNumber: string;
  gender:
    | 'Male'
    | 'Female'
    | 'Other'
    | 'Prefer Not To Say';
  dob: string;
  countryId: number;
  stateId: number;
  cityId: number;
  languageId: number;
  address?: string;
  maritalStatus?: 'Bachelor' | 'Married';
  spouseName?: string;
  spouseDob?: string;
  anniversaryDate?: string;
  gothram?: string;
  nakshatram?: string;
  profileImage?: string | null;
}

export const mapProfile = (data: any) => {
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.fullName ?? data.full_name ?? 'Devotee',
    mobileNumber: data.mobileNumber ?? data.mobile_number ?? '',
    email: data.email ?? '',
    gender: data.gender ?? '',
    cityName: data.cityName ?? data.city_name ?? '',
    stateName: data.stateName ?? data.state_name ?? '',
    countryName: data.countryName ?? data.country_name ?? '',
    preferredLanguageName:
      data.preferredLanguageName ?? data.preferred_language_name ?? '',
    address: data.address ?? '',
    maritalStatus: data.maritalStatus ?? data.marital_status ?? '',
    spouseName: data.spouseName ?? data.spouse_name ?? '',
    gothram: data.gothram ?? '',
    nakshatram: data.nakshatram ?? '',
    profilePhoto: data.profilePhoto ?? data.profile_photo ?? data.profileImage ?? null,
    profileImage: data.profilePhoto ?? data.profile_photo ?? data.profileImage ?? null,
    profileCompleted: data.profileCompleted ?? data.profile_completed,
  };
};

class ProfileApi {
  async getLanguages() {
    const response = await apiService.get('/master/languages');
    return response.data.data;
  }

  async getCountries() {
    const response = await apiService.get('/master/countries');
    return response.data.data;
  }

  async getStates(countryCode: string) {
    const countries = await this.getCountries();
    const country = countries?.find(
      (item: {isoCode?: string; code?: string}) =>
        item.isoCode === countryCode || item.code === countryCode,
    );

    if (!country?.id) {
      return [];
    }

    const response = await apiService.get(`/master/states/${country.id}`);
    return response.data.data;
  }

  async getCities(stateId: number) {
    const response = await apiService.get(`/master/cities/${stateId}`);
    return response.data.data;
  }

  async getProfile() {
    try {
      const response = await apiService.get('/profile');
      return mapProfile(response.data.data);
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (
        status === 401 ||
        message === 'Authorization token missing.' ||
        message === 'Invalid token.'
      ) {
        throw error;
      }
      const response = await apiService.get('/auth/profile');
      return mapProfile(response.data.data);
    }
  }

  async register(data: CompleteProfileRequest & {
    mobileCountryCode: string;
    mobileNumber: string;
  }) {
    const response = await apiService.post('/auth/register', {
      mobileCountryCode: data.mobileCountryCode,
      mobileNumber: data.mobileNumber,
      fullName: data.fullName,
      email: data.email,
      gender: data.gender,
      dateOfBirth: data.dob,
      dob: data.dob,
      countryId: data.countryId,
      stateId: data.stateId || undefined,
      cityId: data.cityId || undefined,
      preferredLanguageId: data.languageId,
      languageId: data.languageId,
      address: data.address,
      maritalStatus: data.maritalStatus,
      spouseName: data.spouseName,
      spouseDob: data.spouseDob,
      anniversaryDate: data.anniversaryDate,
      gothram: data.gothram,
      nakshatram: data.nakshatram,
      profilePhoto: isRemotePhoto(data.profileImage) ? data.profileImage : undefined,
      profileImage: isRemotePhoto(data.profileImage) ? data.profileImage : undefined,
      deviceType: 'ANDROID',
    });
    return response.data;
  }

  async completeProfile(data: CompleteProfileRequest) {
    const response = await apiService.post('/auth/complete-profile', {
      fullName: data.fullName,
      email: data.email,
      gender: data.gender,
      dateOfBirth: data.dob,
      dob: data.dob,
      countryId: data.countryId,
      stateId: data.stateId || undefined,
      cityId: data.cityId || undefined,
      preferredLanguageId: data.languageId,
      languageId: data.languageId,
      address: data.address,
      maritalStatus: data.maritalStatus,
      spouseName: data.spouseName,
      spouseDob: data.spouseDob,
      anniversaryDate: data.anniversaryDate,
      gothram: data.gothram,
      nakshatram: data.nakshatram,
      profilePhoto: isRemotePhoto(data.profileImage) ? data.profileImage : undefined,
      profileImage: isRemotePhoto(data.profileImage) ? data.profileImage : undefined,
    });
    return response.data;
  }

  async uploadPhoto(photo: PickedPhoto) {
    const formData = new FormData();
    formData.append('photo', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.fileName || 'profile.jpg',
    } as any);
    const response = await apiService.post('/profile/photo', formData);
    return mapProfile(response.data.data);
  }

  async deleteAccount() {
    const response = await apiService.delete('/auth/account');
    return response.data;
  }
}

export default new ProfileApi();
