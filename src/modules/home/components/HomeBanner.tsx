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

  return (
    <View
      style={[
        styles.container,
        hasAnnouncements && styles.containerWithAnnouncement,
      ]}>
      <Image source={bannerSource} resizeMode="cover" style={styles.image} />
      <View style={styles.overlay} pointerEvents="box-none">
        <View
          style={[
            styles.buttonStack,
            hasAnnouncements && styles.buttonStackWithAnnouncement,
          ]}
          pointerEvents="box-none">
          {secondaryButtonText ? (
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={onSecondaryPress}>
              <Text style={styles.buttonText}>{secondaryButtonText}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={onPress}>
            <Text style={styles.buttonText}>
              {banner?.buttonText || 'Start Japa'}
            </Text>
          </TouchableOpacity>
          {/* Non-clickable announcement text pill placed under chant button */}
          {announcementList.map((text, idx) => (
            <View
              key={`ann-${idx}`}
              style={styles.announcementPill}
              pointerEvents="none">
              <Text style={styles.announcementText} numberOfLines={2}>
                {text}
              </Text>
            </View>
          ))}
        </View>
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
    alignItems: 'center',
  },
  buttonStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
    gap: 18,
    width: '100%',
    paddingHorizontal: 16,
  },
  buttonStackWithAnnouncement: {
    bottom: 12,
    gap: 14,
  },
  button: {
    backgroundColor: Colors.cream,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: true,
    textAlign: 'center',
  },
  announcementPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '92%',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  announcementText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 19,
    includeFontPadding: true,
    textAlign: 'center',
  },
});
