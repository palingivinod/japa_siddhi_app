import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import apiService from '../../services/apiService';
import {playIntroVideo} from '../../services/introVideos';
import {getReadCache, READ_TTL_MS, setReadCache} from '../../services/readCache';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

/** Bundled at android/app/src/main/res/raw/homam_video.mp4 */
const HOMAM_VIDEO_URI =
  Platform.OS === 'android'
    ? 'android.resource://com.japasiddhi/raw/homam_video'
    : '';

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
  const [videoPlaying, setVideoPlaying] = useState(false);
  const hasEnrollmentRef = useRef(false);

  const playHomamVideo = async () => {
    if (videoPlaying) {
      return;
    }
    if (!HOMAM_VIDEO_URI) {
      Alert.alert(
        t('nithyaHomam'),
        t('introVideoPlayError') || 'Could not play this video.',
      );
      return;
    }
    setVideoPlaying(true);
    const ok = await playIntroVideo(HOMAM_VIDEO_URI);
    setVideoPlaying(false);
    if (!ok) {
      Alert.alert(
        t('nithyaHomam'),
        t('introVideoPlayError') || 'Could not play this video.',
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const cached = getReadCache<{enrollment: EnrollmentState | null}>(
        'homam:status',
      );
      if (cached && !hasEnrollmentRef.current) {
        setEnrollment(cached.enrollment);
        hasEnrollmentRef.current = true;
        setLoading(false);
      } else if (hasEnrollmentRef.current) {
        setLoading(false);
      } else {
        setLoading(true);
      }
      apiService
        .get('/donations/homam-status')
        .then(response => {
          if (!active) {
            return;
          }
          const statusRow = response.data?.data || null;
          let next: EnrollmentState | null = null;
          if (!statusRow?.id) {
            next = null;
          } else {
            const payment = String(statusRow.paymentStatus || '').toUpperCase();
            const orderStatus = String(statusRow.orderStatus || '').toUpperCase();
            if (orderStatus === 'INACTIVE' || orderStatus === 'CANCELLED') {
              next = {
                code: statusRow.code || `NH${statusRow.id}`,
                status: 'Inactive',
                stage: 'Inactive',
              };
            } else if (payment === 'SUCCESS' || orderStatus === 'ACTIVE') {
              next = {
                code: statusRow.code || `NH${statusRow.id}`,
                status: 'Active',
                stage: 'Verified',
              };
            } else {
              next = {
                code: statusRow.code || `NH${statusRow.id}`,
                status: 'Pending',
                stage: 'Pending verification',
              };
            }
          }
          setEnrollment(next);
          hasEnrollmentRef.current = true;
          setReadCache('homam:status', {enrollment: next}, READ_TTL_MS);
        })
        .catch(() => {
          if (active && !hasEnrollmentRef.current) {
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
    <ScreenLayout title={t('nithyaHomam')} showBack tab="SevaHub">
      <MenuCard
        emoji="🔥"
        title={t('dailySacredHomam')}
        subtitle={t('enrollNithyaHomam')}
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
            {t(
              enrollment.stage === 'Verified'
                ? 'stageVerified'
                : enrollment.stage === 'Inactive'
                  ? 'stageInactive'
                  : 'stagePendingVerification',
            )}{' '}
            •{' '}
            {t(
              enrollment.status === 'Active'
                ? 'statusActive'
                : enrollment.status === 'Inactive'
                  ? 'statusInactive'
                  : 'statusPending',
            )}
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

      {!loading ? (
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

          <Text style={styles.howTitle}>
            {t('howWeDoHomam') || 'How we do homam'}
          </Text>
          <TouchableOpacity
            style={styles.videoCard}
            activeOpacity={0.9}
            onPress={() => void playHomamVideo()}
            disabled={videoPlaying}>
            <View style={styles.videoInner}>
              {videoPlaying ? (
                <ActivityIndicator size="small" color={Colors.templeGold} />
              ) : (
                <Text style={styles.videoPlayIcon}>▶</Text>
              )}
              <Text style={styles.videoPlayLabel}>
                {videoPlaying
                  ? t('openingVideo') || 'Opening video…'
                  : t('tapToPlayHomamVideo') || 'Tap to play video'}
              </Text>
            </View>
          </TouchableOpacity>
        </>
      ) : null}

      {!loading && (!enrollment || enrollment.status === 'Inactive') ? (
        <>
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
  howTitle: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 18,
    marginBottom: 10,
    includeFontPadding: true,
  },
  videoCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: '#2A2118',
    overflow: 'hidden',
    minHeight: 168,
    justifyContent: 'center',
  },
  videoInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
    gap: 10,
  },
  videoPlayIcon: {
    color: Colors.templeGold,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
  },
  videoPlayLabel: {
    color: '#F5EFE4',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
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
