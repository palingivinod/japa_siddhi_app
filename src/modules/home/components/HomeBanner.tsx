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
}

const HomeBanner: React.FC<Props> = ({banner, onPress}) => {
  const bannerSource =
    banner?.imageUrl && banner.imageUrl.trim() !== ''
      ? {uri: banner.imageUrl}
      : require('../../../assets/images/home_banner.jpg');

  return (
    <View style={styles.container}>
      <Image source={bannerSource} resizeMode="contain" style={styles.image} />
      <View style={styles.overlay} pointerEvents="box-none">
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  button: {
    backgroundColor: Colors.cream,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
