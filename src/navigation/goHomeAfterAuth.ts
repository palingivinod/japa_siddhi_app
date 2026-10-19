import {CommonActions} from '@react-navigation/native';

import {homeOrFirstIntroRoute} from '../services/introVideos';

/** Reset stack to first-time intro (once) or Home. */
export const resetToHomeAfterAuth = async (navigation: any) => {
  const route = await homeOrFirstIntroRoute();
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [route],
    }),
  );
};
