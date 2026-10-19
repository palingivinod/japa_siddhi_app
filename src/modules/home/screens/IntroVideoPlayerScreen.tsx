import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../../i18n/LanguageContext';
import {
  INTRO_VIDEOS,
  markFirstIntroVideoSeen,
  playIntroVideo,
} from '../../../services/introVideos';
import Colors from '../../../theme/colors';
import ScreenLayout from '../../common/ScreenLayout';

const IntroVideoPlayerScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const videoId = String(route.params?.videoId || '');
  const fromAuth = Boolean(route.params?.fromAuth);
  const video = useMemo(
    () => INTRO_VIDEOS.find(item => item.id === videoId) || INTRO_VIDEOS[0],
    [videoId],
  );

  const goHome = useCallback(async () => {
    if (fromAuth) {
      await markFirstIntroVideoSeen();
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  }, [fromAuth, navigation]);

  const startPlay = useCallback(async () => {
    setError('');
    setPlaying(true);
    const ok = await playIntroVideo(video.url);
    setPlaying(false);
    if (!ok) {
      setError(t('introVideoPlayError'));
      return;
    }
    if (fromAuth) {
      await markFirstIntroVideoSeen();
    }
  }, [fromAuth, t, video.url]);

  useEffect(() => {
    void startPlay();
  }, [startPlay]);

  return (
    <ScreenLayout title={t(video.titleKey)} showBack={!fromAuth} scroll={false}>
      <View style={styles.body}>
        <Text style={styles.sub}>{t(video.subtitleKey)}</Text>
        <Text style={styles.note}>{t('introVideoDummyNote')}</Text>

        {playing ? (
          <ActivityIndicator
            color={Colors.templeGold}
            style={styles.spinner}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.primary}
          activeOpacity={0.85}
          onPress={() => void startPlay()}
          disabled={playing}>
          <Text style={styles.primaryText}>
            {playing ? t('loading') : t('playVideo')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          activeOpacity={0.85}
          onPress={() => void goHome()}>
          <Text style={styles.secondaryText}>
            {fromAuth ? t('continueToHome') : t('back')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};

export default IntroVideoPlayerScreen;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingTop: 12,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5A4A3A',
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.leafGreen,
    marginBottom: 20,
  },
  spinner: {marginVertical: 16},
  error: {
    color: '#B00020',
    marginBottom: 12,
    fontWeight: '600',
  },
  primary: {
    backgroundColor: Colors.sacredBrown,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    color: Colors.cream,
    fontWeight: '800',
    fontSize: 15,
  },
  secondary: {
    backgroundColor: Colors.cream,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
  },
  secondaryText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
  },
});
