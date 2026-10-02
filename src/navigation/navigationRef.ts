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

export const navigateTo = (name: keyof RootStackParamList, params?: any) => {
  const doNavigate = () => {
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate(name, params);
      return true;
    }
    return false;
  };

  if (doNavigate()) {
    return;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (doNavigate() || attempts > 25) {
      clearInterval(timer);
    }
  }, 200);
};

export const navigateToNotifications = () => {
  navigateTo('Notifications');
};
