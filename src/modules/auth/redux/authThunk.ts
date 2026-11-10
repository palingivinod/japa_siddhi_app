import { createAsyncThunk } from '@reduxjs/toolkit';

import firebaseAuthService from '../services/firebaseAuthService';
import authApi from '../services/authApi';

import storageService from '../../../services/storageService';
import { STORAGE_KEYS } from '../../../services/storageKeys';
import {getAppVersionName} from '../../../utils/appVersion';

export const sendOTPThunk = createAsyncThunk(
  'auth/sendOTP',

  async (phoneNumber: string, { rejectWithValue }) => {
    try {
      const response =
        await firebaseAuthService.sendOTP(phoneNumber);

      if (!response.success) {
        return rejectWithValue(response.message);
      }

      return {
        phoneNumber,
        confirmation: response.confirmation!,
      };
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to send OTP.',
      );
    }
  },
);

export const verifyOTPThunk = createAsyncThunk(
  'auth/verifyOTP',

  async (
    {
      confirmation,
      otp,
    }: {
      confirmation: any;
      otp: string;
    },
    { rejectWithValue },
  ) => {
    try {
      // Step 1 - Verify OTP with Firebase
      const firebaseResponse =
        await firebaseAuthService.verifyOTP(
          confirmation,
          otp,
        );

      if (!firebaseResponse.success) {
        return rejectWithValue(
          firebaseResponse.message,
        );
      }

      // Step 2 - Login to Backend
      const backendResponse =
        await authApi.login({
          firebaseToken:
            firebaseResponse.idToken!,
          deviceType: 'ANDROID',
          deviceModel: '',
          deviceOs: '',
          appVersion: getAppVersionName(),
        });

      // Step 3 - Save Session
      await storageService.setItem(
        STORAGE_KEYS.JWT_TOKEN,
        backendResponse.data.token,
      );

      await storageService.setItem(
        STORAGE_KEYS.USER,
        backendResponse.data.user,
      );

      await storageService.setItem(
        STORAGE_KEYS.FIREBASE_TOKEN,
        firebaseResponse.idToken,
      );

      return {
        firebaseToken:
          firebaseResponse.idToken!,
        jwtToken:
          backendResponse.data.token,
        user:
          backendResponse.data.user,
      };
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          'Login failed.',
      );
    }
  },
);