import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../../theme/colors';
import {HomeBanner as HomeBannerModel} from '../types/home';

export interface AnnouncementItem {
  id?: number | string;
  title: string;
  subtitle?: string;
}

interface Props {
  banner?: HomeBannerModel;
  onPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  announcements?: AnnouncementItem[] | string[] | string | null;
  announcementText?: string | null;
}

const HomeBanner: React.FC<Props> = ({
  banner,
  onPress,
  secondaryButtonText,
  onSecondaryPress,
  announcements,
  announcementText,
}) => {
  const bannerSource =
    banner?.imageUrl && banner.imageUrl.trim() !== ''
      ? {uri: banner.imageUrl}
      : require('../../../assets/images/home_banner.jpg');

  const announcementList: string[] = [];
  if (typeof announcementText === 'string' && announcementText.trim()) {
    announcementList.push(announcementText.trim());
  } else if (typeof announcements === 'string' && announcements.trim()) {
    announcementList.push(announcements.trim());
  } else if (Array.isArray(announcements)) {
    announcements.forEach(item => {
      if (typeof item === 'string') {
        if (item.trim()) {
          announcementList.push(item.trim());
        }
      } else if (item && typeof item === 'object') {
        const titleStr = String(item.title || '').trim();
        const subStr = String(item.subtitle || '').trim();
        const full = [titleStr, subStr].filter(Boolean).join(' • ').trim();
        if (full) {
          announcementList.push(full);
        }
      }
    });
  }

  const hasAnnouncements = announcementList.length > 0;
  const announcementTextLine = announcementList[0] || '';

  return (
    <View
      style={[
        styles.container,
        hasAnnouncements && styles.containerWithAnnouncement,
      ]}>
      <Image source={bannerSource} resizeMode="cover" style={styles.image} />
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top — near Om */}
        {secondaryButtonText ? (
          <TouchableOpacity
            style={[styles.card, styles.cardTop]}
            activeOpacity={0.85}
            onPress={onSecondaryPress}>
            <Text style={styles.cardText} numberOfLines={2}>
              {secondaryButtonText}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Middle — Start Chanting */}
        <TouchableOpacity
          style={[styles.card, styles.cardMid]}
          activeOpacity={0.85}
          onPress={onPress}>
          <Text style={styles.cardText} numberOfLines={2}>
            {banner?.buttonText || 'Start Japa'}
          </Text>
        </TouchableOpacity>

        {/* Bottom — announcement */}
        {hasAnnouncements ? (
          <View
            style={[styles.card, styles.cardBot]}
            pointerEvents="none">
            <Text style={styles.cardText} numberOfLines={2}>
              {announcementTextLine}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default HomeBanner;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.85,
    maxHeight: 230,
    minHeight: 200,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerWithAnnouncement: {
    aspectRatio: 1.76,
    maxHeight: 245,
    minHeight: 215,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 36,
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  cardTop: {
    top: '4%',
  },
  cardMid: {
    top: '42%',
  },
  cardBot: {
    top: '78%',
    backgroundColor: '#FFFFFF',
  },
  cardText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 16,
    includeFontPadding: false,
    textAlign: 'center',
    width: '100%',
  },
});
