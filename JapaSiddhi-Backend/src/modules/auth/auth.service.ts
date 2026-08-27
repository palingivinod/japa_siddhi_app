import { admin } from '../../firebase/firebase';

import authRepository from './auth.repository';
import otpRepository from './otp.repository';
import emailOtpService from '../../services/emailOtp.service';
import environment from '../../config/environment';

import jwtService from '../../utils/jwt';

import AppError from '../../utils/appError';

import {
  FirebaseLoginRequest,
  CompleteProfileRequest,
  LoginResponse,
  AuthUser,
} from './auth.types';


const issueToken = (user: AuthUser) =>
  jwtService.generate({
    id: user.id,
    uuid: user.uuid,
    firebaseUid: user.firebaseUid,
    mobileNumber: user.mobileNumber,
    role: user.role,
  });

const normalizePhone = (value: string) =>
  String(value || '').replace(/\D/g, '');

const profileFields = (data: any) => ({
  fullName: String(data.fullName || '').trim(),
  email: String(data.email || '').trim().toLowerCase() || undefined,
  gender: data.gender || 'Other',
  dateOfBirth: data.dateOfBirth || data.dob || '',
  countryId: Number(data.countryId) || 1,
  stateId: Number(data.stateId) || 0,
  cityId: Number(data.cityId) || 0,
  address: data.address,
  maritalStatus: data.maritalStatus || 'Bachelor',
  spouseName: data.spouseName,
  spouseDob: data.spouseDob,
  anniversaryDate: data.anniversaryDate,
  gothram: data.gothram,
  nakshatram: data.nakshatram,
  preferredLanguageId:
    Number(data.preferredLanguageId || data.languageId) || 1,
  profilePhoto: data.profilePhoto || data.profileImage,
});

class AuthService {

  async login(
    data: FirebaseLoginRequest,
    deviceInfo: {
      deviceType: 'ANDROID' | 'IOS';
      deviceModel?: string;
      deviceOs?: string;
      appVersion?: string;
    },
  ): Promise<LoginResponse> {

    let decodedToken;

    try {

      decodedToken =
        await admin.auth()
          .verifyIdToken(
            data.firebaseToken,
          );

    } catch (error) {

      throw new AppError(
        'Invalid Firebase token',
        401,
      );

    }


    const firebaseUid =
      decodedToken.uid;


    const phoneNumber =
      decodedToken.phone_number;


    if (!phoneNumber) {

      throw new AppError(
        'Phone number not found from Firebase',
        400,
      );

    }


    const mobileCountryCode =
      phoneNumber.substring(
        0,
        phoneNumber.length - 10,
      );


    const mobileNumber =
      phoneNumber.slice(-10);



    let user =
      await authRepository
        .findUserByFirebaseUid(
          firebaseUid,
        );



    if (!user) {

      const userId =
        await authRepository.createUser(
          {
            firebaseUid,

            mobileCountryCode,

            mobileNumber,

            deviceType:
              deviceInfo.deviceType,

            deviceModel:
              deviceInfo.deviceModel,

            deviceOs:
              deviceInfo.deviceOs,

            appVersion:
              deviceInfo.appVersion,

            firebaseToken:
              data.firebaseToken,
          },
        );


      user =
        await authRepository
          .findUserById(
            userId,
          );


      if (!user) {

        throw new AppError(
          'User creation failed',
          500,
        );

      }

    } else {


      await authRepository.updateLastLogin(
        user.id,

        data.firebaseToken,

        deviceInfo.deviceModel,

        deviceInfo.deviceOs,

        deviceInfo.appVersion,
      );


      user =
        await authRepository
          .findUserById(
            user.id,
          ) as AuthUser;

    }



    const token = issueToken(user);



    return {

      token,

      user,

    };

  }




  private async setupNewUser(user: AuthUser): Promise<void> {
    const {default: japaGoalRepository} = await import(
      '../japaGoal/japaGoal.repository'
    );
    const {default: familyRepository} = await import(
      '../family/family.repository'
    );

    await japaGoalRepository.createGoal({
      userId: user.id,
      mantraType: 'DEFAULT',
      mantraId: 1,
      personalMantraId: null,
      goalName: 'Daily Japa',
      targetCount: 10800,
      remainingCount: 10800,
      dailyTarget: 108,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '2026-12-31',
      notes: 'Personal sadhana',
    });

    const familyId = await familyRepository.createFamily({
      userId: user.id,
      familyName: `${user.fullName || 'My'} Family`,
      description: 'Personal family japa circle',
    });

    await familyRepository.addMember({
      familyId,
      userId: user.id,
      memberName: user.fullName || 'Me',
      relation: 'Self',
      mobileNumber: user.mobileNumber,
      email: user.email,
    });
  }

