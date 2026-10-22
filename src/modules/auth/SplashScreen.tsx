import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CommonActions} from '@react-navigation/native';

import {RootStackParamList} from '../../navigation/AppNavigator';
import Colors from '../../theme/colors';
import {getLanguage} from '../../services/language';
import {getValidSession, saveSession} from '../../services/session';
import apiService from '../../services/apiService';
import {
  isSocialLoginUser,
  profileNeedsDetails,
  promptSocialDetails,
} from '../../navigation/goHomeAfterAuth';
import {useLanguage} from '../../i18n/LanguageContext';
import {useBottomNavPad} from '../../utils/safeArea';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SRI_URJITH_SITE = 'https://www.sriurjith.com/';
const DEVELOPED_BY = 'Developed by Sri Urjith Services Pvt Ltd';

const SplashScreen = ({navigation}: Props) => {
  const {t} = useLanguage();
  const [busy, setBusy] = useState(false);
  const {width, height} = useWindowDimensions();
  // Keep welcome art above the system nav bar on gesture/3-button phones.
  const bottomPad = useBottomNavPad();
  const stageHeight = Math.max(1, height - bottomPad);

  // GET STARTED sits in the lower band of the artwork (above footer).
  const hitStyle = useMemo(
    () => ({
      left: Math.max(16, width * 0.08),
      right: Math.max(16, width * 0.08),
      top: stageHeight * 0.66,
      bottom: Math.max(48, stageHeight * 0.08),
    }),
    [width, stageHeight],
  );

  // Invisible tap target over the baked "Developed by..." footer line.
  const creditStyle = useMemo(
    () => ({
      left: Math.max(12, width * 0.06),
      right: Math.max(12, width * 0.06),
      bottom: Math.max(8, stageHeight * 0.02),
      height: Math.max(30, stageHeight * 0.045),
    }),
    [width, stageHeight],
  );

  const openSriUrjith = useCallback(async () => {
    try {
      await Linking.openURL(SRI_URJITH_SITE);
    } catch {
      // Ignore — welcome flow must stay usable if the browser fails.
    }
  }, []);

  const getStarted = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const savedLanguage = await getLanguage();
      if (savedLanguage) {
        const session = await getValidSession();
        if (session.token) {
          let user = session.user;
          try {
            const profileResponse = await apiService.get('/auth/profile');
            const profile = profileResponse.data?.data;
            if (profile) {
              user = {
                ...user,
                ...profile,
                authProvider:
                  profile.authProvider ||
                  profile.auth_provider ||
                  user?.authProvider ||
                  user?.provider,
              };
              await saveSession(session.token, user);
            }
          } catch {
            // Use the stored profile if the refresh fails.
          }
          if (isSocialLoginUser(user) && profileNeedsDetails(user)) {
            promptSocialDetails(navigation, user, {
              title: t('socialDetailsTitle'),
              message: t('socialDetailsMessage'),
              ok: t('ok'),
            });
            return;
          }
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{name: 'Home'}],
            }),
          );
          return;
        }
        navigation.replace('Login');
        return;
      }
      navigation.replace('LanguageSelect');
    } catch {
      navigation.replace('LanguageSelect');
    } finally {
      setBusy(false);
    }
  }, [busy, navigation, t]);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={[styles.stage, {bottom: bottomPad}]}>
        <Image
          source={require('../../assets/images/splash_welcome.png')}
          style={styles.hero}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={[styles.creditHit, creditStyle]}
          onPress={openSriUrjith}
          activeOpacity={0.85}
          accessibilityRole="link"
          accessibilityLabel={DEVELOPED_BY}
        />
        <TouchableOpacity
          style={[styles.hit, hitStyle]}
          onPress={getStarted}
          activeOpacity={0.85}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Get started"
        />
        {busy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={Colors.templeGold} />
          </View>
        ) : null}
      </View>
      <View style={[styles.navSpacer, {height: bottomPad}]} />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F0E4',
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  navSpacer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F7F0E4',
  },
  hero: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  hit: {
    position: 'absolute',
    zIndex: 2,
  },
  creditHit: {
    position: 'absolute',
    zIndex: 3,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,234,0.35)',
  },
});
