import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const formatDate = (value?: Date | null) => {
  if (!value) {
    return '';
  }
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseApiDate = (value?: string) => {
  const iso = String(value || '').slice(0, 10);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const daysUntil = (value?: Date | null) => {
  if (!value) {
    return 1;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(0, 0, 0, 0);
  return Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
};

const GoalSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [goalType, setGoalType] = useState<'count' | 'date'>('count');
  const [goalText, setGoalText] = useState(
    route.params?.goal ? String(route.params.goal) : '',
  );
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const goal = Number(String(goalText).replace(/[^\d]/g, '')) || 0;
  const remainingDays = useMemo(() => daysUntil(endDate), [endDate]);
  const dailyTarget = Math.max(1, Math.ceil(goal / remainingDays));

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const response = await apiService.get('/japa-goals');
          const rows = response.data?.data ?? [];
          const mode = route.params?.mode;
          const mantraId = route.params?.mantraId;
          const saved =
            rows.find((item: any) => {
              if (String(item.status || '').toUpperCase() !== 'ACTIVE') {
                return false;
              }
              if (mode === 'private') {
                return item.mantraType === 'PERSONAL';
              }
              if (mantraId) {
                return Number(item.mantraId) === Number(mantraId);
              }
              return true;
            }) ||
            rows.find(
              (item: any) =>
                String(item.status || '').toUpperCase() === 'ACTIVE',
            );
          if (!active || !saved) {
            return;
          }
          if (!route.params?.goal && saved.targetCount) {
            setGoalText(String(saved.targetCount));
          }
          const parsed = parseApiDate(saved.endDate);
          if (parsed) {
            setEndDate(parsed);
          }
          if (
            Number(saved.days || 0) > 1 ||
            (saved.startDate &&
              saved.endDate &&
              saved.startDate !== saved.endDate)
          ) {
            setGoalType('date');
          }
        } catch {
          undefined;
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [route.params?.goal, route.params?.mantraId, route.params?.mode]),
  );

  const onPickDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowCalendar(false);
    }
    if (event.type === 'dismissed') {
      setShowCalendar(false);
      return;
    }
    if (selected) {
      setEndDate(selected);
    }
    if (Platform.OS === 'ios' && event.type === 'set') {
      setShowCalendar(false);
    }
  };

  const start = async () => {
    if (goal < 1) {
      Alert.alert(t('setYourGoal'), 'Set a goal count to start.');
      return;
    }
    if (goalType === 'date' && !endDate) {
      Alert.alert(t('setYourGoal'), 'Pick a goal date from the calendar.');
      return;
    }
    const challengeId = Number(route.params?.challengeId || 0) || undefined;
    if (!challengeId) {
      try {
        await apiService.post('/japa-goals', {
          mantraType: route.params?.mode === 'private' ? 'PERSONAL' : 'DEFAULT',
          mantraId: route.params?.mantraId,
          goalName:
            route.params?.mode === 'private' ? 'Private Japa' : 'Daily Japa',
          targetCount: goal,
          days: goalType === 'date' ? remainingDays : 1,
          startDate: new Date().toISOString().slice(0, 10),
        });
      } catch {
        undefined;
      }
    }
    navigation.navigate('Chant', {
      mode: route.params?.mode || 'community',
      mantraId: route.params?.mantraId,
      privateMantra: route.params?.privateMantra,
      goal,
      goalType,
      endDate: formatDate(endDate),
      dailyTarget: goalType === 'date' ? dailyTarget : goal,
      challengeId,
      initialCount: route.params?.initialCount,
      durationMs: 2500,
    });
  };

  return (
    <ScreenLayout title="Set Your Goal" showBack tab="JapaHub">
      <Text style={styles.hint}>
        {goalType === 'count'
          ? 'How many chants today?'
          : 'Complete this count by a date'}
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
        <TextInput
          style={styles.countInput}
          value={goalText}
          onChangeText={text => setGoalText(text.replace(/[^\d]/g, ''))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.placeholder}
          textAlign="center"
        />
        <Text style={styles.japas}>JAPAS</Text>
      </View>

      {goalType === 'date' ? (
        <>
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => setShowCalendar(true)}
            activeOpacity={0.85}>
            <Text style={styles.calendarLabel}>
              {endDate ? formatDate(endDate) : 'Pick goal date'}
            </Text>
          </TouchableOpacity>
          {showCalendar ? (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              minimumDate={new Date()}
              onChange={onPickDate}
            />
          ) : null}
          {endDate && goal > 0 ? (
            <Text style={styles.meta}>
              {remainingDays} days left · {dailyTarget.toLocaleString()} chants
              each day
            </Text>
          ) : null}
        </>
      ) : null}

      {goal > 0 || endDate ? (
        <View style={styles.summaryBox}>
          {goal > 0 ? (
            <Text style={styles.summary}>
              Goal count : {goal.toLocaleString()}
            </Text>
          ) : null}
          {endDate ? (
            <Text style={styles.summary}>Date goal : {formatDate(endDate)}</Text>
          ) : null}
        </View>
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
    paddingHorizontal: 12,
  },
  countInput: {
    minWidth: 140,
    fontSize: 36,
    fontWeight: '800',
    color: Colors.sacredBrown,
    padding: 0,
  },
  japas: {marginTop: 4, color: Colors.leafGreen, fontWeight: '800'},
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
  summaryBox: {
    marginTop: 8,
    marginBottom: 16,
  },
  summary: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  calendarBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  calendarLabel: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 16,
  },
  meta: {
    color: Colors.textSecondary,
    marginBottom: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
