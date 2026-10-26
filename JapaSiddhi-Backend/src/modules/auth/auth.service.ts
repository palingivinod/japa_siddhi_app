import {randomUUID} from 'crypto';
import {compare as bcryptCompare, hash as bcryptHash} from 'bcrypt';
import {admin, isFirebaseReady} from '../../firebase/firebase';

import authRepository, {isPlaceholderMobile} from './auth.repository';
import otpRepository from './otp.repository';
import emailOtpService from '../../services/emailOtp.service';
import environment from '../../config/environment';
import Constants from '../../config/constants';

import jwtService from '../../utils/jwt';

import AppError from '../../utils/appError';

import {
  FirebaseLoginRequest,
  CompleteProfileRequest,
  LoginResponse,
  AuthUser,
} from './auth.types';


const isPhoneOtpEnabled = () =>
  String(process.env.PHONE_OTP_ENABLED || '').trim().toLowerCase() === 'true';

const phoneOtpComingSoon = (
  mode: 'login' | 'register',
  mobileCountryCode: string,
  mobileNumber: string,
) => ({
  sent: false,
  phoneOtpAvailable: false as const,
  provider: 'email' as const,
  message: 'Use email for now. Mobile OTP will come soon.',
  mobileCountryCode,
  mobileNumber,
  channel: 'phone' as const,
  mode,
});

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

