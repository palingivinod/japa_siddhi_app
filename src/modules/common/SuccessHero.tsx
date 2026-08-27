import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';

const SuccessHero = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.wrap}>
    <View style={styles.circle}>
      <Text style={styles.check}>✓</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
  </View>
);

export default SuccessHero;

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', marginVertical: 28},
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  check: {color: Colors.white, fontSize: 42, fontWeight: '800'},
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    color: Colors.leafGreen,
    fontWeight: '700',
    textAlign: 'center',
  },
});
