import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const PRESETS = [108, 500, 1000, 2000, 5000, 10000];

const daysUntil = (value: string) => {
  const parts = String(value || '').split(/[/-]/);
  if (parts.length !== 3) {
    return 30;
  }
  const iso =
    parts[0].length === 4
      ? value
      : `${parts[2]}-${parts[1]}-${parts[0]}`;
  const diff = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff || 30);
};

const GoalSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [goalType, setGoalType] = useState<'count' | 'date'>('count');
  const [goal, setGoal] = useState(Number(route.params?.goal || 2000));
  const [endDate, setEndDate] = useState('31/12/2026');

  const remainingDays = useMemo(() => daysUntil(endDate), [endDate]);
  const dailyTarget = Math.ceil(goal / remainingDays);

  const start = async () => {
    try {
      await apiService.post('/japa-goals', {
        mantraType: route.params?.mode === 'private' ? 'PERSONAL' : 'DEFAULT',
        mantraId: route.params?.mantraId,
        goalName: route.params?.mode === 'private' ? 'Private Japa' : 'Daily Japa',
        targetCount: goal,
        days: goalType === 'date' ? remainingDays : 1,
        startDate: new Date().toISOString().slice(0, 10),
      });
    } catch {
      // Goal is stored locally for the chant session if the API is offline.
    }
    navigation.navigate('ReferenceChant', {
      mode: route.params?.mode || 'community',
      mantraId: route.params?.mantraId,
      goal,
      goalType,
      endDate,
      dailyTarget,
    });
  };

  return (
    <ScreenLayout title="Set Your Goal" showBack tab="JapaHub">
      <Text style={styles.hint}>
        {goalType === 'count' ? 'How many chants today?' : 'Complete this count by a date'}
      </Text>
      <View style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, goalType === 'count' && styles.chipOn]}
          onPress={() => setGoalType('count')}>
          <Text style={styles.chipText}>Count goal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, goalType === 'date' && styles.chipOn]}
          onPress={() => setGoalType('date')}>
          <Text style={styles.chipText}>Date goal</Text>
        </TouchableOpacity>
      </View>
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
            <Text style={styles.chipText}>{item.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {goalType === 'date' ? (
        <>
          <Text style={styles.label}>Complete before</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="DD / MM / YYYY"
          />
          <Text style={styles.meta}>
            {remainingDays} days left · {dailyTarget.toLocaleString()} chants each day
          </Text>
        </>
      ) : null}
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
    marginBottom: 16,
  },
  chips: {flexDirection: 'row', gap: 8, marginBottom: 16},
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
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
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
  label: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 8},
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  meta: {
    color: Colors.textSecondary,
    marginBottom: 20,
    fontWeight: '600',
  },
});
