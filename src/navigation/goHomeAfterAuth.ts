import {CommonActions} from '@react-navigation/native';

/** Mobile and date of birth are required before Home. */
export const profileNeedsDetails = (user: any) => {
  const mobile = String(
    user?.mobileNumber || user?.mobile_number || '',
  ).replace(/\D/g, '');
  const dob = String(
    user?.dateOfBirth || user?.date_of_birth || user?.dob || '',
  ).slice(0, 10);
  const mobileMissing = mobile.length < 6 || /^0+$/.test(mobile);
  const dobMissing = !/^\d{4}-\d{2}-\d{2}$/.test(dob);
  return mobileMissing || dobMissing;
};

/** Google and Facebook land on profile details until mobile and DOB are saved. */
export const resetAfterSocialAuth = (navigation: any, user?: any) => {
  if (profileNeedsDetails(user)) {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'CompleteProfile',
            params: {
              email: user?.email || '',
              fullName: user?.fullName || user?.full_name || '',
              mobileCountryCode:
                user?.mobileCountryCode || user?.mobile_country_code || '',
              mobileNumber: user?.mobileNumber || user?.mobile_number || '',
              authProvider: 'google',
              isGoogleSignup: true,
            },
          },
        ],
      }),
    );
    return;
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
