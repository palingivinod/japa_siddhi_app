import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CommonActions} from '@react-navigation/native';

import {RootStackParamList} from '../../navigation/AppNavigator';
import Colors from '../../theme/colors';
import {getLanguage} from '../../services/language';
import {getValidSession} from '../../services/session';
import {useBottomNavPad} from '../../utils/safeArea';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SRI_URJITH_SITE = 'https://www.sriurjith.com/';
const DEVELOPED_BY = 'Developed by Sri Urjith Services Pvt Ltd';

/** Artwork pixel size — used to fit the full design without cropping. */
const ART_WIDTH = 410;
const ART_HEIGHT = 929;
const ART_ASPECT = ART_HEIGHT / ART_WIDTH;

const SplashScreen = ({navigation}: Props) => {
  const [busy, setBusy] = useState(false);
  const {width, height} = useWindowDimensions();
  const bottomPad = useBottomNavPad();

  // Reserve space for real "Developed by" text + system nav (never crop that away).
  const creditBlock = 44;
  const stageHeight = Math.max(1, height - bottomPad - creditBlock);

  // Fit entire splash art inside the stage (letterbox if needed — cream matches bg).
  const artLayout = useMemo(() => {
    const stageAspect = stageHeight / Math.max(1, width);
    if (stageAspect > ART_ASPECT) {
      const dispW = width;
      const dispH = width * ART_ASPECT;
      return {
        width: dispW,
        height: dispH,
        left: 0,
        top: (stageHeight - dispH) / 2,
      };
    }
    const dispH = stageHeight;
    const dispW = stageHeight / ART_ASPECT;
    return {
      width: dispW,
      height: dispH,
      left: (width - dispW) / 2,
      top: 0,
    };
  }, [width, stageHeight]);

  // GET STARTED band on the fitted artwork (lower-middle of the PNG).
  const hitStyle = useMemo(
    () => ({
      left: artLayout.left + artLayout.width * 0.1,
      width: artLayout.width * 0.8,
      top: artLayout.top + artLayout.height * 0.68,
      height: artLayout.height * 0.1,
    }),
    [artLayout],
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
      <View style={[styles.stage, {height: stageHeight}]}>
        <Image
          source={require('../../assets/images/splash_welcome.png')}
          style={[styles.hero, artLayout]}
          resizeMode="contain"
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

      {/* Always on-screen — not baked into the PNG crop. */}
      <TouchableOpacity
        style={[styles.creditRow, {paddingBottom: Math.max(8, bottomPad)}]}
        onPress={openSriUrjith}
        activeOpacity={0.7}
        accessibilityRole="link"
        accessibilityLabel={DEVELOPED_BY}>
        <Text style={styles.creditText}>{DEVELOPED_BY}</Text>
      </TouchableOpacity>
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
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#F7F0E4',
  },
  hero: {
    position: 'absolute',
  },
  hit: {
    position: 'absolute',
    zIndex: 2,
  },
  creditRow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  creditText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B5A48',
    textAlign: 'center',
    fontWeight: '600',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,234,0.35)',
  },
});
