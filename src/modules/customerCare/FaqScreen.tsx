import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const FAQS = [
  {
    q: 'How does Smart Japa counting work?',
    a: 'Record one reference chant, then tap anywhere on the screen at that pace. Taps that are too fast are not counted.',
  },
  {
    q: 'Where is the OTP sent?',
    a: 'A 4-digit OTP is sent to the email you enter on login.',
  },
  {
    q: 'How do I change language?',
    a: 'Go to Profile → Settings → Language.',
  },
  {
    q: 'How do I track an order?',
    a: 'Open Orders & Tracking from Home or the Orders tab.',
  },
];

const FaqScreen = () => {
  return (
    <ScreenLayout title="FAQ">
      {FAQS.map(item => (
        <View key={item.q} style={styles.card}>
          <Text style={styles.q}>{item.q}</Text>
          <Text style={styles.a}>{item.a}</Text>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default FaqScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  q: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  a: {marginTop: 8, color: Colors.textSecondary, lineHeight: 22},
});
