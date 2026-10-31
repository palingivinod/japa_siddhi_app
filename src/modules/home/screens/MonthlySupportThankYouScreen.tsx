import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  NativeModules,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../../i18n/LanguageContext';
import ProfileApi from '../../auth/services/profileApi';
import {getStoredUser} from '../../../services/session';
import {resolveMediaUrl} from '../../../services/profilePhoto';
import Colors from '../../../theme/colors';
import PrimaryButton from '../../common/PrimaryButton';
import ScreenLayout from '../../common/ScreenLayout';
import {
  alertReceiptError,
  downloadPaymentReceipt,
} from '../../payments/downloadPaymentReceipt';

const APP_LOGO = require('../../../assets/images/logo.png');

const MonthlySupportThankYouScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();

  // Always from this payment's route params — never a hardcoded amount.
  const paidAmount = useMemo(() => {
    const raw = Number(
      route.params?.amount ??
        route.params?.amountRupees ??
        route.params?.paidAmount ??
        0,
    );
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
  }, [
    route.params?.amount,
    route.params?.amountRupees,
    route.params?.paidAmount,
  ]);
  const amountLabel =
    paidAmount > 0 ? `₹${paidAmount.toLocaleString('en-IN')}` : '₹—';

  const paymentId = String(
    route.params?.confirmationId ||
      route.params?.paymentId ||
      route.params?.orderNumber ||
      '',
  ).trim();
  const seva = String(route.params?.seva || 'Monthly Support').trim();
  const purpose = String(route.params?.purpose || '').trim();
  const phone = String(route.params?.phone || '').trim();

  const [name, setName] = useState(String(route.params?.name || '').trim());
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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

  /** Logo image + seva text only — never a screen capture (Close stays off the share). */
  const shareWithLogo = async () => {
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

  const shareWhatsApp = () => {
    void shareWithLogo();
  };

  const shareFacebook = () => {
    void shareWithLogo();
  };

  const shareInstagram = () => {
    Alert.alert(
      t('shareYourSeva') || 'Share Your Seva',
      t('instagramShareHint') ||
        'Share the logo and your seva message, then paste in Instagram if needed.',
      [
        {text: t('cancel') || 'Cancel', style: 'cancel'},
        {
          text: t('share') || 'Share',
          onPress: () => {
            void shareWithLogo();
          },
        },
      ],
    );
  };

  const onDownloadReceipt = async () => {
    if (!paymentId) {
      Alert.alert(
        t('validationTitle') || 'Receipt',
        'Payment id is missing. Receipt can be downloaded from payment history.',
      );
      return;
    }
    if (downloading) {
      return;
    }
    setDownloading(true);
    try {
      await downloadPaymentReceipt({
        paymentId,
        amount: paidAmount > 0 ? paidAmount : undefined,
        seva,
        purpose: purpose || seva,
        name: displayName,
        phone: phone || undefined,
      });
    } catch (err) {
      alertReceiptError(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScreenLayout title={t('paymentSuccessful')} showBack tab="Home">
      <View style={styles.brandRow}>
        <Image source={APP_LOGO} style={styles.logo} resizeMode="contain" />
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>Japa Siddhi</Text>
          <Text style={styles.brandSub}>Bilva Patra Trust</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.heroTitle}>
          {t('monthlySupportThankYouTitle') ||
            'Thank You! Your Monthly Support is Confirmed'}
        </Text>
        <Text style={styles.heroSub}>
          {t('monthlySupportThankYouSub') ||
            'Your devotion helps our temple Seva continue every month.'}
        </Text>
      </View>

      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>
          {t('yourContribution') || 'Your Contribution'}
        </Text>
        <Text style={styles.amountValue}>
          {amountLabel}
          <Text style={styles.amountSuffix}> / Month</Text>
        </Text>
        <Text style={styles.amountFoot}>
          {t('togetherDivine') || 'Together for a cause divine'} 🙏
        </Text>
        <Text style={styles.devoteeLine}>
          {t('devoteeLabel') || 'Devotee'}: {displayName}
        </Text>
      </View>

      <View style={styles.shareBanner}>
        <Text style={styles.shareBannerTitle}>
          {t('shareYourSeva') || 'Share Your Seva'}
        </Text>
        <Text style={styles.shareBannerSub}>
          {t('shareYourSevaSub') ||
            'Inspire your family & friends to be a part of this divine journey'}
        </Text>
      </View>

      <View style={styles.previewCard}>
        {photoUri ? (
          <Image source={{uri: photoUri}} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.previewCopy}>
          <Text style={styles.previewName}>{displayName}</Text>
          <Text style={styles.previewText}>
            {`I have contributed ${amountLabel} per month towards our temple Seva 🙏 Let’s all join together!`}
          </Text>
          <Text style={styles.previewBrand}>
            Japa Siddhi · Bilva Patra Trust
          </Text>
        </View>
      </View>

      <View style={styles.shareRow}>
        <TouchableOpacity
          style={[styles.shareBtn, styles.waBtn]}
          onPress={shareWhatsApp}
          activeOpacity={0.85}>
          <Text style={styles.shareBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareBtn, styles.fbBtn]}
          onPress={shareFacebook}
          activeOpacity={0.85}>
          <Text style={styles.shareBtnText}>Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareBtn, styles.igBtn]}
          onPress={shareInstagram}
          activeOpacity={0.85}>
          <Text style={styles.shareBtnText}>Instagram</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.blessing}>
        {t('mayLordsBlessings') ||
          "May Lord's Blessings be with you always!"}
      </Text>

      {paymentId ? (
        <View style={styles.receiptWrap}>
          {downloading ? (
            <ActivityIndicator
              color={Colors.templeGold}
              style={styles.receiptSpinner}
            />
          ) : null}
          <PrimaryButton
            title={
              downloading
                ? t('downloadingReceipt') || 'Downloading receipt...'
                : t('downloadReceipt') || 'Download Receipt'
            }
            onPress={onDownloadReceipt}
            disabled={downloading}
          />
        </View>
      ) : null}

      <PrimaryButton
        title={t('close') || 'CLOSE'}
        onPress={() => navigation.navigate('Home')}
      />
    </ScreenLayout>
  );
};

export default MonthlySupportThankYouScreen;

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  brandCopy: {
    marginLeft: 12,
    flex: 1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  heroSub: {
    marginTop: 8,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: 20,
  },
  amountCard: {
    backgroundColor: '#FFF8EA',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  amountLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
  },
  amountValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  amountSuffix: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  amountFoot: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  devoteeLine: {
    marginTop: 10,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  shareBanner: {
    backgroundColor: '#B91C1C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  shareBannerTitle: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  shareBannerSub: {
    marginTop: 4,
    color: '#FEE2E2',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Colors.templeGold,
  },
  avatarFallback: {
    backgroundColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  previewCopy: {
    flex: 1,
    marginLeft: 12,
  },
  previewName: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 15,
    marginBottom: 4,
  },
  previewText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  previewBrand: {
    marginTop: 6,
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 11,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  shareBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  waBtn: {backgroundColor: '#16A34A'},
  fbBtn: {backgroundColor: '#2563EB'},
  igBtn: {backgroundColor: '#DB2777'},
  shareBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  blessing: {
    textAlign: 'center',
    color: Colors.sacredBrown,
    fontWeight: '700',
    marginBottom: 16,
    fontSize: 14,
  },
  receiptWrap: {
    marginBottom: 12,
  },
  receiptSpinner: {
    marginBottom: 8,
  },
});
