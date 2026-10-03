

export interface FirebaseLoginRequest {
  firebaseToken: string;
}

export interface CompleteProfileRequest {
  fullName: string;
  email?: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer Not To Say';
  dateOfBirth: string;

  countryId: number;
  stateId?: number | null;
  cityId?: number | null;
  address?: string;
  maritalStatus?: 'Bachelor' | 'Married';
  spouseName?: string;
  spouseDob?: string;
  anniversaryDate?: string;
  gothram?: string;
  nakshatram?: string;
  preferredLanguageId: number;

  timezone?: string;

  deviceType?: string;
  deviceModel?: string;
  deviceOS?: string;
  appVersion?: string;

  firebaseToken?: string;

  referralCode?: string;

  profilePhoto?: string;
}

export interface JwtUser {
  id: number;
  uuid: string;
  userCode?: string;
  firebaseUid: string;
  mobileNumber: string;
  role: string;
}

export interface AuthUser {
  id: number;
  uuid: string;
  userCode?: string | null;

  firebaseUid: string;

  mobileCountryCode: string;
  mobileNumber: string;

  fullName: string;

  email: string | null;

  gender: string | null;

  dateOfBirth: string | null;

  profilePhoto: string | null;

  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  address: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  spouseDob: string | null;
  anniversaryDate: string | null;
  gothram: string | null;
  nakshatram: string | null;

  preferredLanguageId: number | null;

  timezone: string | null;

  deviceType: string | null;
  deviceModel: string | null;
  deviceOS: string | null;
  appVersion: string | null;

  firebaseToken: string | null;

  lastLoginAt: Date | null;
  lastLogoutAt: Date | null;

  emailVerified: boolean;
  mobileVerified: boolean;

  profileCompleted: boolean;

  notificationEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkModeEnabled: boolean;

  accountStatus: string;

  loginType: string;

  role: string;

  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;

  createdAt: Date;
  updatedAt: Date;

  deletedAt: Date | null;
}

export interface FirebaseUser {
  uid: string;
  phoneNumber: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}