  async register(data: {
    mobileCountryCode: string;
    mobileNumber: string;
    email: string;
    fullName?: string;
    gender?: CompleteProfileRequest['gender'] | 'Prefer Not To Say';
    dateOfBirth?: string;
    dob?: string;
    countryId?: number;
    stateId?: number;
    cityId?: number;
    preferredLanguageId?: number;
    languageId?: number;
    profilePhoto?: string;
    profileImage?: string;
    deviceType?: 'ANDROID' | 'IOS';
  }): Promise<LoginResponse & {isNewUser: boolean}> {
    const mobileCountryCode = normalizePhone(data.mobileCountryCode);
    const mobileNumber = normalizePhone(data.mobileNumber);
    const email = String(data.email || '').trim().toLowerCase();
    const fullName = String(data.fullName || '').trim();

    if (!mobileCountryCode || mobileNumber.length < 6) {
      throw new AppError('Enter a valid mobile number', 400);
    }
    if (!email || !email.includes('@')) {
      throw new AppError('Enter a valid email address', 400);
    }
    if (fullName.length < 3) {
      throw new AppError('Full name is required', 400);
    }

    const existingMobile = await authRepository.findUserByMobile(
      mobileCountryCode,
      mobileNumber,
    );
    if (existingMobile) {
      await authRepository.completeProfile(
        existingMobile.id,
        profileFields({
          ...data,
          fullName: fullName || existingMobile.fullName,
          email: email || existingMobile.email,
        }),
      );
      const existingUser = await authRepository.findUserById(existingMobile.id);
      if (!existingUser) {
        throw new AppError('User login failed', 500);
      }
      return {
        token: issueToken(existingUser),
        user: existingUser,
        isNewUser: false,
      };
    }

    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new AppError(
        'This email is already registered. Please login.',
        409,
      );
    }

    const userId = await authRepository.createUser({
      mobileCountryCode,
      mobileNumber,
      email,
      fullName,
      deviceType: data.deviceType ?? 'ANDROID',
    });

