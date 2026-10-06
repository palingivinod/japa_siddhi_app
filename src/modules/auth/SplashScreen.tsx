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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CommonActions} from '@react-navigation/native';

import {RootStackParamList} from '../../navigation/AppNavigator';
import Colors from '../../theme/colors';
import {getLanguage} from '../../services/language';
import {getValidSession} from '../../services/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SRI_URJITH_SITE = 'https://www.sriurjith.com/';
const DEVELOPED_BY = 'Developed by Sri Urjith Services Pvt Ltd';

const SplashScreen = ({navigation}: Props) => {
  const [busy, setBusy] = useState(false);
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // GET STARTED sits in the lower band of the artwork.
  const hitStyle = useMemo(
    () => ({
      left: Math.max(16, width * 0.08),
      right: Math.max(16, width * 0.08),
      top: height * 0.66,
      bottom: Math.max(insets.bottom + 12, height * 0.06),
    }),
    [width, height, insets.bottom],
  );

  // Credit sits in the gap under the bilva-leaf divider (~55% down the art).
  const creditStyle = useMemo(
    () => ({
      top: height * 0.53,
      height: Math.max(36, height * 0.055),
      left: Math.max(12, width * 0.06),
      right: Math.max(12, width * 0.06),
    }),
    [width, height],
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
  }, [busy, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.stage}>
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
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  hero: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  hit: {
    position: 'absolute',
  },
  creditHit: {
    position: 'absolute',
    zIndex: 2,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,234,0.35)',
  },
});
