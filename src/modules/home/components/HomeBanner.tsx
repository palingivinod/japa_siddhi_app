import React from 'react';
import {
  ImageBackground,
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

const HomeBanner: React.FC<Props> = ({
  banner,
  onPress,
}) => {
  const bannerSource =
    banner?.imageUrl && banner.imageUrl.trim() !== ''
      ? {uri: banner.imageUrl}
      : require('../../../assets/images/home_banner.webp');

  return (
    <ImageBackground
      source={bannerSource}
      resizeMode="cover"
      imageStyle={styles.image}
      style={styles.container}>

      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={onPress}>

          <Text style={styles.buttonText}>
            {banner?.buttonText || 'Start Japa'}
          </Text>

        </TouchableOpacity>
      </View>

    </ImageBackground>
  );
};

export default HomeBanner;

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },

  image: {
    borderRadius: 18,
  },

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },

  button: {
    alignSelf: 'flex-start',
    marginTop: 0,
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },

  buttonText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});