import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
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
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
};

const getDateFromDays = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, days - 1));
  return d;
};

const PRESET_GOALS = [108, 1008, 10116, 50116, 100116];
const QUICK_DEADLINE_DAYS = [
  {label: 'Today', days: 1},
  {label: '7 Days', days: 7},
  {label: '11 Days', days: 11},
  {label: '21 Days', days: 21},
  {label: '41 Days', days: 41},
];

const GoalSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [goalType, setGoalType] = useState<'count' | 'date'>('date');
  const [goalText, setGoalText] = useState(
    route.params?.goal ? String(route.params.goal) : '',
  );
  const [endDate, setEndDate] = useState<Date | null>(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [todayTargetInput, setTodayTargetInput] = useState('');
  const [isTodayCustom, setIsTodayCustom] = useState(false);

  const goal = Number(String(goalText).replace(/[^\d]/g, '')) || 0;
  const remainingDays = useMemo(() => daysUntil(endDate), [endDate]);
  const defaultDailyTarget = useMemo(() => {
    if (goal <= 0) return 0;
    return Math.max(1, Math.ceil(goal / remainingDays));
  }, [goal, remainingDays]);

  const effectiveTodayTarget = useMemo(() => {
    if (goalType !== 'date') return goal;
    if (isTodayCustom && todayTargetInput !== '') {
      const parsed = Number(String(todayTargetInput).replace(/[^\d]/g, ''));
      if (parsed >= defaultDailyTarget) return parsed;
    }
    return defaultDailyTarget;
  }, [goalType, isTodayCustom, todayTargetInput, defaultDailyTarget, goal]);

  const futureDailyTarget = useMemo(() => {
    if (remainingDays <= 1) return 0;
    const remainingAfterToday = Math.max(0, goal - effectiveTodayTarget);
    return Math.ceil(remainingAfterToday / (remainingDays - 1));
  }, [goal, effectiveTodayTarget, remainingDays]);

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

  const start = async () => {
    if (goal < 1) {
      Alert.alert(t('setYourGoal'), t('setGoalCountToStart'));
      return;
    }
    if (goalType === 'date' && !endDate) {
      Alert.alert(t('setYourGoal'), t('pickGoalDateFromCalendar'));
      return;
    }
    if (goalType === 'date' && isTodayCustom && todayTargetInput !== '') {
      const parsed = Number(String(todayTargetInput).replace(/[^\d]/g, ''));
      if (parsed < defaultDailyTarget) {
        Alert.alert(
          t('setYourGoal'),
          t('customTargetMinError', {count: defaultDailyTarget}) ||
            `Must be at least ${defaultDailyTarget} Japas per day.`,
        );
        return;
      }
    }
    const challengeId = Number(route.params?.challengeId || 0) || undefined;
    if (!challengeId) {
      try {
        await apiService.post('/japa-goals', {
          mantraType: route.params?.mode === 'private' ? 'PERSONAL' : 'DEFAULT',
          mantraId: route.params?.mantraId,
          personalMantraId: route.params?.personalMantraId,
          goalName:
            route.params?.mode === 'private'
              ? String(route.params?.privateMantra || 'My Japa').slice(0, 80)
              : 'Daily Japa',
          targetCount: goal,
          dailyTarget: effectiveTodayTarget,
          days: goalType === 'date' ? remainingDays : 1,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: endDate ? endDate.toISOString().slice(0, 10) : undefined,
        });
      } catch {
        undefined;
      }
    }
    navigation.navigate('Chant', {
      mode: route.params?.mode || 'community',
      mantraId: route.params?.mantraId,
      privateMantra: route.params?.privateMantra,
      personalMantraId: route.params?.personalMantraId,
      goal: effectiveTodayTarget,
      totalGoal: goal,
      goalType,
      endDate: formatDate(endDate),
      dailyTarget: effectiveTodayTarget,
      challengeId,
      initialCount: route.params?.initialCount,
      durationMs: 2500,
      remainingDays,
    });
  };

  return (
    <ScreenLayout title="Set Your Goal" showBack tab="JapaHub">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          {goalType === 'count'
            ? t('howManyChantsToday')
            : t('completeCountByDate')}
        </Text>
        <View style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, goalType === 'count' && styles.chipOn]}
            onPress={() => setGoalType('count')}>
            <Text style={styles.chipText}>{t('countGoal')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, goalType === 'date' && styles.chipOn]}
            onPress={() => setGoalType('date')}>
            <Text style={styles.chipText}>{t('dateGoal')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.circle}>
          <TextInput
            style={styles.countInput}
            value={goalText}
            onChangeText={text => {
              setGoalText(text.replace(/[^\d]/g, ''));
              setIsTodayCustom(false);
              setTodayTargetInput('');
            }}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.placeholder}
            textAlign="center"
          />
          <Text style={styles.japas}>{t('japasLabel')}</Text>
        </View>

        <View style={styles.presetsRow}>
          {PRESET_GOALS.map(preset => {
            const isSelected = goal === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  isSelected && styles.presetChipActive,
                ]}
                onPress={() => {
                  setGoalText(String(preset));
                  setIsTodayCustom(false);
                  setTodayTargetInput('');
                }}>
                <Text
                  style={[
                    styles.presetText,
                    isSelected && styles.presetTextActive,
                  ]}>
                  {preset.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {goalType === 'date' ? (
          <>
            <Text style={styles.sectionLabel}>
              {t('deadlineDate') || 'Goal End Date / Deadline'}
            </Text>
            <View style={styles.quickDaysRow}>
              {QUICK_DEADLINE_DAYS.map(item => {
                const isSelected = remainingDays === item.days;
                return (
                  <TouchableOpacity
                    key={item.days}
                    style={[
                      styles.quickDayChip,
                      isSelected && styles.quickDayChipActive,
                    ]}
                    onPress={() => {
                      setEndDate(getDateFromDays(item.days));
                      setIsTodayCustom(false);
                      setTodayTargetInput('');
                    }}>
                    <Text
                      style={[
                        styles.quickDayText,
                        isSelected && styles.quickDayTextActive,
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.calendarBtn}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.85}>
              <Text style={styles.calendarLabel}>
                📅 {endDate ? formatDate(endDate) : t('pickGoalDate')}
              </Text>
            </TouchableOpacity>

            <DatePickerModal
              visible={showCalendar}
              value={endDate || new Date()}
              minimumDate={new Date()}
              onCancel={() => setShowCalendar(false)}
              onConfirm={selected => {
                setEndDate(selected);
                setShowCalendar(false);
                setIsTodayCustom(false);
                setTodayTargetInput('');
              }}
            />

            {goal > 0 && endDate ? (
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeaderRow}>
                  <Text style={styles.breakdownHeaderTitle}>
                    🎯 {t('dailyBreakdownTitle') || 'Daily Goal Breakdown'}
                  </Text>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>
                      {remainingDays} {remainingDays === 1 ? 'Day' : 'Days'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.breakdownMessage}>
                  {t('youNeedToDoJapasPerDay', {
                    count: defaultDailyTarget.toLocaleString('en-IN'),
                    days: remainingDays,
                  }) ||
                    `You need to do ${defaultDailyTarget.toLocaleString('en-IN')} Japas per day to complete this goal on time (${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}).`}
                </Text>

                <View style={styles.todayTargetContainer}>
                  <Text style={styles.todayTargetLabel}>
                    {t('todayTargetLabel') || "Customize Today's Target (Optional)"}:
                  </Text>
                  <View style={styles.todayInputRow}>
                    <TextInput
                      style={styles.todayInput}
                      value={
                        isTodayCustom
                          ? todayTargetInput
                          : String(defaultDailyTarget)
                      }
                      onChangeText={val => {
                        setIsTodayCustom(true);
                        setTodayTargetInput(val);
                      }}
                      keyboardType="numeric"
                      placeholder={String(defaultDailyTarget)}
                      placeholderTextColor={Colors.placeholder}
                    />
                    <Text style={styles.todayInputUnit}>Japas today</Text>
                  </View>

                  {isTodayCustom &&
                  todayTargetInput !== '' &&
                  Number(todayTargetInput.replace(/[^\d]/g, '')) < defaultDailyTarget ? (
                    <Text style={styles.targetWarningText}>
                      ⚠️{' '}
                      {t('customTargetMinHint', {count: defaultDailyTarget}) ||
                        `Must be at least ${defaultDailyTarget} Japas per day`}
                    </Text>
                  ) : null}

                  {isTodayCustom &&
                  effectiveTodayTarget > defaultDailyTarget &&
                  remainingDays > 1 ? (
                    <Text style={styles.futureSplitHint}>
                      ✨{' '}
                      {t('futureDailyHint', {
                        days: remainingDays - 1,
                        count: futureDailyTarget.toLocaleString('en-IN'),
                      }) ||
                        `For the remaining ${remainingDays - 1} days, your daily goal will be ~${futureDailyTarget.toLocaleString('en-IN')} Japas/day.`}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.buttonSpacing}>
          <PrimaryButton title={t('startJapa')} onPress={start} />
        </View>
      </ScrollView>
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
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  countInput: {
    minWidth: 140,
    fontSize: 34,
    fontWeight: '800',
    color: Colors.sacredBrown,
    padding: 0,
    textAlign: 'center',
  },
  japas: {marginTop: 4, color: Colors.leafGreen, fontWeight: '800'},
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  chipOn: {borderColor: Colors.sacredBrown, borderWidth: 2},
  chipText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  sectionLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 8,
  },
  quickDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickDayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickDayChipActive: {
    backgroundColor: Colors.selectedTint,
    borderColor: Colors.selectedOrange,
    borderWidth: 1.5,
  },
  quickDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  quickDayTextActive: {
    color: Colors.selectedOrange,
    fontWeight: '800',
  },
  calendarBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  calendarLabel: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 15,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: -4,
    marginBottom: 18,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.selectedTint,
    borderColor: Colors.selectedOrange,
    borderWidth: 1.5,
  },
  presetText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: true,
  },
  presetTextActive: {
    color: Colors.selectedOrange,
    fontWeight: '800',
  },
  breakdownCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    marginBottom: 18,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  daysBadge: {
    backgroundColor: '#F3EEE2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  breakdownMessage: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: Colors.leafGreen,
    marginBottom: 12,
  },
  todayTargetContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  todayTargetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  todayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayInput: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    minWidth: 90,
    textAlign: 'center',
  },
  todayInputUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  futureSplitHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.selectedOrange,
  },
  targetWarningText: {
    marginTop: 6,
    color: '#D9534F',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  buttonSpacing: {
    marginTop: 6,
    marginBottom: 20,
  },
});
