import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '../../navigation/AppNavigator';
import apiService from '../../services/apiService';
import {clearSession, hydrateSession, saveSession} from '../../services/session';
import {getLanguage} from '../../services/language';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen = ({navigation}: Props) => {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const goAfterSession = (user: any) => {
    const profileCompleted = [1, '1', true, 'true'].includes(
      user?.profileCompleted ?? user?.profile_completed,
    );
    if (profileCompleted) {
      navigation.replace('Home');
      return;
    }
    navigation.replace('SignupPersonal', {
      phoneNumber: `${user?.mobileCountryCode || ''}${user?.mobileNumber || ''}`,
      mobileCountryCode: user?.mobileCountryCode,
      mobileNumber: user?.mobileNumber,
      email: user?.email,
    });
  };

  const initializeApp = async () => {
    try {
      const session = await hydrateSession();
      if (!session.token) {
        setChecking(false);
        return;
      }

      const response = await apiService.get('/auth/profile');
      const user = response.data?.data;
      if (user) {
        await saveSession(session.token, user);
      }
      goAfterSession(user || session.user);
    } catch (error) {
      await clearSession();
      setChecking(false);
    }
  };

  const getStarted = async () => {
    const language = await getLanguage();
    navigation.replace(language ? 'Login' : 'LanguageSelect');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <View style={styles.center}>
        <Image
          source={require('../../assets/images/splash_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>JAPA SIDDHI</Text>
        <Text style={styles.byline}>by Bilva Patra Trust</Text>
        <Text style={styles.tagline}>
          A digital space for Japa, Annadanam and spiritual participation
        </Text>
        <View style={styles.features}>
          <Text style={styles.feature}>JAPA</Text>
          <Text style={styles.feature}>ANNADANAM</Text>
          <Text style={styles.feature}>SEVA</Text>
        </View>
      </View>
      {checking ? (
        <ActivityIndicator size="large" color={Colors.templeGold} style={styles.loader} />
      ) : (
        <View style={styles.footer}>
          <PrimaryButton title="GET STARTED  →" onPress={getStarted} />
          <Text style={styles.faith}>Faith  •  Service  •  Devotion</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.sacredBrown,
    letterSpacing: 1,
  },
  byline: {
    marginTop: 6,
    fontSize: 16,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  tagline: {
    marginTop: 16,
    textAlign: 'center',
    color: Colors.sacredBrown,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  features: {
    flexDirection: 'row',
    marginTop: 22,
    gap: 16,
  },
  feature: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  footer: {
    paddingBottom: 20,
  },
  loader: {
    marginBottom: 48,
  },
  faith: {
    textAlign: 'center',
    marginTop: 16,
    color: Colors.leafGreen,
    fontWeight: '600',
  },
});
