import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../../i18n/LanguageContext';
import {INTRO_VIDEOS} from '../../../services/introVideos';
import Colors from '../../../theme/colors';
import ScreenLayout from '../../common/ScreenLayout';

const IntroVideosScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  return (
    <ScreenLayout title={t('whyJapaSiddhiApp')} showBack>
      <Text style={styles.hint}>{t('introVideosHint')}</Text>
      {INTRO_VIDEOS.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('IntroVideoPlayer', {
              videoId: item.id,
              fromAuth: false,
            })
          }>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.sub}>{t(item.subtitleKey)}</Text>
          </View>
          <Text style={styles.play}>▶</Text>
        </TouchableOpacity>
      ))}
    </ScreenLayout>
  );
};

export default IntroVideosScreen;

const styles = StyleSheet.create({
  hint: {
    color: '#5A4A3A',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E2C6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeText: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 15,
  },
  copy: {flex: 1},
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
    lineHeight: 22,
  },
  sub: {
    marginTop: 2,
    fontSize: 13,
    color: '#5A4A3A',
    lineHeight: 18,
  },
  play: {
    fontSize: 18,
    color: Colors.leafGreen,
    marginLeft: 8,
  },
});
