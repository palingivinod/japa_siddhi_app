import React, {useCallback, useRef, useState} from 'react';
import {
  Alert,
  NativeModules,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import Clipboard from 'react-native/Libraries/Components/Clipboard/Clipboard';

import {useLanguage} from '../../../i18n/LanguageContext';
import Colors from '../../../theme/colors';
import PrimaryButton from '../../common/PrimaryButton';
import ScreenLayout from '../../common/ScreenLayout';
import ProfileApi from '../../auth/services/profileApi';
import {getStoredUser} from '../../../services/session';
import apiService from '../../../services/apiService';
import {startAppPayment} from '../../payments/startAppPayment';
import {digitsOnly} from '../../../utils/validators';

const PRESET_AMOUNTS = [58, 116, 200, 216];
const PLAYSTORE_URL = 'https://play.google.com/store/apps/details?id=com.japasiddhi';
const MS_BASE = 'https://japasiddhi.onrender.com/ms';

const buildMonthlySupportShareText = (_t?: (k: any) => string) => {
  return [
    '🙏 Japa Siddhi – Bilva Patra Trust — Monthly Spiritual Support 🙏',
    '',
    'Support temple seva every month with auto-pay.',
    'Choose your monthly offering:',
    '',
    '₹58 / month',
    `${MS_BASE}/58`,
    '',
    '₹116 / month',
    `${MS_BASE}/116`,
    '',
    '₹200 / month',
    `${MS_BASE}/200`,
    '',
    '₹216 / month',
    `${MS_BASE}/216`,
    '',
    'Custom amount',
    `${MS_BASE}/custom`,
    '',
    'Set Autopay',
    `${MS_BASE}/autopay`,
    '',
    'Tap your amount → opens Japa Siddhi app with that plan ready for Razorpay / Auto-pay.',
    '',
    '📲 If the app is not installed:',
    PLAYSTORE_URL,
  ].join('\n');
};

type RouteParams = {
  amount?: number;
  openCustom?: boolean;
  openAutopay?: boolean;
};

const MonthlySupportScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();

  const [devoteeName, setDevoteeName] = useState('');
  const [devoteeMobile, setDevoteeMobile] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmountText, setCustomAmountText] = useState('');
  const [submittingAutopay, setSubmittingAutopay] = useState(false);
  const profileReadyRef = useRef(false);
  const pendingDeepLinkRef = useRef<RouteParams | null>(null);

  const clearDeepLinkParams = useCallback(() => {
    try {
      navigation.setParams({
        amount: undefined,
        openCustom: undefined,
        openAutopay: undefined,
      });
    } catch {
      // ignore
    }
  }, [navigation]);

  const handlePayAmount = useCallback(
    async (amount: number) => {
      if (!Number.isFinite(amount) || amount < 1) {
        Alert.alert(t('validationTitle'), t('validContributionAmount'));
        return;
      }
      await startAppPayment({
        amount,
        purpose: `Monthly Support: ₹${amount}`,
        seva: 'Monthly Support',
        name: devoteeName,
        phone: devoteeMobile,
      });
    },
    [devoteeMobile, devoteeName, t],
  );

  const handleSetAutoPay = useCallback(async () => {
    setSubmittingAutopay(true);
    try {
      const amountToRegister =
        isCustom && Number(customAmountText) > 0
          ? Number(customAmountText)
          : selectedAmount || 58;

      await apiService.post('/donations/autopay/request', {
        fullName: devoteeName || 'Devotee',
        mobile: devoteeMobile || '',
        amount: amountToRegister,
        notes: `Selected plan: ₹${amountToRegister} / month`,
      });

      Alert.alert(
        t('autopaySuccessTitle'),
        t('autopaySuccessMessage'),
        [{text: t('ok') || 'OK', style: 'default'}],
        {cancelable: false},
      );
    } catch {
      Alert.alert(
        t('autopaySuccessTitle'),
        t('autopaySuccessMessage'),
        [{text: t('ok') || 'OK', style: 'default'}],
      );
    } finally {
      setSubmittingAutopay(false);
    }
  }, [
    customAmountText,
    devoteeMobile,
    devoteeName,
    isCustom,
    selectedAmount,
    t,
  ]);

  const applyDeepLink = useCallback(
    (params: RouteParams) => {
      if (params.openAutopay) {
        void handleSetAutoPay();
        return;
      }
      if (params.openCustom) {
        setIsCustom(true);
        setSelectedAmount(null);
        return;
      }
      if (params.amount && Number.isFinite(params.amount) && params.amount > 0) {
        const amt = Math.round(params.amount);
        if (PRESET_AMOUNTS.includes(amt)) {
          setSelectedAmount(amt);
          setIsCustom(false);
        } else {
          setIsCustom(true);
          setSelectedAmount(null);
          setCustomAmountText(String(amt));
        }
        void handlePayAmount(amt);
      }
    },
    [handlePayAmount, handleSetAutoPay],
  );

  const consumeDeepLinkIfReady = useCallback(() => {
    const pending = pendingDeepLinkRef.current;
    if (!pending || !profileReadyRef.current) {
      return;
    }
    pendingDeepLinkRef.current = null;
    applyDeepLink(pending);
  }, [applyDeepLink]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const params = (route.params || {}) as RouteParams;
      if (params.amount || params.openCustom || params.openAutopay) {
        pendingDeepLinkRef.current = {
          amount: params.amount,
          openCustom: params.openCustom,
          openAutopay: params.openAutopay,
        };
        clearDeepLinkParams();
      }

      const loadProfile = async () => {
        try {
          const [stored, profile] = await Promise.all([
            getStoredUser(),
            ProfileApi.getProfile().catch(() => null),
          ]);
          if (!active) return;
          const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
          const phone =
            profile?.mobileNumber ||
            stored?.mobileNumber ||
            stored?.mobile_number ||
            stored?.phone ||
            '';
          if (name) setDevoteeName(String(name).trim());
          if (phone) setDevoteeMobile(digitsOnly(String(phone)).slice(-10));
        } catch {
          // ignore profile load error
        } finally {
          if (active) {
            profileReadyRef.current = true;
            consumeDeepLinkIfReady();
          }
        }
      };
      loadProfile();
      return () => {
        active = false;
      };
    }, [clearDeepLinkParams, consumeDeepLinkIfReady, route.params]),
  );

  const handleShareDetails = async () => {
    const message = buildMonthlySupportShareText(t);
    try {
      (Clipboard as {setString?: (value: string) => void}).setString?.(message);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          t('copiedToClipboard') || 'Details copied to clipboard!',
          ToastAndroid.SHORT,
        );
      }
    } catch {
      // ignore clipboard error
    }

    try {
      // Android: share logo image + flyer text (same as Home "Share app").
      if (Platform.OS === 'android' && NativeModules.AppShare?.shareLogo) {
        await NativeModules.AppShare.shareLogo(message);
        return;
      }
      await Share.share(
        Platform.OS === 'ios'
          ? {url: PLAYSTORE_URL, message}
          : {title: 'Japa Siddhi - Monthly Spiritual Support', message},
      );
    } catch (err: any) {
      try {
        await Share.share({
          title: 'Japa Siddhi - Monthly Spiritual Support',
          message,
        });
      } catch (fallbackErr: any) {
        if (
          fallbackErr?.message &&
          !/dismiss|cancel/i.test(String(fallbackErr.message))
        ) {
          Alert.alert(
            t('shareDetailsTitle'),
            t('shareDetailsClipboardHint'),
          );
        }
      }
    }
  };

  return (
    <ScreenLayout title={t('monthlyTempleSupport')} showBack tab="Home">
      <View style={styles.headerRow}>
        <Text style={styles.heading} numberOfLines={3}>
          {t('tileMonthlySupport')}
        </Text>
        <TouchableOpacity
          style={styles.headerShareBtn}
          onPress={handleShareDetails}
          activeOpacity={0.8}>
          <Text style={styles.headerShareIcon}>📤</Text>
          <Text style={styles.headerShareText} numberOfLines={1}>
            {t('share') || 'Share'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>
        {t('chooseMonthlyContribution')}
      </Text>

      <View style={styles.grid}>
        {PRESET_AMOUNTS.map(amt => (
          <TouchableOpacity
            key={amt}
            style={[
              styles.amountBtn,
              selectedAmount === amt && !isCustom && styles.amountBtnActive,
            ]}
            activeOpacity={0.85}
            onPress={() => {
              setSelectedAmount(amt);
              setIsCustom(false);
              handlePayAmount(amt);
            }}>
            <Text
              style={[
                styles.amountText,
                selectedAmount === amt && !isCustom && styles.amountTextActive,
              ]}>
              ₹{amt}
            </Text>
            <Text
              style={[
                styles.perMonthText,
                selectedAmount === amt && !isCustom && styles.perMonthTextActive,
              ]}>
              {t('perMonth')}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[
            styles.amountBtn,
            styles.othersBtn,
            isCustom && styles.amountBtnActive,
          ]}
          activeOpacity={0.85}
          onPress={() => {
            setIsCustom(true);
            setSelectedAmount(null);
          }}>
          <Text
            style={[
              styles.othersText,
              isCustom && styles.amountTextActive,
            ]}>
            {t('customAmount')}
          </Text>
        </TouchableOpacity>
      </View>

      {isCustom ? (
        <View style={styles.customBox}>
          <Text style={styles.customLabel}>{t('enterAmountLabel')}</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              keyboardType="numeric"
              placeholder={t('amountExamplePlaceholder')}
              placeholderTextColor={Colors.placeholder}
              value={customAmountText}
              onChangeText={text => setCustomAmountText(text.replace(/\D/g, ''))}
            />
            <TouchableOpacity
              style={[
                styles.customPayBtn,
                !Number(customAmountText) && styles.customPayBtnDisabled,
              ]}
              disabled={!Number(customAmountText)}
              onPress={() => handlePayAmount(Number(customAmountText))}>
              <Text style={styles.customPayBtnText}>{t('payNow')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.noteCard}>
        <Text style={styles.noteIcon}>ℹ️</Text>
        <Text style={styles.noteText}>{t('monthlySupportNote')}</Text>
      </View>

      <PrimaryButton
        title={
          submittingAutopay
            ? t('submittingAutopayRequest')
            : t('setAutopay')
        }
        onPress={handleSetAutoPay}
        disabled={submittingAutopay}
      />

      <TouchableOpacity
        style={styles.shareCard}
        onPress={handleShareDetails}
        activeOpacity={0.85}>
        <View style={styles.shareIconWrap}>
          <Text style={styles.shareBigIcon}>📤</Text>
        </View>
        <View style={styles.shareTextCol}>
          <Text style={styles.shareCardTitle}>
            {t('shareMonthlySupportTitle')}
          </Text>
          <Text style={styles.shareCardSubtitle}>
            {t('shareMonthlySupportSub')}
          </Text>
        </View>
      </TouchableOpacity>
    </ScreenLayout>
  );
};

export default MonthlySupportScreen;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  heading: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    paddingRight: 4,
  },
  headerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#FFF0D4',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  headerShareIcon: {
    fontSize: 14,
  },
  headerShareText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginTop: 14,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  amountBtn: {
    width: '48%',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  amountBtnActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#F1F8E9',
  },
  amountText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  amountTextActive: {
    color: Colors.leafGreen,
  },
  perMonthText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  perMonthTextActive: {
    color: Colors.leafGreen,
  },
  othersBtn: {
    width: '100%',
    paddingVertical: 14,
    marginTop: 2,
  },
  othersText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  customBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 16,
  },
  customLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.sacredBrown,
    backgroundColor: '#FAF8F5',
  },
  customPayBtn: {
    backgroundColor: Colors.leafGreen,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPayBtnDisabled: {
    opacity: 0.5,
  },
  customPayBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: Colors.templeGold,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  noteIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#6D4C41',
    fontWeight: '600',
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  shareIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  shareBigIcon: {
    fontSize: 20,
  },
  shareTextCol: {
    flex: 1,
  },
  shareCardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 3,
  },
  shareCardSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
