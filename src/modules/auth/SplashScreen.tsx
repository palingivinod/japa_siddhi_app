import React from 'react';
import {Image, StatusBar, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '../../navigation/AppNavigator';
import Colors from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen = ({navigation}: Props) => {
  const getStarted = () => {
    navigation.replace('LanguageSelect');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <View style={styles.stage}>
        <Image
          source={require('../../assets/images/splash_welcome.png')}
          style={styles.hero}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.hit}
          onPress={getStarted}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Get started"
        />
      </View>
    </SafeAreaView>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stage: {
    flex: 1,
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  hit: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '62%',
    bottom: 12,
  },
});
