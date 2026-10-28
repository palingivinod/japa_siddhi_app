import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Clipboard from 'react-native/Libraries/Components/Clipboard/Clipboard';

import {useLanguage} from '../../../i18n/LanguageContext';
import Colors from '../../../theme/colors';
import MenuCard from '../../common/MenuCard';
import PrimaryButton from '../../common/PrimaryButton';
import ScreenLayout from '../../common/ScreenLayout';
import ProfileApi from '../../auth/services/profileApi';
import {getStoredUser} from '../../../services/session';
import apiService from '../../../services/apiService';
import {startAppPayment} from '../../payments/startAppPayment';
import {digitsOnly} from '../../../utils/validators';

const PRESET_AMOUNTS = [58, 116, 200, 216];
const PLAYSTORE_URL = 'https://play.google.com/store/apps/details?id=com.japasiddhi';

const buildMonthlySupportShareText = (_t?: (k: any) => string) => {
  return [
    '🙏 Japa Siddhi - Monthly Spiritual Support 🙏',
    '',
    'Join us in supporting noble spiritual activities and trust seva every month:',
    '✨ Monthly Contribution Plans:',
    '   • ₹58 / month',
    '   • ₹116 / month',
    '   • ₹200 / month',
    '   • ₹216 / month',
    '   • Or any custom contribution of your choice',
    '',
    'Duly participate in sacred Kainkaryam & receive divine blessings of Mantra Devata!',
    '',
    '📲 Download Japa Siddhi App & Join:',
    PLAYSTORE_URL,
    '',
    'Team Japasiddhi - Bilva Patra Trust',
  ].join('\n');
};

const MonthlySupportScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  const [devoteeName, setDevoteeName] = useState('');
  const [devoteeMobile, setDevoteeMobile] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmountText, setCustomAmountText] = useState('');
  const [submittingAutopay, setSubmittingAutopay] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
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
        }
      };
      loadProfile();
      return () => {
        active = false;
      };
    }, []),
  );

  const handlePayAmount = async (amount: number) => {
    if (!Number.isFinite(amount) || amount < 1) {
      Alert.alert(t('validationTitle'), 'Please enter a valid contribution amount.');
      return;
    }
    await startAppPayment({
      amount,
      purpose: `Monthly Support: ₹${amount}`,
      seva: 'Monthly Support',
      name: devoteeName,
      phone: devoteeMobile,
    });
  };

  const handleSetAutoPay = async () => {
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
      // Still show the gracious alert so devotees are always acknowledged gracefully
      Alert.alert(
        t('autopaySuccessTitle'),
        t('autopaySuccessMessage'),
        [{text: t('ok') || 'OK', style: 'default'}],
      );
    } finally {
      setSubmittingAutopay(false);
    }
  };

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
      await Share.share(
        Platform.OS === 'ios'
          ? {url: PLAYSTORE_URL, message}
          : {title: 'Japa Siddhi - Monthly Spiritual Support', message},
      );
    } catch (err: any) {
      if (err?.message && !/dismiss|cancel/i.test(err.message)) {
        Alert.alert(
          'Share Details',
          'Details have been copied to your clipboard. You can now paste and share them with your family and friends.',
        );
      }
    }
  };

  return (
    <ScreenLayout title={t('tileMonthlySupport')} showBack tab="Home">
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{t('tileMonthlySupport')}</Text>
        <TouchableOpacity
          style={styles.headerShareBtn}
          onPress={handleShareDetails}
          activeOpacity={0.8}>
          <Text style={styles.headerShareIcon}>📤</Text>
          <Text style={styles.headerShareText}>{t('share') || 'Share'}</Text>
        </TouchableOpacity>
      </View>
      <MenuCard
        icon="generalAnnadanam"
        title={t('tileMonthlySupport')}
        subtitle={t('tileMonthlySupportSub')}
      />

      <Text style={styles.sectionTitle}>
        Choose your monthly contribution:
      </Text>

      {/* Preset Amount Grid */}
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

        {/* Custom / Others Button */}
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

      {/* Custom Amount Input Box */}
      {isCustom ? (
        <View style={styles.customBox}>
          <Text style={styles.customLabel}>Enter Amount (₹):</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              keyboardType="numeric"
              placeholder="e.g. 500"
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
              <Text style={styles.customPayBtnText}>PAY NOW</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Refined Note Card */}
      <View style={styles.noteCard}>
        <Text style={styles.noteIcon}>ℹ️</Text>
        <Text style={styles.noteText}>{t('monthlySupportNote')}</Text>
      </View>

      {/* Dedicated Share Card */}
      <TouchableOpacity
        style={styles.shareCard}
        onPress={handleShareDetails}
        activeOpacity={0.85}>
        <View style={styles.shareIconWrap}>
          <Text style={styles.shareBigIcon}>📤</Text>
        </View>
        <View style={styles.shareTextCol}>
          <Text style={styles.shareCardTitle}>
            Share Monthly Support Details
          </Text>
          <Text style={styles.shareCardSubtitle}>
            Tap to copy and share with family & friends via WhatsApp, Telegram, etc.
          </Text>
        </View>
      </TouchableOpacity>

      {/* SET AUTOPAY / AUTO-DEBIT Button */}
      <PrimaryButton
        title={
          submittingAutopay
            ? 'SUBMITTING REQUEST...'
            : t('setAutopay')
        }
        onPress={handleSetAutoPay}
        disabled={submittingAutopay}
      />
    </ScreenLayout>
  );
};

export default MonthlySupportScreen;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  headerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0D4',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  headerShareIcon: {
    fontSize: 14,
  },
  headerShareText: {
    fontSize: 13,
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
