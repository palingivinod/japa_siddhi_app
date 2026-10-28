import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import {saveDeliveryAddress} from '../../services/savedAddresses';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BanaLingamReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [saving, setSaving] = useState(false);
  const params = route.params || {};
  const address = String(params.address || '').trim();
  const hasAddress = address.length > 0;

  const getPurposeLabel = (val?: string) => {
    if (!val) return '—';
    if (val === 'For Home pooja') return t('purposeHomePooja');
    if (val === 'For Archaka Sanchara pooja') return t('purposeArchakaPooja');
    if (val === 'For Temple Pratistha') return t('purposeTemplePratistha');
    return val;
  };

  const placeOrder = async () => {
    if (!hasAddress) {
      Alert.alert(t('baanalingamSeva'), t('addAddressBeforeApplication'));
      return;
    }
    setSaving(true);
    try {
      await saveDeliveryAddress(address);
      await apiService.post('/donations/checkout', {
        kind: 'BANA_LINGAM',
        fullName: params.fullName,
        mobile: params.mobile,
        address,
        nakshatram: params.nakshatram,
        gothram: params.gothram,
        purpose: params.purpose,
        comments: params.comments?.trim() || undefined,
        remarks: [
          params.purpose ? `Purpose: ${params.purpose}` : '',
          params.comments?.trim() || '',
        ].filter(Boolean).join(' | ') || 'Baanalingam application',
      });
      Alert.alert(
        t('requestSubmittedTitle'),
        t('weWillContactSoon'),
        [
          {
            text: t('ok'),
            onPress: () => navigation.navigate('Orders'),
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      const msg = getApiError(error, t('couldNotSubmitApplication'));
      const isPendingOrder =
        msg.toLowerCase().includes('already one order') ||
        msg.toLowerCase().includes('in review');
      if (isPendingOrder) {
        Alert.alert(
          t('banaLingamPendingOrderTitle'),
          t('banaLingamPendingOrderMessage'),
          [
            {
              text: t('myOrders'),
              onPress: () => navigation.navigate('Orders'),
            },
            {
              text: t('ok'),
              style: 'cancel',
            },
          ],
        );
      } else {
        Alert.alert(t('applicationOverview'), msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('applicationOverview')} showBack tab="SevaHub">
      <MenuCard
        icon="banalingam"
        title={t('baanalingamSeva')}
        subtitle={t('reviewBeforeSubmit')}
      />

      <View style={styles.overviewCard}>
        <Text style={styles.cardHeader}>{t('devoteeDeliveryDetails')}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>{t('nameLabel')}</Text>
          <Text style={styles.value}>{params.fullName || '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>{t('mobileLabel')}</Text>
          <Text style={styles.value}>{params.mobile || '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>{t('address')}</Text>
          <Text style={styles.valueAddress}>{hasAddress ? address : '—'}</Text>
        </View>

        {params.purpose ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('purpose')}</Text>
              <Text style={styles.value}>{getPurposeLabel(params.purpose)}</Text>
            </View>
          </>
        ) : null}

        {params.gothram ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('gothram')}</Text>
              <Text style={styles.value}>{params.gothram}</Text>
            </View>
          </>
        ) : null}

        {params.nakshatram ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('nakshatram')}</Text>
              <Text style={styles.value}>{params.nakshatram}</Text>
            </View>
          </>
        ) : null}

        {params.comments ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('comments')}</Text>
              <Text style={styles.valueAddress}>{params.comments}</Text>
            </View>
          </>
        ) : null}
      </View>

      {hasAddress ? (
        <>
          <PrimaryButton
            title={saving ? t('submitting') : t('submit')}
            onPress={placeOrder}
            disabled={saving}
          />
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <Text style={styles.editBtnText}>{t('editDetailsLink')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            {t('pleaseAddDeliveryAddress')}
          </Text>
          <PrimaryButton
            title={t('addAddress')}
            onPress={() => navigation.navigate('BanaLingam')}
          />
        </>
      )}
    </ScreenLayout>
  );
};

export default BanaLingamReviewScreen;

const styles = StyleSheet.create({
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8D9B8',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#56350F',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: '32%',
  },
  value: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  valueAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EBD9',
    marginVertical: 4,
  },
  editBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  editBtnText: {
    color: Colors.templeGold,
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  hint: {
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
});
