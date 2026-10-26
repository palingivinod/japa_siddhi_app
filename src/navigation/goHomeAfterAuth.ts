import {Alert} from 'react-native';
import {CommonActions} from '@react-navigation/native';

/** Google and Facebook accounts. Mobile, date of birth, and PIN code are required before Home. */
export const isSocialLoginUser = (user: any) => {
  const provider = String(
    user?.authProvider ||
      user?.auth_provider ||
      user?.provider ||
      '',
  ).toLowerCase();
  return provider === 'google' || provider === 'facebook';
};

/** Mobile, date of birth, or PIN code is still empty. */
export const profileNeedsDetails = (user: any) => {
  const mobile = String(
    user?.mobileNumber || user?.mobile_number || '',
  ).replace(/\D/g, '');
  const dob = String(
    user?.dateOfBirth || user?.date_of_birth || user?.dob || '',
  ).slice(0, 10);
  const pin = String(
    user?.postalCode || user?.postal_code || user?.pinCode || '',
  ).replace(/\D/g, '');
  const mobileMissing = mobile.length < 6 || /^0+$/.test(mobile);
  const dobMissing = !/^\d{4}-\d{2}-\d{2}$/.test(dob);
  const pinMissing = pin.length !== 6;
  return mobileMissing || dobMissing || pinMissing;
};

const socialProvider = (user: any) => {
  const provider = String(
    user?.authProvider || user?.auth_provider || user?.provider || 'google',
  ).toLowerCase();
  return provider === 'facebook' ? 'facebook' : 'google';
};

const openSocialDetailsForm = (navigation: any, user?: any) => {
  const provider = socialProvider(user);
  navigation.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [
        {name: 'Home'},
        {
          name: 'CompleteProfile',
          params: {
            email: user?.email || '',
            fullName: user?.fullName || user?.full_name || '',
            mobileCountryCode:
              user?.mobileCountryCode || user?.mobile_country_code || '',
            mobileNumber: user?.mobileNumber || user?.mobile_number || '',
            authProvider: provider,
            isGoogleSignup: provider === 'google',
          },
        },
      ],
    }),
  );
};

/**
 * Google and Facebook only. If mobile, date of birth, or PIN code is missing,
 * the devotee must enter them. OK opens the details form. Saved details skip the popup.
 */
export const promptSocialDetails = (
  navigation: any,
  user: any,
  copy: {title: string; message: string; ok: string},
) => {
  if (!isSocialLoginUser(user) || !profileNeedsDetails(user)) {
    return resetToHomeAfterAuth(navigation);
  }
  Alert.alert(
    copy.title,
    copy.message,
    [
      {
        text: copy.ok,
        onPress: () => openSocialDetailsForm(navigation, user),
      },
    ],
    {cancelable: false},
  );
};

/** After Google or Facebook sign-in, prompt when mobile, date of birth, or PIN code is missing. */
export const resetAfterSocialAuth = (
  navigation: any,
  user?: any,
  copy?: {title: string; message: string; ok: string},
) => {
  if (isSocialLoginUser(user) && profileNeedsDetails(user)) {
    return promptSocialDetails(navigation, user, {
      title: copy?.title || 'Your details',
      message:
        copy?.message ||
        'Please enter your mobile, date of birth, and PIN code.',
      ok: copy?.ok || 'OK',
    });
  }
  return resetToHomeAfterAuth(navigation);
};

/** After login/signup always open Home (no auto intro video). */
export const resetToHomeAfterAuth = async (navigation: any) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{name: 'Home'}],
    }),
  );
};
