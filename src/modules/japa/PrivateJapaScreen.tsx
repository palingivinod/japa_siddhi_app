import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const PRESET_GOALS = [108, 1008, 10116, 50116, 100116];
const QUICK_DEADLINE_DAYS = [
  {label: 'Today', days: 1},
  {label: '7 Days', days: 7},
  {label: '11 Days', days: 11},
  {label: '21 Days', days: 21},
  {label: '41 Days', days: 41},
];

type SavedMantra = {
  id?: number;
  name: string;
  preferredJapaCount?: number;
};

const formatDate = (value?: Date | null) => {
  if (!value) {
    return '';
  }
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
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

const PrivateJapaScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [mantra, setMantra] = useState('');
  const [goal, setGoal] = useState('');
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [todayTargetInput, setTodayTargetInput] = useState('');
  const [isTodayCustom, setIsTodayCustom] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentMantras, setRecentMantras] = useState<SavedMantra[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const rawGoal = Number(String(goal).replace(/[^\d]/g, '')) || 0;
  const remainingDays = useMemo(() => daysUntil(endDate), [endDate]);
  const defaultDailyTarget = useMemo(() => {
    if (rawGoal <= 0) return 0;
    return Math.max(1, Math.ceil(rawGoal / remainingDays));
  }, [rawGoal, remainingDays]);

  const effectiveTodayTarget = useMemo(() => {
    if (isTodayCustom && todayTargetInput !== '') {
      const parsed = Number(String(todayTargetInput).replace(/[^\d]/g, ''));
      if (parsed > 0) return parsed;
    }
    return defaultDailyTarget;
  }, [isTodayCustom, todayTargetInput, defaultDailyTarget]);

  const futureDailyTarget = useMemo(() => {
    if (remainingDays <= 1) return 0;
    const remainingAfterToday = Math.max(0, rawGoal - effectiveTodayTarget);
    return Math.ceil(remainingAfterToday / (remainingDays - 1));
  }, [rawGoal, effectiveTodayTarget, remainingDays]);

  const loadRecentMantras = useCallback(async () => {
    try {
      let localList: SavedMantra[] = [];
      const stored = await AsyncStorage.getItem('recent_custom_mantras');
      if (stored) {
        try {
          localList = JSON.parse(stored);
        } catch {
          localList = [];
        }
      }

      let remoteList: SavedMantra[] = [];
      try {
        const res = await apiService.get('/personal-mantras');
        const rows = res.data?.data ?? [];
        remoteList = rows.map((item: any) => ({
          id: Number(item.id),
          name: String(item.mantraName || item.mantraText || '').trim(),
          preferredJapaCount: Number(item.preferredJapaCount || 0) || undefined,
        }));
      } catch {
        remoteList = [];
      }

      const map = new Map<string, SavedMantra>();
      [...localList, ...remoteList].forEach(item => {
        const key = item.name.trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, item);
        }
      });
      setRecentMantras(Array.from(map.values()).slice(0, 8));
    } catch {
      undefined;
    }
  }, []);

  useEffect(() => {
    loadRecentMantras();
  }, [loadRecentMantras]);

  const saveToRecent = async (name: string, pGoal: number, pmId?: number) => {
    try {
      const entry: SavedMantra = {
        name: name.trim(),
        preferredJapaCount: pGoal,
        id: pmId,
      };
      const updated = [
        entry,
        ...recentMantras.filter(
          m => m.name.trim().toLowerCase() !== name.trim().toLowerCase(),
        ),
      ].slice(0, 10);
      setRecentMantras(updated);
      await AsyncStorage.setItem(
        'recent_custom_mantras',
        JSON.stringify(updated),
      );
    } catch {
      undefined;
    }
  };

  const resolvePersonalMantraId = async (name: string) => {
    try {
      const existing = await apiService.get('/personal-mantras');
      const rows = existing.data?.data ?? [];
      const match = rows.find(
        (item: any) =>
          String(item.mantraName || '').trim().toLowerCase() ===
          name.toLowerCase(),
      );
      if (match?.id) {
        return Number(match.id);
      }
    } catch {
      undefined;
    }
    const created = await apiService.post('/personal-mantras', {
      mantraName: name,
      mantraText: name,
      preferredJapaCount: rawGoal || 108,
    });
    return Number(created.data?.data?.id || 0) || undefined;
  };

  const start = async () => {
    const name = mantra.trim();
    if (!name) {
      setMessage(t('enterYourMantra'));
      return;
    }
    if (rawGoal <= 0) {
      setMessage(t('setGoalCountToStart') || 'Please enter your japa count goal');
      return;
    }
    if (!endDate) {
      setMessage(t('pickGoalDateFromCalendar') || 'Please select a deadline date');
      return;
    }
    setSaving(true);
    setMessage('');

    let personalMantraId: number | undefined;
    try {
      personalMantraId = await resolvePersonalMantraId(name);
    } catch {
      personalMantraId = undefined;
    }
    await saveToRecent(name, rawGoal, personalMantraId);

    const remDays = daysUntil(endDate);
    const startDateStr = new Date().toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);

    try {
      await apiService.post('/japa-goals', {
        mantraType: 'PERSONAL',
        personalMantraId,
        goalName: name.slice(0, 80),
        targetCount: rawGoal,
        days: remDays,
        startDate: startDateStr,
        endDate: endDateStr,
      });
    } catch (err) {
      console.warn('Could not save japa goal:', err);
    }

    setSaving(false);
    navigation.navigate('Chant', {
      mode: 'private',
      privateMantra: name,
      personalMantraId,
      goal: effectiveTodayTarget,
      totalGoal: rawGoal,
      dailyTarget: effectiveTodayTarget,
      goalType: 'date',
      endDate: formatDate(endDate),
      remainingDays: remDays,
    });
  };

  const startWithListedMantra = () => {
    navigation.navigate('MantraSelect', {
      mode: 'private',
      ...(rawGoal > 0 ? {goal: rawGoal} : {}),
    });
  };

  const filteredSuggestions = recentMantras.filter(item => {
    if (!mantra.trim()) {
      return true;
    }
    return item.name.toLowerCase().includes(mantra.trim().toLowerCase());
  });

  return (
    <ScreenLayout title="My Japa" showBack tab="JapaHub">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.dot}>
            <Text style={styles.emoji}>📿</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{t('privateMantra')}</Text>
            <Text style={styles.meta}>{t('mantraHiddenSecure')}</Text>
          </View>
        </View>

        {/* 1. Mantra Name Input */}
        <Text style={styles.label}>{t('enterYourMantra')}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={mantra}
            onFocus={() => setShowSuggestions(true)}
            onChangeText={text => {
              setMantra(text);
              setMessage('');
              setShowSuggestions(true);
            }}
            placeholder={t('keptPrivateReports')}
            placeholderTextColor={Colors.placeholder}
          />

          {showSuggestions && filteredSuggestions.length > 0 ? (
            <View style={styles.suggestionsPopup}>
              <View style={styles.popupHeader}>
                <Text style={styles.popupHeaderText}>{t('recentMantras')}</Text>
                <TouchableOpacity
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  onPress={() => setShowSuggestions(false)}>
                  <Text style={styles.popupClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.popupScroll}>
                {filteredSuggestions.slice(0, 5).map(item => {
                  const isSelected =
                    mantra.trim().toLowerCase() === item.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={item.id ? `pm-${item.id}` : `m-${item.name}`}
                      style={[
                        styles.popupItem,
                        isSelected && styles.popupItemActive,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setMantra(item.name);
                        if (item.preferredJapaCount) {
                          setGoal(String(item.preferredJapaCount));
                        }
                        setShowSuggestions(false);
                        setMessage('');
                      }}>
                      <View style={styles.popupItemLeft}>
                        <Text
                          style={[
                            styles.popupItemText,
                            isSelected && styles.popupItemTextActive,
                          ]}
                          numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      {item.preferredJapaCount ? (
                        <Text style={styles.popupGoalHint}>
                          {item.preferredJapaCount.toLocaleString()} Japas
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* 2. Total Count Goal */}
        <Text style={styles.label}>{t('setGoal')}</Text>
        <TextInput
          style={styles.input}
          value={goal}
          onChangeText={val => {
            setGoal(val);
            setMessage('');
            setIsTodayCustom(false);
            setTodayTargetInput('');
          }}
          placeholder={t('enterJapaCount') || 'Enter your japa count'}
          placeholderTextColor={Colors.placeholder}
          keyboardType="numeric"
        />
        <View style={styles.presetsRow}>
          {PRESET_GOALS.map(preset => {
            const isSelected = rawGoal === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  isSelected && styles.presetChipActive,
                ]}
                onPress={() => {
                  setGoal(String(preset));
                  setMessage('');
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

        {/* 3. Goal End Date / Deadline */}
        <Text style={styles.label}>
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
            📅 {formatDate(endDate) || t('pickDeadlineDate') || 'Pick Deadline Date'}
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

        {/* 4. Dynamic Daily Goal Breakdown & Customization */}
        {rawGoal > 0 ? (
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

            {/* Editable Today's Target */}
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
              effectiveTodayTarget !== defaultDailyTarget &&
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

        {message ? <Text style={styles.error}>{message}</Text> : null}

        <View style={styles.buttonSpacing}>
          <PrimaryButton
            title={saving ? t('loading') : t('startPrivateJapa')}
            onPress={start}
          />
        </View>

        <View style={styles.orRow}>
          <View style={styles.rule} />
          <Text style={styles.orText}>{(t('or') || 'OR').toUpperCase()}</Text>
          <View style={styles.rule} />
        </View>

        <OutlineButton
          title={t('mantrasBtn')}
          onPress={startWithListedMantra}
        />
        <Text style={styles.hint}>{t('chantListedMantraHint')}</Text>
      </ScrollView>
    </ScreenLayout>
  );
};

export default PrivateJapaScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4EFDF',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
  copy: {flex: 1},
  title: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
    lineHeight: 23,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    paddingBottom: 2,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  suggestionsPopup: {
    marginTop: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEE2',
  },
  popupHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popupClose: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    padding: 2,
  },
  popupScroll: {
    maxHeight: 180,
  },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDFBF7',
  },
  popupItemActive: {
    backgroundColor: Colors.selectedTint,
  },
  popupItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  popupItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sacredBrown,
    flex: 1,
  },
  popupItemTextActive: {
    color: Colors.selectedOrange,
    fontWeight: '800',
  },
  popupGoalHint: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.leafGreen,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
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
  buttonSpacing: {
    marginTop: 6,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  orText: {
    marginHorizontal: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1,
  },
  hint: {
    marginTop: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    paddingBottom: 4,
  },
  error: {
    marginBottom: 12,
    color: Colors.error,
    fontWeight: '700',
    textAlign: 'center',
  },
});
