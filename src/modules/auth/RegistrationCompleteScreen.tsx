import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';

const RegistrationCompleteScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="Registration Complete" showBack>
      <View style={styles.check}>
        <Text style={styles.mark}>✓</Text>
      </View>
      <Text style={styles.title}>Welcome to Japa Siddhi</Text>
      <Text style={styles.copy}>Your spiritual journey begins today.</Text>
      <View style={styles.card}>
        <View style={styles.dot} />
        <View>
          <Text style={styles.cardTitle}>Your Profile</Text>
          <Text style={styles.meta}>Profile created successfully</Text>
          <Text style={styles.meta}>Personal + spiritual details saved</Text>
        </View>
      </View>
      <PrimaryButton
        title="CLAIM WELCOME GIFT"
        onPress={() => navigation.replace('WelcomeGift')}
      />
      <View style={styles.gap} />
      <PrimaryButton title="GO TO HOME" onPress={() => navigation.replace('Home')} />
    </ScreenLayout>
  );
};

export default RegistrationCompleteScreen;

const styles = StyleSheet.create({
  check: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  mark: {color: Colors.white, fontSize: 40, fontWeight: '800'},
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 18,
  },
  copy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    marginRight: 12,
  },
  cardTitle: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  meta: {marginTop: 4, color: Colors.textSecondary},
  gap: {height: 12},
});
