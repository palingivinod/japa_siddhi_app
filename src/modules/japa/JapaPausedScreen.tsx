import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const JapaPausedScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  return (
    <ScreenLayout title="Japa Paused" showBack tab="JapaHub">
      <View style={styles.circle}>
        <Text style={styles.pause}>❚❚</Text>
      </View>
      <Text style={styles.title}>Japa is paused</Text>
      <Text style={styles.copy}>Your count is safely preserved.</Text>
      <View style={styles.card}>
        <View style={styles.dot} />
        <View>
          <Text style={styles.cardTitle}>Auto-lock active</Text>
          <Text style={styles.meta}>Screen lock prevents accidental counts.</Text>
        </View>
      </View>
      <PrimaryButton
        title="RESUME JAPA"
        onPress={() => navigation.goBack()}
      />
      <View style={styles.gap} />
      <OutlineButton
        title="END SESSION"
        onPress={() =>
          navigation.replace('JapaProgress', {
            count: route.params?.count,
            goal: route.params?.goal,
          })
        }
      />
    </ScreenLayout>
  );
};

export default JapaPausedScreen;

const styles = StyleSheet.create({
  circle: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  pause: {fontSize: 36, color: Colors.sacredBrown},
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 16,
  },
  copy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.sacredBrown,
    marginRight: 12,
  },
  cardTitle: {fontWeight: '800', color: Colors.sacredBrown},
  meta: {marginTop: 4, color: Colors.textSecondary},
  gap: {height: 12},
});
