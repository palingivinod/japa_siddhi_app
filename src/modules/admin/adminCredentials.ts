import apiService, {getApiError} from '../../services/apiService';

export const DEFAULT_ADMIN_EMAIL = 'kailaasavaasi@gmail.com';

export type AdminAccount = {
  id: number;
  email: string;
  fullName: string;
  isActive?: boolean;
  createdAt?: string;
};

export const verifyAdminCredentials = async (
  email: string,
  password: string,
) => {
  const response = await apiService.post('/admin/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });
  return response.data?.data as {
    id: number;
    email: string;
    fullName: string;
  };
};

export const sendAdminForgotOtp = async (email: string) => {
  const response = await apiService.post('/admin/auth/forgot/send-otp', {
    email: email.trim().toLowerCase(),
  });
  return response.data?.data as {
    sent: boolean;
    sentTo: string;
    expiresInSeconds: number;
  };
};

export const resetAdminPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const response = await apiService.post('/admin/auth/forgot/reset', {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
    newPassword,
  });
  return response.data?.data;
};

export const listAdminAccounts = async () => {
  const response = await apiService.get('/admin/auth/accounts');
  return (response.data?.data || []) as AdminAccount[];
};

export const addAdminAccount = async (data: {
  email: string;
  password: string;
  fullName?: string;
}) => {
  const response = await apiService.post('/admin/auth/accounts', {
    email: data.email.trim().toLowerCase(),
    password: data.password,
    fullName: data.fullName?.trim() || undefined,
  });
  return response.data?.data as AdminAccount;
};

export {getApiError};
