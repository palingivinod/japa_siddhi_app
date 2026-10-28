import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {useLanguage} from '../../i18n/LanguageContext';

type SevaStats = {
  annadanamUpcoming: number;
  annadanamPast: number;
  homamUpcoming: number;
  homamPast: number;
};

const AdminSevaScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [stats, setStats] = useState<SevaStats>({
    annadanamUpcoming: 0,
    annadanamPast: 0,
    homamUpcoming: 0,
    homamPast: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [annaRes, homamRes] = await Promise.all([
        apiService.get('/admin/seva-donations?type=ANNADANAM'),
        apiService.get('/admin/seva-donations?type=NITHYA_HOMAM'),
      ]);

      const annaCounts = annaRes.data?.data?.counts || {};
      const homamCounts = homamRes.data?.data?.counts || {};

      setStats({
        annadanamUpcoming: Number(annaCounts.upcoming || 0),
        annadanamPast: Number(annaCounts.past || 0),
        homamUpcoming: Number(homamCounts.upcoming || 0),
        homamPast: Number(homamCounts.past || 0),
      });
    } catch {
      // Keep existing stats on error
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  return (
    <AdminScreenLayout title={t('sevaManagement') || 'Seva Management'} tab="AdminMore" showBack>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('sevaManagement') || 'Seva Management'}</Text>
          <Text style={styles.subtitle}>
            Manage devotee offerings, view upcoming and past seva dates, contact devotees directly, and send instant replies.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.templeGold} size="small" />
            <Text style={styles.loadingText}>Updating counts...</Text>
          </View>
        ) : null}

        {/* 1. Anna Santharpana Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.88}
          onPress={() =>
            navigation.navigate('AdminSevaDetailList', {
              type: 'ANNADANAM',
              title: t('annaSantharpana') || 'Anna Santharpana',
            })
          }>
          <View style={styles.cardTopRow}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardEmoji}>🍲</Text>
            </View>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardTitle}>{t('annaSantharpana') || 'Anna Santharpana'}</Text>
              <Text style={styles.cardSubtitle}>
                Food offering bookings & devotee prefer dates
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>{t('upcomingTab') || 'Upcoming'}</Text>
              <Text style={[styles.statChipValue, {color: '#B45309'}]}>
                {stats.annadanamUpcoming}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>{t('pastTab') || 'Past'}</Text>
              <Text style={[styles.statChipValue, {color: '#15803D'}]}>
                {stats.annadanamPast}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>{t('orderTabAll') || 'Total'}</Text>
              <Text style={[styles.statChipValue, {color: Colors.sacredBrown}]}>
                {stats.annadanamUpcoming + stats.annadanamPast}
              </Text>
            </View>
          </View>

          <View style={styles.actionPrompt}>
            <Text style={styles.actionPromptText}>
              View Devotees, Dates & Replies →
            </Text>
          </View>
        </TouchableOpacity>

        {/* 2. Nithya Homam Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.88}
          onPress={() =>
            navigation.navigate('AdminSevaDetailList', {
              type: 'NITHYA_HOMAM',
              title: t('nithyaHomam') || 'Nithya Homam',
            })
          }>
          <View style={styles.cardTopRow}>
            <View style={[styles.cardIconBox, {backgroundColor: '#FEF3C7'}]}>
              <Text style={styles.cardEmoji}>🔥</Text>
            </View>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardTitle}>{t('nithyaHomam') || 'Nithya Homam'}</Text>
              <Text style={styles.cardSubtitle}>
                Sacred fire ritual offerings, gotram & prefer dates
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>{t('upcomingTab') || 'Upcoming'}</Text>
              <Text style={[styles.statChipValue, {color: '#B45309'}]}>
                {stats.homamUpcoming}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>{t('pastTab') || 'Past'}</Text>
              <Text style={[styles.statChipValue, {color: '#15803D'}]}>
                {stats.homamPast}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>{t('orderTabAll') || 'Total'}</Text>
              <Text style={[styles.statChipValue, {color: Colors.sacredBrown}]}>
                {stats.homamUpcoming + stats.homamPast}
              </Text>
            </View>
          </View>

          <View style={styles.actionPrompt}>
            <Text style={styles.actionPromptText}>
              View Devotees, Dates & Replies →
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </AdminScreenLayout>
  );
};

export default AdminSevaScreen;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardHeaderCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFEA',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE6DF',
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statChipValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  actionPrompt: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  actionPromptText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
});
