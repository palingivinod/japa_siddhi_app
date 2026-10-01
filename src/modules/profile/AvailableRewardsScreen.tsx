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

type RewardItem = {
  id: number | string;
  name: string;
  stock?: number;
  inStock?: boolean;
  description?: string;
  emoji?: string;
};

const DEFAULT_REWARDS: RewardItem[] = [
  {
    id: 1,
    name: 'Rudraksha',
    emoji: '📿',
    description:
      'Sacred Rudraksha bead consecrated for spiritual protection, peace, and meditation focus.',
    inStock: true,
  },
  {
    id: 2,
    name: 'Japa Mala',
    emoji: '📿',
    description:
      'Traditional 108-bead chanting rosary crafted for daily mantra counting and spiritual discipline.',
    inStock: true,
  },
  {
    id: 3,
    name: 'Bhagavad Gita',
    emoji: '📖',
    description:
      'Authentic scripture containing the timeless divine wisdom and teachings of Lord Krishna.',
    inStock: true,
  },
  {
    id: 4,
    name: 'Temple Prasadam',
    emoji: '🍯',
    description:
      'Holy consecrated prasadam prepared with devotion and blessed at sacred temple sanctums.',
    inStock: true,
  },
];

const getRewardEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('rudraksha') || lower.includes('bead')) {
    return '📿';
  }
  if (lower.includes('mala') || lower.includes('rosary')) {
    return '📿';
  }
  if (lower.includes('gita') || lower.includes('book') || lower.includes('scripture')) {
    return '📖';
  }
  if (lower.includes('prasadam') || lower.includes('sweet') || lower.includes('food')) {
    return '🍯';
  }
  if (lower.includes('diya') || lower.includes('lamp') || lower.includes('deepam')) {
    return '🪔';
  }
  if (lower.includes('lingam') || lower.includes('shiva')) {
    return '🕉️';
  }
  return '🎁';
};

const getRewardDescription = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('rudraksha')) {
    return 'Sacred Rudraksha bead consecrated for spiritual protection, peace, and meditation focus.';
  }
  if (lower.includes('mala')) {
    return 'Traditional 108-bead chanting rosary crafted for daily mantra counting and spiritual discipline.';
  }
  if (lower.includes('gita') || lower.includes('book')) {
    return 'Authentic scripture containing the timeless divine wisdom and teachings of Lord Krishna.';
  }
  if (lower.includes('prasadam')) {
    return 'Holy consecrated prasadam prepared with devotion and blessed at sacred temple sanctums.';
  }
  return 'Sacred spiritual reward gifted upon completing japa challenges and spiritual milestones.';
};

const AvailableRewardsScreen = () => {
  const {t, tt} = useLanguage();
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
            emoji: getRewardEmoji(String(row.name || '')),
            description: getRewardDescription(String(row.name || '')),
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
    <ScreenLayout title={t('availableRewards') || 'Available Rewards'} showBack tab="Profile">
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
              'Complete your daily Japa goals and Samuhika Challenges to earn and claim these consecrated blessings.'}
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
        {rewards.map(item => (
          <View key={String(item.id)} style={styles.rewardCard}>
            <View style={styles.cardHeader}>
              <View style={styles.dot}>
                <Text style={styles.emoji}>{item.emoji || getRewardEmoji(item.name)}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.rewardName}>{tt(item.name)}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {t('available') || 'Available'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.description}>
              {tt(item.description || getRewardDescription(item.name))}
            </Text>
          </View>
        ))}
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