    await authRepository.completeProfile(userId, profileFields({
      ...data,
      fullName,
      email,
    }));

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError('User registration failed', 500);
    }

    await this.setupNewUser(user);

    return {
      token: issueToken(user),
      user,
      isNewUser: true,
    };
  }

  async signIn(data: {
    mobileCountryCode: string;
    mobileNumber: string;
    email: string;
  }): Promise<LoginResponse & {isNewUser: boolean}> {
    const mobileCountryCode = normalizePhone(data.mobileCountryCode);
    const mobileNumber = normalizePhone(data.mobileNumber);
    const email = String(data.email || '').trim().toLowerCase();

    if (!mobileCountryCode || mobileNumber.length < 6) {
      throw new AppError('Enter a valid mobile number', 400);
    }
    if (!email || !email.includes('@')) {
      throw new AppError('Enter a valid email address', 400);
    }

    const user = await authRepository.findUserByCredentials(
      mobileCountryCode,
      mobileNumber,
      email,
    );

    if (!user) {
      throw new AppError(
        'Invalid mobile number or email. Use the same details you registered with.',
        401,
      );
    }

    await authRepository.updateLastLogin(user.id);
    const freshUser = (await authRepository.findUserById(user.id)) as AuthUser;

    return {
      token: issueToken(freshUser),
      user: freshUser,
      isNewUser: false,
    };
  }

  async phoneLogin(data: {
    mobileCountryCode: string;
    mobileNumber: string;
    email: string;
    mode?: 'register' | 'login';
    fullName?: string;
    deviceType?: 'ANDROID' | 'IOS';
  }): Promise<LoginResponse & {isNewUser: boolean}> {
    if (data.mode === 'login') {
      return this.signIn(data);
    }
    return this.register(data);
  }

  async devLogin(): Promise<LoginResponse> {
    if (environment.NODE_ENV === 'production') {
      throw new AppError('Not found', 404);
    }

    const user = await authRepository.findUserById(1);

    if (!user) {
      throw new AppError('Demo user is missing from the database', 500);
    }

    return {token: issueToken(user), user};
  }

  async completeProfile(
    userId: number,

    data: CompleteProfileRequest,

  ): Promise<void> {


    const user =
      await authRepository.findUserById(
        userId,
      );


    if (!user) {

      throw new AppError(
        'User not found',
        404,
      );

    }



    await authRepository.completeProfile(userId, profileFields(data));

  }



  async sendOtp(data: {
    mobileCountryCode: string;
    mobileNumber: string;
    email?: string;
  }) {
    const mobileCountryCode = normalizePhone(data.mobileCountryCode);
    const mobileNumber = normalizePhone(data.mobileNumber);
    const requestedEmail = String(data.email || '').trim().toLowerCase();
    if (!mobileCountryCode || mobileNumber.length < 6) {
      throw new AppError('Enter a valid mobile number', 400);
    }

    const existingUser = await authRepository.findUserByMobile(
      mobileCountryCode,
      mobileNumber,
    );
    const destinationEmail = String(
      existingUser?.email || requestedEmail || '',
    )
      .trim()
      .toLowerCase();

    if (!destinationEmail || !destinationEmail.includes('@')) {
      throw new AppError(
        'Enter the email address where the free OTP should be sent.',
        400,
      );
    }

    const existing = await otpRepository.findActive(
      mobileCountryCode,
      mobileNumber,
    );
    if (
      existing &&
      Date.now() - Number(existing.createdAt) <
        environment.OTP_RESEND_SECONDS * 1000
    ) {
      throw new AppError(
        `Please wait ${environment.OTP_RESEND_SECONDS} seconds before requesting another OTP.`,
        429,
      );
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    await emailOtpService.sendOtp(destinationEmail, otp);
    await otpRepository.save({
      mobileCountryCode,
      mobileNumber,
      sessionId: `email-${Date.now()}`,
      codeHash: emailOtpService.hashOtp(otp),
      expiresAt: Date.now() + environment.OTP_EXPIRES_SECONDS * 1000,
    });

    return {
      sent: true,
      sentTo: emailOtpService.maskEmail(destinationEmail),
      expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
    };
  }

  async verifyOtp(data: {
    mobileCountryCode: string;
    mobileNumber: string;
    otp: string;
  }) {
    const mobileCountryCode = normalizePhone(data.mobileCountryCode);
    const mobileNumber = normalizePhone(data.mobileNumber);
    const otp = String(data.otp || '').trim();
    const stored = await otpRepository.findActive(
      mobileCountryCode,
      mobileNumber,
    );

    if (!stored || Number(stored.expiresAt) < Date.now()) {
      throw new AppError('Invalid or expired OTP.', 401);
    }

    if (Number(stored.attempts) >= environment.OTP_MAX_ATTEMPTS) {
      await otpRepository.delete(mobileCountryCode, mobileNumber);
      throw new AppError('Too many incorrect attempts. Request a new OTP.', 401);
    }

    const valid = emailOtpService.matches(otp, stored.codeHash);

    if (!valid) {
      await otpRepository.incrementAttempts(stored.id);
      throw new AppError('Invalid or expired OTP.', 401);
    }

    await otpRepository.delete(mobileCountryCode, mobileNumber);

    const user = await authRepository.findUserByMobile(
      mobileCountryCode,
      mobileNumber,
    );

    if (!user) {
      return {
        verified: true,
        isNewUser: true,
        token: null,
        user: null,
      };
    }

    await authRepository.updateLastLogin(user.id);
    const freshUser = (await authRepository.findUserById(user.id)) as AuthUser;
    return {
      verified: true,
      isNewUser: false,
      token: issueToken(freshUser),
      user: freshUser,
    };
  }

  async getProfile(
    userId: number,
  ): Promise<AuthUser> {


    const user =
      await authRepository.findUserById(
        userId,
      );


    if (!user) {

      throw new AppError(
        'User not found',
        404,
      );

    }


    return user;

  }

  async deleteAccount(userId: number): Promise<void> {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    await authRepository.softDeleteUser(
      userId,
      `deleted_${userId}_${user.email || ''}`,
      `deleted_${userId}_${user.mobileNumber}`,
    );
  }

}


export default new AuthService();