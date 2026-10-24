import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const Row = ({label, value}: {label: string; value: string}) => (
  <>
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
    <View style={styles.divider} />
  </>
);

const MilestoneRewardOverviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [saving, setSaving] = useState(false);
  const params = route.params || {};
  const target = Number(params.target || 0);
  const rewardId = Number(params.rewardId || 0);
  const rewardName = String(params.rewardName || 'Reward');

  const submit = async () => {
    if (!target || !rewardId) {
      Alert.alert(t('rewards'), t('missingRewardDetails'));
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.post(`/japa/milestones/${target}/reward`, {
        rewardId,
        fullName: params.fullName,
        mobile: params.mobile,
        address: params.address,
        city: params.city,
        state: params.state,
        pinCode: params.pinCode,
      });
      const data = response.data?.data || {};
      const orderNumber = String(data.orderNumber || '');
      Alert.alert(
        t('rewardSubmittedTitle'),
        orderNumber
          ? t('rewardOrderSentNumber', {order: orderNumber})
          : t('rewardOrderSent'),
        [
          {
            text: t('ok'),
            onPress: () => navigation.navigate('MilestoneNotifications'),
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      Alert.alert(t('rewards'), getApiError(error, t('couldNotSubmitReward')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Reward overview" showBack tab="SevaHub">
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Reward and delivery</Text>
        <Row label="Reward" value={rewardName} />
        <Row label={t('fullName')} value={String(params.fullName || '')} />
        <Row label={t('mobile')} value={String(params.mobile || '')} />
        <Row label={t('address')} value={String(params.address || '')} />
        <Row label={t('city')} value={String(params.city || '')} />
        <Row label={t('state')} value={String(params.state || '')} />
        <Row label={t('pinCode')} value={String(params.pinCode || '')} />
      </View>
      <PrimaryButton
        title={saving ? 'SUBMITTING...' : 'SUBMIT'}
        onPress={submit}
        disabled={saving}
      />
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.goBack()}
        disabled={saving}>
        <Text style={styles.editBtnText}>{t('editDetails')}</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
};

export default MilestoneRewardOverviewScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    marginBottom: 20,
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
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  editBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 10,
  },
  editBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
  },
});
