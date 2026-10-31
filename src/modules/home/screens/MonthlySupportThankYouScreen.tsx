import React, {useCallback, useState} from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  NativeModules,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useLanguage} from '../../../i18n/LanguageContext';
import ProfileApi from '../../auth/services/profileApi';
import {getStoredUser} from '../../../services/session';
import {resolveMediaUrl} from '../../../services/profilePhoto';
import Colors from '../../../theme/colors';
import PrimaryButton from '../../common/PrimaryButton';
import AppHeader from '../../common/AppHeader';
import BottomTabs from '../../common/BottomTabs';
import {useBottomNavPad} from '../../../utils/safeArea';

const APP_LOGO = require('../../../assets/images/logo.png');
const THANKYOU_BG = require('../../../assets/images/monthly_support_thankyou.png');

/** Design asset aspect (349×693). */
const POSTER_RATIO = 349 / 693;

const MonthlySupportThankYouScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const {width: windowWidth} = useWindowDimensions();
  const bottomPad = useBottomNavPad();

  const amount = Math.round(Number(route.params?.amount) || 0);
  const amountLabel =
    amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : '₹—';

  const [name, setName] = useState(String(route.params?.name || '').trim());
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const [stored, profile] = await Promise.all([
            getStoredUser(),
            ProfileApi.getProfile().catch(() => null),
          ]);
          if (!active) {
            return;
          }
          const fullName =
            profile?.fullName ||
            stored?.fullName ||
            stored?.full_name ||
            route.params?.name ||
            '';
          if (String(fullName).trim()) {
            setName(String(fullName).trim());
          }
          const rawPhoto =
            profile?.profilePhoto ||
            stored?.profilePhoto ||
            stored?.profile_photo ||
            '';
          setPhotoUri(resolveMediaUrl(String(rawPhoto || '').trim()));
        } catch {
          // Keep route params if profile load fails.
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [route.params?.name]),
  );

  const displayName = name || 'Devotee';
  const shareMessage = [
    '🙏 Japa Siddhi – Bilva Patra Trust 🙏',
    '',
    `I, ${displayName}, have contributed ${amountLabel} per month towards our temple Seva 🙏`,
    'Let’s all join together!',
    '',
    'Support Monthly Seva in the Japa Siddhi app.',
  ].join('\n');

  const posterWidth = Math.min(windowWidth - 24, 420);
  const posterHeight = posterWidth / POSTER_RATIO;

  const shareGeneric = async () => {
    try {
      if (Platform.OS === 'android' && NativeModules.AppShare?.shareLogo) {
        await NativeModules.AppShare.shareLogo(shareMessage);
        return;
      }
      await Share.share(
        Platform.OS === 'ios'
          ? {message: shareMessage}
          : {title: 'Japa Siddhi – Bilva Patra Trust', message: shareMessage},
      );
    } catch {
      // User dismissed share sheet.
    }
  };

  const shareWhatsApp = async () => {
    if (Platform.OS === 'android' && NativeModules.AppShare?.shareLogo) {
      await shareGeneric();
      return;
    }
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through
    }
    await shareGeneric();
  };

  const shareFacebook = async () => {
    await shareGeneric();
  };

  const shareInstagram = async () => {
    Alert.alert(
      t('shareYourSeva') || 'Share Your Seva',
      t('instagramShareHint') ||
        'Copy your seva message, then paste it in Instagram.',
      [
        {text: t('cancel') || 'Cancel', style: 'cancel'},
        {
          text: t('share') || 'Share',
          onPress: () => {
            void shareGeneric();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader title={t('paymentSuccessful')} showBack />
      <View
        style={[
          styles.body,
          {paddingBottom: 120 + bottomPad},
        ]}>
        <View style={styles.brandRow}>
          <Image source={APP_LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>Japa Siddhi</Text>
            <Text style={styles.brandSub}>Bilva Patra Trust</Text>
          </View>
        </View>

        <View
          style={[
            styles.posterWrap,
            {width: posterWidth, height: posterHeight},
          ]}>
          <ImageBackground
            source={THANKYOU_BG}
            style={styles.poster}
            imageStyle={styles.posterImage}
            resizeMode="cover">
            {/* Dynamic amount — covers baked-in ₹116 on the art */}
            <View
              style={[
                styles.amountOverlay,
                {
                  top: posterHeight * 0.455,
                  height: posterHeight * 0.07,
                },
              ]}>
              <Text style={styles.amountOverlayText} numberOfLines={1}>
                {amountLabel}
                <Text style={styles.amountOverlaySuffix}> / Month</Text>
              </Text>
            </View>

            {/* Dynamic profile photo — covers sample face on the art */}
            <View
              style={[
                styles.photoOverlay,
                {
                  top: posterHeight * 0.635,
                  left: posterWidth * 0.07,
                  width: posterWidth * 0.22,
                  height: posterWidth * 0.22,
                  borderRadius: posterWidth * 0.11,
                },
              ]}>
              {photoUri ? (
                <Image
                  source={{uri: photoUri}}
                  style={styles.photoFill}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.photoFill, styles.photoFallback]}>
                  <Text style={styles.photoInitial}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Dynamic share line under photo (covers sample caption) */}
            <View
              style={[
                styles.captionOverlay,
                {
                  top: posterHeight * 0.64,
                  left: posterWidth * 0.32,
                  width: posterWidth * 0.6,
                  height: posterHeight * 0.11,
                },
              ]}>
              <Text style={styles.captionName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.captionText} numberOfLines={3}>
                {`I have contributed ${amountLabel} per month towards our temple Seva 🙏 Let’s all join together!`}
              </Text>
            </View>

            {/* Tappable share hit areas over art buttons */}
            <TouchableOpacity
              style={[
                styles.hitBtn,
                {
                  top: posterHeight * 0.78,
                  left: posterWidth * 0.06,
                  width: posterWidth * 0.28,
                  height: posterHeight * 0.055,
                },
              ]}
              onPress={shareWhatsApp}
              activeOpacity={0.7}
            />
            <TouchableOpacity
              style={[
                styles.hitBtn,
                {
                  top: posterHeight * 0.78,
                  left: posterWidth * 0.36,
                  width: posterWidth * 0.28,
                  height: posterHeight * 0.055,
                },
              ]}
              onPress={shareFacebook}
              activeOpacity={0.7}
            />
            <TouchableOpacity
              style={[
                styles.hitBtn,
                {
                  top: posterHeight * 0.78,
                  left: posterWidth * 0.66,
                  width: posterWidth * 0.28,
                  height: posterHeight * 0.055,
                },
              ]}
              onPress={shareInstagram}
              activeOpacity={0.7}
            />
          </ImageBackground>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={t('close') || 'CLOSE'}
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      </View>
      <BottomTabs active="Home" />
    </SafeAreaView>
  );
};

export default MonthlySupportThankYouScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 10,
    marginTop: 4,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  brandCopy: {
    marginLeft: 10,
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  posterWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.templeGold,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  amountOverlay: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8ECD4',
  },
  amountOverlayText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  amountOverlaySuffix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  photoOverlay: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.templeGold,
    backgroundColor: Colors.lightGold,
  },
  photoFill: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGold,
  },
  photoInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  captionOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    paddingRight: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  captionName: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 13,
    marginBottom: 2,
  },
  captionText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 15,
  },
  hitBtn: {
    position: 'absolute',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 14,
  },
});
