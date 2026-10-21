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

interface Props {
  banner?: HomeBannerModel;
  onPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

const HomeBanner: React.FC<Props> = ({
  banner,
  onPress,
  secondaryButtonText,
  onSecondaryPress,
}) => {
  const bannerSource =
    banner?.imageUrl && banner.imageUrl.trim() !== ''
      ? {uri: banner.imageUrl}
      : require('../../../assets/images/home_banner.jpg');

  return (
    <View style={styles.container}>
      <Image source={bannerSource} resizeMode="contain" style={styles.image} />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.buttonStack} pointerEvents="box-none">
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
    // Below the gold lotus line beneath the Om.
    top: '42%',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: Colors.cream,
    paddingHorizontal: 4,
    paddingVertical: 4,
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
    fontSize: 11,
    lineHeight: 16,
    includeFontPadding: true,
    textAlign: 'center',
  },
});
