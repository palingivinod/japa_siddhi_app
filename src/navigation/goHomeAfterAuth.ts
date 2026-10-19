import {CommonActions} from '@react-navigation/native';

/** After login/signup always open Home (no auto intro video). */
export const resetToHomeAfterAuth = async (navigation: any) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{name: 'Home'}],
    }),
  );
};
