import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const resetToLogin = () => {
  const goToLogin = () => {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{name: 'Login', params: {forceLoginForm: true}}],
      });
      return true;
    }
    return false;
  };

  if (goToLogin()) {
    return;
  }

  setTimeout(goToLogin, 0);
};
