import {randomUUID} from 'crypto';
import bcrypt from 'bcrypt';
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

const hashPassword = (password: string) => bcrypt.hash(password, 10);

const assertPassword = (password: string) => {
  const value = String(password || '');
  if (value.length < 6) {
    throw new AppError('Password must be at least 6 characters.', 400);
  }
  return value;
};

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
    password?: string;
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
    const password = assertPassword(String(data.password || ''));
    const passwordHash = await hashPassword(password);

    if (
      !mobileCountryCode ||
      mobileNumber.length < 6 ||
      /^0+$/.test(mobileNumber)
    ) {
      throw new AppError('Enter a valid mobile number', 400);
    }
    if (!email || !email.includes('@')) {
      throw new AppError('Enter a valid email address', 400);
    }
    if (fullName.length < 3) {
      throw new AppError('Full name is required', 400);
    }

    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      const existingHash = await authRepository.getPasswordHashByEmail(email);
      if (existingHash) {
        throw new AppError(
          'An account with this email already exists. Please sign in with email and password.',
          409,
        );
      }

      // Legacy account without password — finish profile and set password once.
      await authRepository.setPasswordHash(existingEmail.id, passwordHash);
      await authRepository.completeProfile(
        existingEmail.id,
        profileFields({
          ...data,
          fullName: fullName || existingEmail.fullName,
          email,
        }),
      );
      await authRepository.updateMobileIfChanged(
        existingEmail.id,
        mobileCountryCode,
        mobileNumber,
      );
      const existingUser = await authRepository.findUserById(existingEmail.id);
      if (!existingUser) {
        throw new AppError('User login failed', 500);
      }
      return {
        token: issueToken(existingUser),
        user: existingUser,
        isNewUser: false,
      };
    }

    // New email = new account. firebase_uid must stay unique (not phone-based).
    let userId: number;
    try {
      userId = await authRepository.createUser({
        mobileCountryCode,
        mobileNumber,
        email,
        fullName,
        passwordHash,
        firebaseUid: `email:${email}`,
        deviceType: data.deviceType ?? 'ANDROID',
      });
    } catch (error: any) {
      const message = String(error?.message || error?.sqlMessage || '');
      if (/firebase_uid|UNIQUE/i.test(message)) {
        const raced = await authRepository.findUserByEmail(email);
        if (raced) {
          throw new AppError(
            'An account with this email already exists. Please sign in with email and password.',
            409,
          );
        }
        userId = await authRepository.createUser({
          mobileCountryCode,
          mobileNumber,
          email,
          fullName,
          passwordHash,
          firebaseUid: `usr:${randomUUID()}`,
          deviceType: data.deviceType ?? 'ANDROID',
        });
      } else {
        throw error;
      }
    }

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

  async passwordLogin(data: {
    email?: string;
    password?: string;
  }): Promise<LoginResponse> {
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');

    if (!email || !email.includes('@')) {
      throw new AppError('Enter a valid email address', 400);
    }
    if (!password) {
      throw new AppError('Enter your password', 400);
    }

    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const passwordHash = await authRepository.getPasswordHashByEmail(email);
    if (!passwordHash) {
      throw new AppError(
        'No password is set for this account. Create your account again to set email, password and mobile.',
        401,
      );
    }

    const ok = await bcrypt.compare(password, passwordHash);
    if (!ok) {
      throw new AppError('Invalid email or password.', 401);
    }

    await authRepository.updateLastLogin(user.id);
    const freshUser = (await authRepository.findUserById(user.id)) as AuthUser;
    return {
      token: issueToken(freshUser),
      user: freshUser,
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

    // Account identity is email. Phone is stored on the profile but does not select the user.
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new AppError(
        'No account found for this email. Please create an account first.',
        401,
      );
    }

    await authRepository.updateMobileIfChanged(
      user.id,
      mobileCountryCode,
      mobileNumber,
    );
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

  async devLogin(data?: {
    email?: string;
    password?: string;
  }): Promise<LoginResponse> {
    if (environment.NODE_ENV === 'production') {
      throw new AppError('Not found', 404);
    }

    const expectedEmail = environment.DEV_LOGIN_EMAIL.trim().toLowerCase();
    const expectedPassword = environment.DEV_LOGIN_PASSWORD;
    const email = String(data?.email || '').trim().toLowerCase();
    const password = String(data?.password || '');

    if (
      (email || password) &&
      (email !== expectedEmail || password !== expectedPassword)
    ) {
      throw new AppError('Invalid test credentials', 401);
    }

    const user = await authRepository.ensureDevUser({
      email: expectedEmail,
      fullName: 'Vinod',
    });

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
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    mode?: 'register' | 'login';
  }) {
    const mode = data.mode === 'login' ? 'login' : 'register';
    if (mode !== 'register') {
      throw new AppError(
        'OTP is only available while creating a new account. Please sign in with email and password.',
        400,
      );
    }

    const destinationEmail = String(data.email || '').trim().toLowerCase();
    if (!destinationEmail || !destinationEmail.includes('@')) {
      throw new AppError(
        'Enter the email address where the OTP should be sent.',
        400,
      );
    }

    const mobileCountryCode = normalizePhone(data.mobileCountryCode || '');
    const mobileNumber = normalizePhone(data.mobileNumber || '');
    if (
      !mobileCountryCode ||
      mobileNumber.length < 6 ||
      /^0+$/.test(mobileNumber)
    ) {
      throw new AppError(
        'Enter a valid mobile number to create your account.',
        400,
      );
    }

    const existingUser = await authRepository.findUserByEmail(destinationEmail);
    if (existingUser) {
      const existingHash =
        await authRepository.getPasswordHashByEmail(destinationEmail);
      if (existingHash) {
        throw new AppError(
          'An account with this email already exists. Please sign in with email and password.',
          409,
        );
      }
    }

    const existing = await otpRepository.findActiveByEmail(destinationEmail);
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
      email: destinationEmail,
      codeHash: emailOtpService.hashOtp(otp),
      expiresAt: Date.now() + environment.OTP_EXPIRES_SECONDS * 1000,
    });

    return {
      sent: true,
      sentTo: emailOtpService.maskEmail(destinationEmail),
      expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
      mobileCountryCode,
      mobileNumber,
      mode: 'register' as const,
    };
  }

  async verifyOtp(data: {
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    otp: string;
    mode?: 'register' | 'login';
  }) {
    const mode = data.mode === 'login' ? 'login' : 'register';
    if (mode !== 'register') {
      throw new AppError(
        'OTP is only available while creating a new account. Please sign in with email and password.',
        400,
      );
    }

    const email = String(data.email || '').trim().toLowerCase();
    const otp = String(data.otp || '').trim();

    if (!email || !email.includes('@')) {
      throw new AppError('Email is required to verify OTP.', 400);
    }

    const stored = await otpRepository.findActiveByEmail(email);

    if (!stored || Number(stored.expiresAt) < Date.now()) {
      throw new AppError('Invalid or expired OTP.', 401);
    }

    if (Number(stored.attempts) >= environment.OTP_MAX_ATTEMPTS) {
      await otpRepository.deleteByEmail(email);
      throw new AppError('Too many incorrect attempts. Request a new OTP.', 401);
    }

    const valid = emailOtpService.matches(otp, stored.codeHash);

    if (!valid) {
      await otpRepository.incrementAttempts(stored.id);
      throw new AppError('Invalid or expired OTP.', 401);
    }

    await otpRepository.deleteByEmail(email);

    const mobileCountryCode =
      normalizePhone(data.mobileCountryCode || '') ||
      normalizePhone(stored.mobileCountryCode || '') ||
      '91';
    const mobileNumber =
      normalizePhone(data.mobileNumber || '') ||
      normalizePhone(stored.mobileNumber || '');

    if (!mobileNumber || /^0+$/.test(mobileNumber)) {
      throw new AppError('Enter a valid mobile number to create your account.', 400);
    }

    const user = await authRepository.findUserByEmail(email);
    if (user) {
      const existingHash = await authRepository.getPasswordHashByEmail(email);
      if (existingHash) {
        throw new AppError(
          'An account with this email already exists. Please sign in with email and password.',
          409,
        );
      }
    }

    // Registration OTP only unlocks signup — never issues a login session here.
    return {
      verified: true,
      isNewUser: true,
      token: null,
      user: null,
      email,
      mobileCountryCode,
      mobileNumber,
      mode: 'register' as const,
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