import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BENEFITS: {emoji: string; key: TranslationKey}[] = [
  {emoji: '📜', key: 'benefitDailySankalpam'},
  {emoji: '🙏', key: 'benefitSpiritualParticipation'},
  {emoji: '🔔', key: 'benefitPersonalizedReminders'},
];

type EnrollmentState = {
  code: string;
  status: 'Pending' | 'Active' | 'Inactive';
  stage: string;
};

const NithyaHomamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      apiService
        .get('/donations/homam-status')
        .then(response => {
          if (!active) {
            return;
          }
          const statusRow = response.data?.data || null;
          if (!statusRow?.id) {
            setEnrollment(null);
            return;
          }
          const payment = String(statusRow.paymentStatus || '').toUpperCase();
          const orderStatus = String(statusRow.orderStatus || '').toUpperCase();
          if (orderStatus === 'INACTIVE' || orderStatus === 'CANCELLED') {
            setEnrollment({
              code: statusRow.code || `NH${statusRow.id}`,
              status: 'Inactive',
              stage: 'Inactive',
            });
            return;
          }
          if (payment === 'SUCCESS' || orderStatus === 'ACTIVE') {
            setEnrollment({
              code: statusRow.code || `NH${statusRow.id}`,
              status: 'Active',
              stage: 'Verified',
            });
            return;
          }
          setEnrollment({
            code: statusRow.code || `NH${statusRow.id}`,
            status: 'Pending',
            stage: 'Pending verification',
          });
        })
        .catch(() => {
          if (active) {
            setEnrollment(null);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScreenLayout title="Nithya Homam" showBack tab="SevaHub">
      <MenuCard
        emoji="🔥"
        title="Daily Sacred Homam"
        subtitle="Enroll for Nithya Homam participation."
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && enrollment ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{t('yourEnrollment')}</Text>
          <Text style={styles.statusCode}>{enrollment.code}</Text>
          <Text style={styles.statusMeta}>
            {enrollment.stage} • {enrollment.status}
          </Text>
          {enrollment.status === 'Pending' ? (
            <Text style={styles.hint}>{t('homamPendingHint')}</Text>
          ) : null}
          {enrollment.status === 'Inactive' ? (
            <Text style={styles.hint}>{t('homamInactiveHint')}</Text>
          ) : null}
          {enrollment.status === 'Active' ? (
            <Text style={styles.hint}>{t('homamActiveHint')}</Text>
          ) : null}
        </View>
      ) : null}

      {!loading && (!enrollment || enrollment.status === 'Inactive') ? (
        <>
          {!enrollment ? (
            <>
              <Text style={styles.section}>{t('benefitsLabel')}</Text>
              {BENEFITS.map(item => (
                <View key={item.key} style={styles.row}>
                  <Text style={styles.benefitEmoji}>{item.emoji}</Text>
                  <Text style={styles.item}>{t(item.key)}</Text>
                </View>
              ))}
            </>
          ) : null}
          <View style={styles.gap} />
          <PrimaryButton
            title={enrollment ? 'ENROLL AGAIN' : 'ENROLL NOW'}
            onPress={() => navigation.navigate('HomamEnroll')}
          />
        </>
      ) : null}
    </ScreenLayout>
  );
};

export default NithyaHomamScreen;

const styles = StyleSheet.create({
  center: {paddingVertical: 16, alignItems: 'center'},
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
    marginTop: 8,
    includeFontPadding: true,
    paddingVertical: 2,
  },
  row: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  benefitEmoji: {
    width: 28,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    marginRight: 8,
  },
  item: {
    color: Colors.sacredBrown,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: true,
    paddingVertical: 2,
    flex: 1,
  },
  gap: {height: 20},
  statusCard: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  statusLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.6,
    includeFontPadding: true,
  },
  statusCode: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 26,
    includeFontPadding: true,
  },
  statusMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: true,
  },
  hint: {
    marginTop: 10,
    color: Colors.sacredBrown,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: true,
    paddingVertical: 2,
  },
});