const hashPassword = (password: string) => bcryptHash(password, 10);

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
  // India (id=1) is the default for every signup path; devotee can change later.
  countryId: Number(data.countryId) > 0 ? Number(data.countryId) : 1,
  stateId: Number(data.stateId) || 0,
  cityId: Number(data.cityId) || 0,
  address: data.address,
  maritalStatus: data.maritalStatus || 'Bachelor',
  spouseName: data.spouseName,
  spouseDob: data.spouseDob,
  anniversaryDate: data.anniversaryDate,
  gothram: data.gothram,
  nakshatram: data.nakshatram,
  postalCode: String(data.postalCode || data.pinCode || '').replace(/\D/g, '').slice(0, 6),
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

  /**
   * Google / Apple social sign-in via a verified Firebase ID token (email-based).
   */
  async socialLogin(
    data: {
      firebaseToken: string;
      provider?: string;
      deviceType?: 'ANDROID' | 'IOS';
      deviceModel?: string;
      deviceOs?: string;
      appVersion?: string;
    },
  ): Promise<LoginResponse & {isNewUser: boolean}> {
    if (!isFirebaseReady()) {
      throw new AppError(
        'Google sign-in is not configured on the server yet.',
        503,
      );
    }

    let decoded: any;
    try {
      decoded = await admin.auth().verifyIdToken(String(data.firebaseToken || ''));
    } catch {
      throw new AppError('Invalid Google sign-in token.', 401);
    }

    const firebaseUid = String(decoded.uid || '').trim();
    const email = String(decoded.email || '')
      .trim()
      .toLowerCase();
    const fullName =
      String(decoded.name || '').trim() ||
      (email.includes('@') ? email.split('@')[0] : 'Devotee');

    if (!firebaseUid || !email || !email.includes('@')) {
      throw new AppError('Google account must include a valid email.', 400);
    }

    let user =
      (await authRepository.findUserByFirebaseUid(firebaseUid)) ||
      (await authRepository.findUserByEmail(email));

    let isNewUser = false;

    if (!user) {
      // Create user with Google name, email, photo.
      // NO random phone numbers (mobileCountryCode & mobileNumber are null).
      // NO fake gender or fake DOB — devotee can fill them from Profile -> Personal Details anytime.
      const userId = await authRepository.createUser({
        firebaseUid,
        email,
        fullName,
        mobileCountryCode: null,
        mobileNumber: null,
        deviceType: data.deviceType === 'IOS' ? 'IOS' : 'ANDROID',
        deviceModel: data.deviceModel,
        deviceOs: data.deviceOs,
        appVersion: data.appVersion,
        firebaseToken: data.firebaseToken,
        profileCompleted: 0,
        profilePhoto: decoded.picture || null,
      });

      await authRepository.setAuthProvider(userId, 'google');
      user = await authRepository.findUserById(userId);
      if (!user) {
        throw new AppError('Unable to create Google account.', 500);
      }
      try {
        await this.setupNewUser(user);
      } catch (error) {
        console.warn('Google signup setup skipped:', error);
      }
      isNewUser = true;
    } else {
      if (String(user.firebaseUid || '') !== firebaseUid) {
        try {
          await authRepository.linkFirebaseUid(user.id, firebaseUid);
        } catch (error) {
          console.warn('Could not link Firebase UID:', error);
        }
      }
      if (user.mobileNumber && isPlaceholderMobile(firebaseUid, user.mobileNumber)) {
        user.mobileNumber = '';
        authRepository.clearPlaceholderMobile(user.id).catch(() => undefined);
      }
      await authRepository.updateLastLogin(
        user.id,
        data.firebaseToken,
        data.deviceModel,
        data.deviceOs,
        data.appVersion,
      );
      await authRepository.setAuthProvider(user.id, 'google');
      user = (await authRepository.findUserById(user.id)) as AuthUser;
    }

    return {
      token: issueToken(user),
      user,
      isNewUser,
    };
  }

  private async setupNewUser(user: AuthUser): Promise<void> {
    const {default: familyRepository} = await import(
      '../family/family.repository'
    );

    // Do not auto-create a Daily Japa / Om Namah Shivaya goal.
    // Home should stay empty until the devotee sets their own goal.

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
    firebaseToken?: string;
    firebaseUid?: string;
    authProvider?: string;
    provider?: string;
  }): Promise<LoginResponse & {isNewUser: boolean}> {
    const mobileCountryCode = normalizePhone(data.mobileCountryCode);
    const mobileNumber = normalizePhone(data.mobileNumber);
    const email = String(data.email || '').trim().toLowerCase();
    const fullName = String(data.fullName || '').trim();
    const isSocial = Boolean(
      data.firebaseToken ||
      data.firebaseUid ||
      data.authProvider === 'google' ||
      data.provider === 'google',
    );

    let passwordHash: string | null = null;
    if (!isSocial || data.password) {
      const password = assertPassword(String(data.password || ''));
      passwordHash = await hashPassword(password);
    }

    let firebaseUid = String(data.firebaseUid || '').trim();
    if (!firebaseUid && data.firebaseToken && isFirebaseReady()) {
      try {
        const decoded = await admin.auth().verifyIdToken(String(data.firebaseToken));
        if (decoded?.uid) {
          firebaseUid = decoded.uid;
        }
      } catch (error) {
        console.warn('Could not verify firebaseToken during register:', error);
      }
    }
    if (!firebaseUid) {
      firebaseUid = `email:${email}`;
    }

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
    const existingMobile =
      mobileNumber && !isPlaceholderMobile(null, mobileNumber)
        ? await authRepository.findUserByMobile(mobileCountryCode, mobileNumber)
        : null;

    if (!isSocial) {
      if (existingEmail && existingMobile) {
        throw new AppError(
          'An account with this email and mobile number already exists. Please sign in with your email and password, or use different details.',
          409,
        );
      }
      if (existingEmail) {
        throw new AppError(
          'This email is already registered. Please try another email or sign in with your password.',
          409,
        );
      }
      if (existingMobile) {
        throw new AppError(
          'This mobile number is already registered. Please try another mobile number or sign in with your account.',
          409,
        );
      }
    }

    if (existingEmail) {
      if (passwordHash) {
        await authRepository.setPasswordHash(existingEmail.id, passwordHash);
      }
      if (firebaseUid && String(existingEmail.firebaseUid || '') !== firebaseUid) {
        await authRepository.linkFirebaseUid(existingEmail.id, firebaseUid).catch(() => undefined);
      }
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
        passwordHash: passwordHash || undefined,
        firebaseUid,
        deviceType: data.deviceType ?? 'ANDROID',
        firebaseToken: data.firebaseToken,
      });
    } catch (error: any) {
      const message = String(error?.message || error?.sqlMessage || '');
      if (/firebase_uid|UNIQUE|email/i.test(message)) {
        const raced = await authRepository.findUserByEmail(email);
        if (raced) {
          throw new AppError(
            'An account with this email already exists. Please sign in with email and password.',
            409,
          );
        }
        // Soft-deleted row may still hold email:/phone unique keys — restore it.
        const deleted = await authRepository.findDeletedUserByEmail(email);
        if (deleted) {
          await authRepository.restoreUser(
            deleted.id,
            email,
            mobileCountryCode,
            mobileNumber,
          );
          if (passwordHash) {
            await authRepository.setPasswordHash(deleted.id, passwordHash);
          }
          await authRepository.completeProfile(
            deleted.id,
            profileFields({
              ...data,
              fullName: fullName || deleted.fullName,
              email,
            }),
          );
          const restored = await authRepository.findUserById(deleted.id);
          if (!restored) {
            throw new AppError('Could not restore your previous account.', 500);
          }
          return {
            token: issueToken(restored),
            user: restored,
            isNewUser: false,
          };
        }
        userId = await authRepository.createUser({
          mobileCountryCode,
          mobileNumber,
          email,
          fullName,
          passwordHash: passwordHash || undefined,
          firebaseUid: `usr:${randomUUID()}`,
          deviceType: data.deviceType ?? 'ANDROID',
          firebaseToken: data.firebaseToken,
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

    await emailOtpService.notifyAdmin(
      'New user registration',
      [
        'A new devotee registered on Japa Siddhi.',
        `Name: ${user.fullName || fullName || '-'}`,
        `Email: ${user.email || email}`,
        `Mobile: +${user.mobileCountryCode || mobileCountryCode}${user.mobileNumber || mobileNumber}`,
        `User ID: ${user.id}`,
      ].join('\n'),
    );

    return {
      token: issueToken(user),
      user,
      isNewUser: true,
    };
  }

  async passwordLogin(data: {
    email?: string;
    password?: string;
    identifier?: string;
    mobileCountryCode?: string;
    mobileNumber?: string;
    appVersion?: string;
  }): Promise<LoginResponse> {
    const password = String(data.password || '');
    if (!password) {
      throw new AppError('Enter your password', 400);
    }

    const identifier = String(
      data.identifier || data.email || data.mobileNumber || '',
    ).trim();
    if (!identifier) {
      throw new AppError('Enter your email or mobile number', 400);
    }

    let user: AuthUser | null = null;
    let wasDeleted = false;
    let restoreEmail: string | null = null;
    let restoreCountry = '91';
    let restoreMobile = '';

    if (identifier.includes('@')) {
      const email = identifier.toLowerCase();
      if (!email.includes('@') || email.indexOf('@') < 1) {
        throw new AppError('Enter a valid email address', 400);
      }
      user = await authRepository.findUserByEmail(email);
      if (!user) {
        user = await authRepository.findDeletedUserByEmail(email);
        if (user) {
          wasDeleted = true;
          restoreEmail = email;
          restoreCountry =
            normalizePhone(user.mobileCountryCode || '') || '91';
          restoreMobile = normalizePhone(
            authRepository.parseAnonymizedValue(user.mobileNumber, user.id),
          );
        }
      }
    } else {
      const digits = normalizePhone(identifier);
      const country =
        normalizePhone(data.mobileCountryCode || '') ||
        (digits.length > 10 ? digits.slice(0, digits.length - 10) : '91') ||
        '91';
      const mobile =
        digits.length > 10 ? digits.slice(-10) : digits;
      if (mobile.length < 8) {
        throw new AppError('Enter a valid mobile number', 400);
      }
      restoreCountry = country;
      restoreMobile = mobile;
      user = await authRepository.findUserByMobile(country, mobile);
      if (!user) {
        user = await authRepository.findDeletedUserByMobile(country, mobile);
        if (user) {
          wasDeleted = true;
          const originalEmail = authRepository.parseAnonymizedValue(
            user.email,
            user.id,
          );
          restoreEmail =
            originalEmail && originalEmail.includes('@')
              ? originalEmail.toLowerCase()
              : null;
        }
      }
    }

    if (!user) {
      throw new AppError(
        'No account found for this email or mobile number.',
        404,
      );
    }

    const passwordHash = await authRepository.getPasswordHashByUserId(user.id);
    if (!passwordHash) {
      throw new AppError(
        'No password is set for this account. Use Forgot password to set one.',
        401,
      );
    }

    const ok = await bcryptCompare(password, passwordHash);
    if (!ok) {
      throw new AppError('Invalid email/number or password.', 401);
    }

    if (wasDeleted) {
      await authRepository.restoreUser(
        user.id,
        restoreEmail,
        restoreCountry || normalizePhone(user.mobileCountryCode || '') || '91',
        restoreMobile ||
          normalizePhone(
            authRepository.parseAnonymizedValue(user.mobileNumber, user.id),
          ),
      );
    }

    await authRepository.updateLastLogin(
      user.id,
      undefined,
      undefined,
      undefined,
      data.appVersion,
    );
    const freshUser = (await authRepository.findUserById(user.id)) as AuthUser;
    return {
      token: issueToken(freshUser),
      user: freshUser,
    };
  }

  async sendForgotPasswordOtp(data: {
    email?: string;
    identifier?: string;
    mobileCountryCode?: string;
  }) {
    const identifier = String(data.identifier || data.email || '').trim();
    if (!identifier) {
      throw new AppError('Enter your email or mobile number', 400);
    }

    let user: AuthUser | null = null;
    let wasDeleted = false;
    let restoreEmail: string | null = null;
    let restoreCountry = '91';
    let restoreMobile = '';

    if (identifier.includes('@')) {
      const email = identifier.toLowerCase();
      user = await authRepository.findUserByEmail(email);
      if (!user) {
        user = await authRepository.findDeletedUserByEmail(email);
        if (user) {
          wasDeleted = true;
          restoreEmail = email;
          restoreCountry =
            normalizePhone(user.mobileCountryCode || '') || '91';
          restoreMobile = normalizePhone(
            authRepository.parseAnonymizedValue(user.mobileNumber, user.id),
          );
        }
      }
    } else {
      const digits = normalizePhone(identifier);
      const country =
        normalizePhone(data.mobileCountryCode || '') ||
        (digits.length > 10 ? digits.slice(0, digits.length - 10) : '91') ||
        '91';
      const mobile = digits.length > 10 ? digits.slice(-10) : digits;
      if (mobile.length < 8) {
        throw new AppError('Enter a valid mobile number', 400);
      }
      restoreCountry = country;
      restoreMobile = mobile;
      user = await authRepository.findUserByMobile(country, mobile);
      if (!user) {
        user = await authRepository.findDeletedUserByMobile(country, mobile);
        if (user) {
          wasDeleted = true;
          const originalEmail = authRepository.parseAnonymizedValue(
            user.email,
            user.id,
          );
          restoreEmail =
            originalEmail && originalEmail.includes('@')
              ? originalEmail.toLowerCase()
              : null;
        }
      }
    }

    if (!user) {
      throw new AppError(
        'No account found for this email or mobile number.',
        404,
      );
    }

    // Soft-deleted accounts can reset password after we restore contact fields.
    if (wasDeleted) {
      await authRepository.restoreUser(
        user.id,
        restoreEmail,
        restoreCountry || normalizePhone(user.mobileCountryCode || '') || '91',
        restoreMobile ||
          normalizePhone(
            authRepository.parseAnonymizedValue(user.mobileNumber, user.id),
          ),
      );
      user = (await authRepository.findUserById(user.id)) as AuthUser;
    }

    if (!user?.email || !String(user.email).includes('@')) {
      throw new AppError(
        'No account with a registered email was found for this login.',
        404,
      );
    }

    const destinationEmail = String(user.email).trim().toLowerCase();
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
      mobileCountryCode: normalizePhone(user.mobileCountryCode || '') || '91',
      mobileNumber: normalizePhone(user.mobileNumber || '') || '0000000000',
      email: destinationEmail,
      codeHash: emailOtpService.hashOtp(otp),
      expiresAt: Date.now() + environment.OTP_EXPIRES_SECONDS * 1000,
    });

    return {
      sent: true,
      sentTo: emailOtpService.maskEmail(destinationEmail),
      email: destinationEmail,
      expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
    };
  }

  async resetForgotPassword(data: {
    email?: string;
    otp?: string;
    newPassword?: string;
  }) {
    const email = String(data.email || '').trim().toLowerCase();
    const code = String(data.otp || '').trim();
    const password = String(data.newPassword || '');

    if (!email || !email.includes('@')) {
      throw new AppError('Email is required to reset password.', 400);
    }
    if (code.length !== 4) {
      throw new AppError('Enter the 4-digit OTP.', 400);
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters.', 400);
    }

    let user = await authRepository.findUserByEmail(email);
    if (!user) {
      user = await authRepository.findDeletedUserByEmail(email);
      if (user) {
        const mobile = normalizePhone(
          authRepository.parseAnonymizedValue(user.mobileNumber, user.id),
        );
        const country =
          normalizePhone(user.mobileCountryCode || '') || '91';
        await authRepository.restoreUser(user.id, email, country, mobile);
        user = await authRepository.findUserByEmail(email);
      }
    }
    if (!user) {
      throw new AppError('No account found for this email.', 404);
    }

    const stored = await otpRepository.findActiveByEmail(email);
    if (!stored || Number(stored.expiresAt) < Date.now()) {
      throw new AppError('Invalid or expired OTP.', 401);
    }
    if (Number(stored.attempts) >= environment.OTP_MAX_ATTEMPTS) {
      await otpRepository.deleteByEmail(email);
      throw new AppError('Too many incorrect attempts. Request a new OTP.', 401);
    }

    const valid = emailOtpService.matches(code, stored.codeHash);
    if (!valid) {
      await otpRepository.incrementAttempts(stored.id);
      throw new AppError('Invalid or expired OTP.', 401);
    }

    await otpRepository.deleteByEmail(email);
    const passwordHash = await hashPassword(password);
    await authRepository.setPasswordHash(user.id, passwordHash);

    return {success: true, email};
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

    // Never let one devotee's profile take over another devotee's email.
    const nextEmail = String(data.email || '').trim().toLowerCase();
    const currentEmail = String(user.email || '').trim().toLowerCase();
    if (nextEmail && nextEmail !== currentEmail) {
      const owner = await authRepository.findUserByEmail(nextEmail);
      if (owner && Number(owner.id) !== Number(userId)) {
        throw new AppError(
          'That email already belongs to another account.',
          409,
        );
      }
    }

    await authRepository.completeProfile(userId, profileFields(data));

    const rawPhone = String(
      (data as any).phoneNumber || (data as any).mobileNumber || '',
    ).replace(/\D/g, '');
    const mobile =
      rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
    const country =
      String((data as any).mobileCountryCode || '').replace(/\D/g, '') ||
      (rawPhone.length > 10 ? rawPhone.slice(0, rawPhone.length - 10) : '91');
    if (mobile.length >= 6 && !/^0+$/.test(mobile)) {
      await authRepository.updateMobileIfChanged(userId, country, mobile);
    }

  }



  private maskPhone(countryCode: string, mobileNumber: string): string {
    const digits = String(mobileNumber || '').replace(/\D/g, '');
    if (digits.length < 4) {
      return `+${countryCode}****`;
    }
    return `+${countryCode}******${digits.slice(-4)}`;
  }

  async sendOtp(data: {
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    mode?: 'register' | 'login';
    channel?: 'email' | 'phone';
  }) {
    const mode = data.mode === 'login' ? 'login' : 'register';
    const channel =
      data.channel === 'phone'
        ? 'phone'
        : data.channel === 'email'
          ? 'email'
          : mode === 'login' && !String(data.email || '').includes('@')
            ? 'phone'
            : 'email';

    if (mode === 'login') {
      return this.sendLoginOtp({...data, channel});
    }

    const destinationEmail = String(data.email || '').trim().toLowerCase();
    if (!destinationEmail || !destinationEmail.includes('@')) {
      throw new AppError(
        'Enter the email address for your account.',
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

    const existingByEmail = await authRepository.findUserByEmail(destinationEmail);
    const existingByMobile =
      mobileNumber && !isPlaceholderMobile(null, mobileNumber)
        ? await authRepository.findUserByMobile(mobileCountryCode, mobileNumber)
        : null;

    if (existingByEmail && existingByMobile) {
      throw new AppError(
        'An account with this email and mobile number already exists. Please sign in with your email and password, or use different details.',
        409,
      );
    }
    if (existingByEmail) {
      throw new AppError(
        'This email is already registered. Please try another email or sign in with your password.',
        409,
      );
    }
    if (existingByMobile) {
      throw new AppError(
        'This mobile number is already registered. Please try another mobile number or sign in with your account.',
        409,
      );
    }

    // Phone OTP is sent by Firebase on the app — email OTP stays on the backend.
    // Different channels never share the same code.
    if (channel === 'phone') {
      if (!isPhoneOtpEnabled()) {
        return phoneOtpComingSoon('register', mobileCountryCode, mobileNumber);
      }
      return {
        sent: true,
        provider: 'firebase' as const,
        sentTo: this.maskPhone(mobileCountryCode, mobileNumber),
        expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
        mobileCountryCode,
        mobileNumber,
        email: destinationEmail,
        channel: 'phone' as const,
        mode: 'register' as const,
      };
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
      channel: 'email',
      codeHash: emailOtpService.hashOtp(otp),
      expiresAt: Date.now() + environment.OTP_EXPIRES_SECONDS * 1000,
    });

    return {
      sent: true,
      provider: 'email' as const,
      sentTo: emailOtpService.maskEmail(destinationEmail),
      expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
      mobileCountryCode,
      mobileNumber,
      email: destinationEmail,
      channel: 'email' as const,
      mode: 'register' as const,
    };
  }

  private async sendLoginOtp(data: {
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    channel: 'email' | 'phone';
  }) {
    if (data.channel === 'phone') {
      const mobileCountryCode =
        normalizePhone(data.mobileCountryCode || '') || '91';
      const mobileNumber = normalizePhone(data.mobileNumber || '');
      if (mobileNumber.length < 6 || /^0+$/.test(mobileNumber)) {
        throw new AppError('Enter a valid mobile number.', 400);
      }

      const user = await authRepository.findUserByMobile(
        mobileCountryCode,
        mobileNumber,
      );
      if (!user) {
        throw new AppError('No account found for this mobile number.', 404);
      }

      // App sends SMS via Firebase Auth; backend only checks the account exists.
      if (!isPhoneOtpEnabled()) {
        return phoneOtpComingSoon('login', mobileCountryCode, mobileNumber);
      }
      return {
        sent: true,
        provider: 'firebase' as const,
        sentTo: this.maskPhone(mobileCountryCode, mobileNumber),
        expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
        mobileCountryCode,
        mobileNumber,
        channel: 'phone' as const,
        mode: 'login' as const,
      };
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const codeHash = emailOtpService.hashOtp(otp);
    const expiresAt = Date.now() + environment.OTP_EXPIRES_SECONDS * 1000;

    const destinationEmail = String(data.email || '').trim().toLowerCase();
    if (!destinationEmail || !destinationEmail.includes('@')) {
      throw new AppError('Enter a valid email address.', 400);
    }

    const user = await authRepository.findUserByEmail(destinationEmail);
    if (!user) {
      throw new AppError('No account found for this email.', 404);
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

    await emailOtpService.sendOtp(destinationEmail, otp);
    await otpRepository.save({
      mobileCountryCode: normalizePhone(user.mobileCountryCode || '') || '91',
      mobileNumber:
        normalizePhone(user.mobileNumber || '') || '0000000000',
      email: destinationEmail,
      channel: 'email',
      codeHash,
      expiresAt,
    });

    return {
      sent: true,
      provider: 'email' as const,
      sentTo: emailOtpService.maskEmail(destinationEmail),
      email: destinationEmail,
      expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
      channel: 'email' as const,
      mode: 'login' as const,
    };
  }

  private async parseFirebasePhoneToken(firebaseToken: string): Promise<{
    firebaseUid: string;
    mobileCountryCode: string;
    mobileNumber: string;
    e164: string;
  }> {
    if (!isFirebaseReady()) {
      throw new AppError(
        'Phone OTP is unavailable. Firebase is not configured on the server.',
        503,
      );
    }
    let decoded: any;
    try {
      decoded = await admin.auth().verifyIdToken(String(firebaseToken || ''));
    } catch {
      throw new AppError('Invalid Firebase token.', 401);
    }
    const firebaseUid = String(decoded.uid || '').trim();
    const e164 = String(decoded.phone_number || '').trim();
    if (!firebaseUid || !e164.startsWith('+')) {
      throw new AppError('Phone number not found from Firebase.', 400);
    }
    const digits = e164.replace(/\D/g, '');
    // India default: last 10 digits are the mobile, rest is country code.
    const mobileNumber =
      digits.length > 10 ? digits.slice(-10) : digits;
    const mobileCountryCode =
      digits.length > 10 ? digits.slice(0, digits.length - 10) : '91';
    if (mobileNumber.length < 6) {
      throw new AppError('Phone number not found from Firebase.', 400);
    }
    return {firebaseUid, mobileCountryCode, mobileNumber, e164};
  }

  async verifyOtp(data: {
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    otp?: string;
    firebaseToken?: string;
    mode?: 'register' | 'login';
    channel?: 'email' | 'phone';
  }) {
    const mode = data.mode === 'login' ? 'login' : 'register';
    const channel =
      data.channel === 'phone' || data.firebaseToken
        ? 'phone'
        : data.channel === 'email'
          ? 'email'
          : mode === 'login' && !String(data.email || '').includes('@')
            ? 'phone'
            : 'email';
    const otp = String(data.otp || '').trim();

    if (mode === 'login') {
      return this.verifyLoginOtp({...data, channel, otp});
    }

    if (channel === 'phone') {
      return this.verifyRegisterPhoneFirebase(data);
    }

    const email = String(data.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      throw new AppError('Email is required to verify OTP.', 400);
    }

    if (otp.length !== 4) {
      throw new AppError('Enter the 4-digit OTP.', 400);
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

    const existingUserByEmail = await authRepository.findUserByEmail(email);
    const existingUserByMobile =
      mobileNumber && !isPlaceholderMobile(null, mobileNumber)
        ? await authRepository.findUserByMobile(mobileCountryCode, mobileNumber)
        : null;

    if (existingUserByEmail && existingUserByMobile) {
      throw new AppError(
        'An account with this email and mobile number already exists. Please sign in with your email and password, or use different details.',
        409,
      );
    }
    if (existingUserByEmail) {
      throw new AppError(
        'This email is already registered. Please try another email or sign in with your password.',
        409,
      );
    }
    if (existingUserByMobile) {
      throw new AppError(
        'This mobile number is already registered. Please try another mobile number or sign in with your account.',
        409,
      );
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
      channel: 'email' as const,
      mode: 'register' as const,
    };
  }

  private async verifyRegisterPhoneFirebase(data: {
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    firebaseToken?: string;
  }) {
    const email = String(data.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new AppError('Email is required to create your account.', 400);
    }
    const expectedCc = normalizePhone(data.mobileCountryCode || '') || '91';
    const expectedMobile = normalizePhone(data.mobileNumber || '');
    if (!expectedMobile || /^0+$/.test(expectedMobile)) {
      throw new AppError('Enter a valid mobile number to create your account.', 400);
    }

    const {firebaseUid, mobileCountryCode, mobileNumber} =
      await this.parseFirebasePhoneToken(String(data.firebaseToken || ''));

    if (mobileCountryCode !== expectedCc || mobileNumber !== expectedMobile) {
      throw new AppError(
        'Verified phone does not match the number used to create this account.',
        401,
      );
    }

    const existingUserByEmail = await authRepository.findUserByEmail(email);
    const existingUserByMobile = await authRepository.findUserByMobile(
      mobileCountryCode,
      mobileNumber,
    );
    if (existingUserByEmail || existingUserByMobile) {
      throw new AppError(
        'This email or mobile number is already registered. Please sign in.',
        409,
      );
    }

    return {
      verified: true,
      isNewUser: true,
      token: null,
      user: null,
      email,
      mobileCountryCode,
      mobileNumber,
      firebaseUid,
      channel: 'phone' as const,
      mode: 'register' as const,
    };
  }

  private async verifyLoginOtp(data: {
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    otp: string;
    firebaseToken?: string;
    channel: 'email' | 'phone';
  }) {
    if (data.channel === 'phone') {
      return this.verifyLoginPhoneFirebase(data);
    }

    const otp = String(data.otp || '').trim();
    if (otp.length !== 4) {
      throw new AppError('Enter the 4-digit OTP.', 400);
    }

    const email = String(data.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new AppError('Email is required to verify OTP.', 400);
    }

    const stored = await otpRepository.findActiveByEmail(email);
    const user = await authRepository.findUserByEmail(email);

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

    if (!user) {
      throw new AppError('No account found for this login.', 404);
    }

    await authRepository.updateLastLogin(user.id);
    const freshUser = (await authRepository.findUserById(user.id)) as AuthUser;
    return {
      verified: true,
      isNewUser: false,
      token: issueToken(freshUser),
      user: freshUser,
      channel: 'email' as const,
      mode: 'login' as const,
    };
  }

  private async verifyLoginPhoneFirebase(data: {
    mobileCountryCode?: string;
    mobileNumber?: string;
    firebaseToken?: string;
  }) {
    const {firebaseUid, mobileCountryCode, mobileNumber} =
      await this.parseFirebasePhoneToken(String(data.firebaseToken || ''));

    const expectedCc = normalizePhone(data.mobileCountryCode || '') || mobileCountryCode;
    const expectedMobile = normalizePhone(data.mobileNumber || '') || mobileNumber;
    if (
      expectedMobile &&
      (expectedCc !== mobileCountryCode || expectedMobile !== mobileNumber)
    ) {
      throw new AppError('Verified phone does not match the login number.', 401);
    }

    let user =
      (await authRepository.findUserByMobile(mobileCountryCode, mobileNumber)) ||
      (await authRepository.findUserByFirebaseUid(firebaseUid));

    if (!user) {
      throw new AppError('No account found for this mobile number.', 404);
    }

    if (String(user.firebaseUid || '') !== firebaseUid) {
      await authRepository.linkFirebaseUid(user.id, firebaseUid).catch(() => undefined);
    }

    await authRepository.updateLastLogin(user.id, data.firebaseToken);
    const freshUser = (await authRepository.findUserById(user.id)) as AuthUser;
    return {
      verified: true,
      isNewUser: false,
      token: issueToken(freshUser),
      user: freshUser,
      channel: 'phone' as const,
      mode: 'login' as const,
    };
  }

  async getProfile(
    userId: number,
  ): Promise<AuthUser> {


    await authRepository.ensureAuthProviderColumn();
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

  /**
   * Hands back a fresh token for a signature-valid one, even if it has already
   * lapsed. Devotees stay signed in until they tap Logout; only a tampered
   * token, a very old one, or a closed account has to log in again.
   */
  async refreshSession(token: string): Promise<LoginResponse> {
    const raw = String(token || '').trim();
    if (!raw) {
      throw new AppError('Authorization token missing.', 401);
    }

    let decoded: any;
    try {
      decoded = jwtService.verifyIgnoringExpiry(raw);
    } catch {
      throw new AppError('Invalid token.', 401);
    }

    if (!decoded || typeof decoded === 'string') {
      throw new AppError('Invalid token.', 401);
    }

    const expiredAtMs = Number(decoded.exp || 0) * 1000;
    const graceMs =
      Constants.TOKEN_REFRESH_GRACE_DAYS * 24 * 60 * 60 * 1000;
    if (expiredAtMs && Date.now() - expiredAtMs > graceMs) {
      throw new AppError('Session expired. Please login again.', 401);
    }

    const userId = Number(decoded.id);
    if (!userId) {
      throw new AppError('Invalid token.', 401);
    }

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    return {
      token: issueToken(user),
      user,
    };
  }

  latestAppRelease() {
    return {
      latestVersion: environment.LATEST_APP_VERSION || '1.1.3',
    };
  }

  async recordAppVersion(userId: number, appVersion?: string) {
    await authRepository.saveAppVersion(userId, String(appVersion || ''));
    return {saved: true};
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