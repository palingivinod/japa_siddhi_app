import React, {useCallback, useEffect, useState} from 'react';
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
import {useRoute} from '@react-navigation/native';

import {useLanguage} from '../../../i18n/LanguageContext';
import {playIntroVideo} from '../../../services/introVideos';
import {resolveMediaUrl} from '../../../services/profilePhoto';
import apiService, {getApiError} from '../../../services/apiService';
import Colors from '../../../theme/colors';
import ScreenLayout from '../../common/ScreenLayout';

type BannerDetail = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  uploadDate: string;
  imageUrl: string;
  videoUrl: string;
  audioUrl: string;
  linkUrl: string;
};

/**
 * Opens when a user taps the admin banner on Home. Shows only what the admin
 * added: photo, video, audio, description and link.
 */
const BannerDetailScreen = () => {
  const route = useRoute<any>();
  const {language} = useLanguage();
  const bannerId = route.params?.bannerId;
  const [banner, setBanner] = useState<BannerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState<'video' | 'audio' | ''>('');

  const load = useCallback(async () => {
    if (!bannerId) {
      setError('This banner is not available.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get(`/banners/${bannerId}`, {
        params: {lang: language || 'en'},
      });
      const row = response.data?.data;
      if (!row) {
        throw new Error('This banner is not available.');
      }
      setBanner({
        id: String(row.id),
        title: String(row.title || ''),
        subtitle: String(row.subtitle || ''),
        description: String(row.description || ''),
        uploadDate: String(row.uploadDate || ''),
        imageUrl: String(row.imageUrl || ''),
        videoUrl: String(row.videoUrl || ''),
        audioUrl: String(row.audioUrl || ''),
        linkUrl: String(row.linkUrl || ''),
      });
    } catch (err: any) {
      setBanner(null);
      setError(
        err?.response?.status === 404
          ? 'This banner is no longer available.'
          : getApiError(err, 'Could not load this banner.'),
      );
    } finally {
      setLoading(false);
    }
  }, [bannerId, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const playMedia = async (kind: 'video' | 'audio', url: string) => {
    const uri = resolveMediaUrl(url);
    if (!uri || playing) {
      return;
    }
    setPlaying(kind);
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

  const imageUri = banner ? resolveMediaUrl(banner.imageUrl) : null;
  const hasAnyContent = Boolean(
    banner &&
      (banner.description ||
        banner.imageUrl ||
        banner.videoUrl ||
        banner.audioUrl ||
        banner.linkUrl ||
        banner.subtitle),
  );

  return (
    <ScreenLayout title="Japa Siddhi" showBack>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && banner ? (
        <View>
          <Text style={styles.title}>{banner.title}</Text>
          {banner.subtitle ? (
            <Text style={styles.subtitle}>{banner.subtitle}</Text>
          ) : null}

          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}

          {banner.videoUrl ? (
            <TouchableOpacity
              style={styles.mediaCard}
              activeOpacity={0.85}
              disabled={Boolean(playing)}
              onPress={() => void playMedia('video', banner.videoUrl)}>
              {playing === 'video' ? (
                <ActivityIndicator size="small" color={Colors.templeGold} />
              ) : (
                <Text style={styles.mediaIcon}>▶</Text>
              )}
              <Text style={styles.mediaLabel}>
                {playing === 'video' ? 'Opening video…' : 'Tap to play video'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {banner.audioUrl ? (
            <TouchableOpacity
              style={styles.mediaCard}
              activeOpacity={0.85}
              disabled={Boolean(playing)}
              onPress={() => void playMedia('audio', banner.audioUrl)}>
              {playing === 'audio' ? (
                <ActivityIndicator size="small" color={Colors.templeGold} />
              ) : (
                <Text style={styles.mediaIcon}>🔊</Text>
              )}
              <Text style={styles.mediaLabel}>
                {playing === 'audio' ? 'Opening audio…' : 'Tap to play audio'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {banner.description ? (
            <Text style={styles.description}>{banner.description}</Text>
          ) : null}

          {banner.linkUrl ? (
            <TouchableOpacity
              style={styles.linkBtn}
              activeOpacity={0.85}
              onPress={() => void openLink(banner.linkUrl)}>
              <Text style={styles.linkText} numberOfLines={1}>
                🔗 {banner.linkUrl.replace(/^https?:\/\//i, '')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {!hasAnyContent ? (
            <Text style={styles.empty}>
              More details will be added here soon.
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScreenLayout>
  );
};

export default BannerDetailScreen;

const styles = StyleSheet.create({
  center: {paddingVertical: 40, alignItems: 'center'},
  errorText: {
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: Colors.cream,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginTop: 14,
  },
  mediaIcon: {fontSize: 22, color: Colors.leafGreen, marginRight: 12},
  mediaLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  description: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  linkBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  linkText: {color: Colors.leafGreen, fontWeight: '800', fontSize: 15},
  empty: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
