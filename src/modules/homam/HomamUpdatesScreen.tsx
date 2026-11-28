import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import {playIntroVideo} from '../../services/introVideos';
import {resolveMediaUrl} from '../../services/profilePhoto';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import {
  fetchHomamUpdates,
  HomamUpdate,
  markHomamUpdatesRead,
} from './homamUpdates';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "28 Nov 2026, 6:30 PM" in India time. */
const formatIst = (raw: string) => {
  const ms = new Date(raw).getTime();
  if (!Number.isFinite(ms)) {
    return '';
  }
  const d = new Date(ms + 5.5 * 60 * 60 * 1000);
  const h24 = d.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h12}:${mm} ${
    h24 < 12 ? 'AM' : 'PM'
  }`;
};

/**
 * Messages the admin sent to this devotee about Nithya Homam: text, photo,
 * video, audio and link. Opening the screen clears the Home card badge.
 */
const HomamUpdatesScreen = () => {
  const {t} = useLanguage();
  const [items, setItems] = useState<HomamUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const rows = await fetchHomamUpdates();
      setItems(rows);
      // Mark read only after they are on screen; unread dots stay for this visit.
      if (rows.some(row => !row.isRead)) {
        void markHomamUpdatesRead();
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const playMedia = async (key: string, kind: 'video' | 'audio', url: string) => {
    const uri = resolveMediaUrl(url);
    if (!uri || playing) {
      return;
    }
    setPlaying(key);
    const ok = await playIntroVideo(uri);
    setPlaying('');
    if (!ok) {
      Alert.alert(
        kind === 'video' ? 'Video' : 'Audio',
        `Could not play this ${kind}. Check your connection.`,
      );
    }
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link', 'Could not open this link.');
    }
  };

  return (
    <ScreenLayout title={t('homamUpdatesTitle')} showBack tab="SevaHub">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && failed ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('homamUpdatesLoadError')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>{t('tryAgain') || 'Try again'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !failed && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('homamUpdatesEmpty')}</Text>
        </View>
      ) : null}

      {!loading && !failed
        ? items.map(item => {
            const imageUri = resolveMediaUrl(item.imageUrl);
            const videoKey = `v${item.id}`;
            const audioKey = `a${item.id}`;
            return (
              <View
                key={item.id}
                style={[styles.card, !item.isRead && styles.cardNew]}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{item.title || '🔥'}</Text>
                  {!item.isRead ? (
                    <View style={styles.newPill}>
                      <Text style={styles.newPillText}>{t('homamUpdateNew')}</Text>
                    </View>
                  ) : null}
                </View>
                {item.createdAt ? (
                  <Text style={styles.date}>{formatIst(item.createdAt)}</Text>
                ) : null}

                {imageUri ? (
                  <Image
                    source={{uri: imageUri}}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : null}

                {item.message ? (
                  <Text style={styles.message}>{item.message}</Text>
                ) : null}

                {item.videoUrl ? (
                  <TouchableOpacity
                    style={styles.mediaCard}
                    activeOpacity={0.85}
                    disabled={Boolean(playing)}
                    onPress={() =>
                      void playMedia(videoKey, 'video', item.videoUrl)
                    }>
                    {playing === videoKey ? (
                      <ActivityIndicator size="small" color={Colors.templeGold} />
                    ) : (
                      <Text style={styles.mediaIcon}>▶</Text>
                    )}
                    <Text style={styles.mediaLabel}>
                      {playing === videoKey
                        ? t('openingVideo') || 'Opening video…'
                        : t('tapToPlayHomamVideo') || 'Tap to play video'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {item.audioUrl ? (
                  <TouchableOpacity
                    style={styles.mediaCard}
                    activeOpacity={0.85}
                    disabled={Boolean(playing)}
                    onPress={() =>
                      void playMedia(audioKey, 'audio', item.audioUrl)
                    }>
                    {playing === audioKey ? (
                      <ActivityIndicator size="small" color={Colors.templeGold} />
                    ) : (
                      <Text style={styles.mediaIcon}>🔊</Text>
                    )}
                    <Text style={styles.mediaLabel}>
                      {playing === audioKey
                        ? 'Opening audio…'
                        : 'Tap to play audio'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {item.linkUrl ? (
                  <TouchableOpacity
                    style={styles.linkBtn}
                    activeOpacity={0.85}
                    onPress={() => void openLink(item.linkUrl)}>
                    <Text style={styles.linkText} numberOfLines={1}>
                      🔗 {item.linkUrl.replace(/^https?:\/\//i, '')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        : null}
    </ScreenLayout>
  );
};

export default HomamUpdatesScreen;

const styles = StyleSheet.create({
  center: {paddingVertical: 40, alignItems: 'center'},
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {color: Colors.sacredBrown, fontWeight: '800'},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardNew: {
    borderColor: '#D32F2F',
    borderWidth: 1.5,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  newPill: {
    marginLeft: 8,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newPillText: {color: '#FFFFFF', fontSize: 11, fontWeight: '800'},
  date: {
    marginTop: 2,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: Colors.cream,
  },
  message: {
    marginTop: 12,
    fontSize: 15.5,
    lineHeight: 23,
    color: Colors.textPrimary,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginTop: 12,
  },
  mediaIcon: {fontSize: 20, color: Colors.leafGreen, marginRight: 12},
  mediaLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  linkBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  linkText: {color: Colors.leafGreen, fontWeight: '800', fontSize: 15},
});
