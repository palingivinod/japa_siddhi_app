import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';
import {getLocalizedReward} from '../../utils/rewardContent';

type RewardItem = {
  id: number | string;
  name: string;
  stock?: number;
  inStock?: boolean;
  description?: string;
  emoji?: string;
};

const DEFAULT_REWARDS: RewardItem[] = [
  {id: 1, name: 'Rudraksha', inStock: true},
  {id: 2, name: 'Spatik Mala', inStock: true},
  {id: 3, name: 'Pasupu Kommula Mala', inStock: true},
  {id: 4, name: 'Green Agate', inStock: true},
  {id: 5, name: 'Yellow Agate', inStock: true},
  {id: 6, name: 'Bhagavad Gita', inStock: true},
  {id: 7, name: 'Temple Prasadam', inStock: true},
];

const AvailableRewardsScreen = () => {
  const {t, tt, language} = useLanguage();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    try {
      const response = await apiService
        .get('/challenges/rewards')
        .catch(() => apiService.get('/admin/rewards'));

      const raw =
        response.data?.data?.rewards ||
        response.data?.data ||
        response.data?.rewards ||
        [];

      const rows: any[] = Array.isArray(raw) ? raw : [];

      if (rows.length > 0) {
        setRewards(
          rows.map((row: any) => ({
            id: row.id,
            name: String(row.name || ''),
            stock: Number(row.stock || 0),
            inStock: Number(row.stock ?? 1) > 0,
            emoji: row.emoji,
            description: row.description,
          })),
        );
      } else {
        setRewards(DEFAULT_REWARDS);
      }
    } catch (err) {
      setRawError(err);
      // Fall back to default sacred rewards if offline or network issue
      setRewards(DEFAULT_REWARDS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScreenLayout title={t('availableRewards') || 'Available Rewards'} tab="Rewards">
      {/* Banner / Info Header */}
      <View style={styles.banner}>
        <View style={styles.bannerIconWrap}>
          <Text style={styles.bannerEmoji}>🎁</Text>
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>
            {t('spiritualRewardsTitle') || 'Sacred Spiritual Rewards'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {t('spiritualRewardsSubtitle') ||
              'Explore our authentic collection of consecrated spiritual items and sacred divine offerings.'}
          </Text>
        </View>
      </View>

      {loading ? <ActivityIndicator color={Colors.templeGold} style={styles.loader} /> : null}

      {error && rewards.length === 0 ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}

      <Text style={styles.sectionHeading}>
        {t('rewardsCatalog') || 'Available Rewards'}
      </Text>

      <View style={styles.listContainer}>
        {rewards.map(item => {
          const localized = getLocalizedReward(item.name, language);
          return (
            <View key={String(item.id)} style={styles.rewardCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dot}>
                  <Text style={styles.emoji}>
                    {item.emoji || localized.emoji}
                  </Text>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.rewardName}>
                    {localized.title || tt(item.name)}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{tt('Available')}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.description}>
                {localized.description || tt(item.description || '')}
              </Text>
            </View>
          );
        })}
      </View>
    </ScreenLayout>
  );
};

export default AvailableRewardsScreen;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF4E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
    includeFontPadding: true,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    includeFontPadding: true,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
    includeFontPadding: true,
  },
  loader: {
    marginVertical: 20,
  },
  listContainer: {
    paddingBottom: 24,
  },
  rewardCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emoji: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
    includeFontPadding: true,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#EBF7EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: Colors.leafGreen,
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    includeFontPadding: true,
  },
});
