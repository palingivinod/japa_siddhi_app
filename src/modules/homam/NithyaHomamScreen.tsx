import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BENEFITS = [
  {emoji: '📜', text: 'Daily sankalpam'},
  {emoji: '🙏', text: 'Spiritual participation'},
  {emoji: '🔔', text: 'Personalized reminders'},
];

const NithyaHomamScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<{
    code: string;
    status: string;
    stage: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      apiService
        .get('/orders')
        .then(response => {
          if (!active) {
            return;
          }
          const rows = Array.isArray(response.data?.data)
            ? response.data.data
            : [];
          const homam = rows.find(
            (row: any) =>
              String(row.orderType || row.itemName || '')
                .toUpperCase()
                .includes('NITHYA') ||
              String(row.itemName || '')
                .toUpperCase()
                .includes('HOMAM'),
          );
          if (!homam) {
            setEnrollment(null);
            return;
          }
          const statusRaw = String(
            homam.orderStatus || homam.status || '',
          ).toUpperCase();
          const isActive =
            statusRaw !== 'INACTIVE' && statusRaw !== 'CANCELLED';
          setEnrollment({
            code: `NH${homam.id}`,
            status: isActive ? 'Active' : 'Inactive',
            stage: isActive ? 'Enrolled' : 'Inactive',
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
          <Text style={styles.statusLabel}>Your enrollment</Text>
          <Text style={styles.statusCode}>{enrollment.code}</Text>
          <Text style={styles.statusMeta}>
            {enrollment.stage} • {enrollment.status}
          </Text>
          {enrollment.status === 'Inactive' ? (
            <Text style={styles.hint}>
              Your enrollment is inactive. Contact support or enroll again.
            </Text>
          ) : (
            <Text style={styles.hint}>
              You are enrolled for daily Nithya Homam.
            </Text>
          )}
        </View>
      ) : null}

      {!loading && !enrollment ? (
        <>
          <Text style={styles.section}>Benefits</Text>
          {BENEFITS.map(item => (
            <View key={item.text} style={styles.row}>
              <Text style={styles.benefitEmoji}>{item.emoji}</Text>
              <Text style={styles.item}>{item.text}</Text>
            </View>
          ))}
          <View style={styles.gap} />
          <PrimaryButton
            title="ENROLL NOW"
            onPress={() => navigation.navigate('HomamEnroll')}
          />
        </>
      ) : null}

      {!loading && enrollment?.status === 'Inactive' ? (
        <>
          <View style={styles.gap} />
          <PrimaryButton
            title="ENROLL AGAIN"
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
    marginBottom: 10,
    marginTop: 8,
  },
  row: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  benefitEmoji: {
    width: 28,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    marginRight: 8,
  },
  item: {color: Colors.sacredBrown, fontWeight: '600'},
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
    letterSpacing: 0.6,
  },
  statusCode: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 20,
  },
  statusMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  hint: {
    marginTop: 10,
    color: Colors.sacredBrown,
    fontWeight: '600',
  },
});
