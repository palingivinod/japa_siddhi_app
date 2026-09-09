import {resetAuthGate} from '../modules/common/AuthGate';
import {resetAdminAuthGate} from '../modules/admin/AdminAuthGate';
import {clearAdminSession} from '../modules/admin/adminSession';
import {resetToLogin} from '../navigation/navigationRef';
import {clearSession} from './session';

export const logoutToLogin = async (navigation?: any) => {
  try {
    resetAuthGate();
    resetAdminAuthGate();
    await clearSession();
    await clearAdminSession();
  } catch (error) {
    console.log('Logout session clear failed', error);
  }

  try {
    const {store} = require('../redux/store');
    const {clearHomeData} = require('../modules/home/redux/homeSlice');
    const {logout} = require('../modules/auth/redux/authSlice');
    store.dispatch(clearHomeData());
    store.dispatch(logout());
  } catch (error) {
    console.log('Logout store reset failed', error);
  }

  resetToLogin();

  try {
    navigation?.reset?.({
      index: 0,
      routes: [{name: 'Login', params: {forceLoginForm: true}}],
    });
  } catch (error) {
    console.log('Logout navigation reset failed', error);
  }
};
