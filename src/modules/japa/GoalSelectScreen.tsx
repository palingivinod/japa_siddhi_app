import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const PRESETS = [108, 500, 1000, 2000, 5000];

const GoalSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [goal, setGoal] = useState(Number(route.params?.goal || 2000));

  const start = async () => {
    try {
      await apiService.post('/japa-goals', {
        mantraType: route.params?.mode === 'private' ? 'PERSONAL' : 'DEFAULT',
        mantraId: route.params?.mantraId,
        goalName: route.params?.mode === 'private' ? 'Private Japa' : 'Daily Japa',
        targetCount: goal,
        days: 1,
        startDate: new Date().toISOString().slice(0, 10),
      });
    } catch {
      undefined;
    }
    navigation.navigate('ReferenceChant', {
      mode: route.params?.mode || 'community',
      mantraId: route.params?.mantraId,
      goal,
    });
  };

  return (
    <ScreenLayout title="Set Your Goal" showBack tab="JapaHub">
      <Text style={styles.hint}>How many chants today?</Text>
      <View style={styles.circle}>
        <Text style={styles.count}>{goal.toLocaleString()}</Text>
        <Text style={styles.japas}>JAPAS</Text>
      </View>
      <View style={styles.row}>
        {PRESETS.map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, goal === item && styles.chipOn]}
            onPress={() => setGoal(item)}>
            <Text style={[styles.chipText, goal === item && styles.chipTextOn]}>
              {item.toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <PrimaryButton title="START JAPA" onPress={start} />
    </ScreenLayout>
  );
};

export default GoalSelectScreen;

const styles = StyleSheet.create({
  hint: {
    textAlign: 'center',
    color: Colors.sacredBrown,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  circle: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  count: {fontSize: 36, fontWeight: '800', color: Colors.sacredBrown},
  japas: {marginTop: 4, color: Colors.leafGreen, fontWeight: '800'},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24},
  chip: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  chipOn: {borderColor: Colors.sacredBrown, borderWidth: 2},
  chipText: {color: Colors.sacredBrown, fontWeight: '700'},
  chipTextOn: {color: Colors.sacredBrown},
});
