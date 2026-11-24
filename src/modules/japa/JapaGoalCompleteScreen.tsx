import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {PLAYSTORE_URL} from '../../constants/app';
import {useLanguage} from '../../i18n/LanguageContext';
import {clearJapaDraft, saveJapaDraft} from '../../services/japaDraft';
import {istIsoDate} from '../../utils/dateUtils';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const EXTEND_PRESETS = [108, 500, 1000, 2000, 5000];
const PLAY_MARKET_URL = 'market://details?id=com.japasiddhi';

const openPlayStore = () => {
  Linking.openURL(PLAY_MARKET_URL).catch(() => {
    Linking.openURL(PLAYSTORE_URL).catch(() => undefined);
  });
};

/** Keeps only digits and shows them as YYYY-MM-DD while the devotee types. */
const formatTypedDate = (raw: string) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

/** Real calendar date from YYYY-MM-DD, or null (rejects 2026-13-45). */
const parseIsoDate = (iso: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

/** The day the devotee tapped in the calendar, as YYYY-MM-DD (device calendar day). */
const toIsoDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const JapaGoalCompleteScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const completedCount = Number(route.params?.count || 0);
  const completedGoal = Number(route.params?.goal || 0);
  const mode = route.params?.mode === 'private' ? 'private' : 'community';
  const mantraId = Number(route.params?.mantraId || 0) || undefined;
  const ownMantra = String(route.params?.privateMantra || '').trim();
  const personalMantraId =
    Number(route.params?.personalMantraId || 0) || undefined;
  const usingOwnMantra = mode === 'private' && Boolean(ownMantra);

  const [extendBy, setExtendBy] = useState(108);
  const [customExtend, setCustomExtend] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [busy, setBusy] = useState(false);
  const extendedRef = useRef(false);
  const retiredRef = useRef(false);

  /**
   * A finished own mantra leaves the chant list, but its counts stay in
   * reports because the summary reads the name without the active flag.
   */
  const retireOwnMantra = async () => {
    if (!usingOwnMantra || retiredRef.current || extendedRef.current) {
      return;
    }
    retiredRef.current = true;
    await clearJapaDraft('private', undefined, undefined, personalMantraId);
    if (!personalMantraId) {
      return;
    }
    try {
      await apiService.delete(`/personal-mantras/${personalMantraId}`);
    } catch {
      // Keep the completion flow going even if the cleanup call fails.
    }
  };

  // Also retire it when the devotee leaves with the back button.
  useEffect(
    () => () => {
      retireOwnMantra();
    },
    [],
  );

  const extra = useMemo(() => {
    const typed = Number(customExtend);
    if (Number.isFinite(typed) && typed > 0) {
      return Math.floor(typed);
    }
    return extendBy;
  }, [customExtend, extendBy]);

  const nextGoal = Math.max(completedGoal, completedCount) + extra;

  // Optional new deadline (YYYY-MM-DD). Blank = keep the goal's current deadline.
  const deadlineInput = newDeadline.trim();
  const deadlineValid =
    !deadlineInput ||
    (parseIsoDate(deadlineInput) !== null && deadlineInput >= istIsoDate());

  const goProgress = async () => {
    await retireOwnMantra();
    navigation.replace('JapaProgress', {
      count: route.params?.userTotal ?? completedCount,
      goal: completedGoal,
      sessionCount: completedCount,
      completed: true,
    });
  };

  const extendGoal = async () => {
    if (extra < 1 || busy) {
      return;
    }
    setBusy(true);
    extendedRef.current = true;
    try {
      let japaGoalId = Number(route.params?.japaGoalId || 0) || undefined;
      const extendNote = `Extended after ${completedCount}.`;
      try {
        if (japaGoalId) {
          // Same goal row: raise target, keep counts — do not create/cancel.
          const response = await apiService.put(
            `/japa-goals/${japaGoalId}/extend`,
            {
              targetCount: nextGoal,
              // Blank → server keeps the existing deadline.
              endDate: deadlineInput || undefined,
              notes: extendNote,
            },
          );
          japaGoalId =
            Number(response.data?.data?.goalId || japaGoalId) || japaGoalId;
        } else {
          // No goal id (rare): create once; prefer extend path above.
          const response = await apiService.post('/japa-goals', {
            mantraType: usingOwnMantra ? 'PERSONAL' : 'DEFAULT',
            mantraId: usingOwnMantra ? undefined : mantraId,
            personalMantraId: usingOwnMantra ? personalMantraId : undefined,
            goalName: usingOwnMantra
              ? ownMantra.slice(0, 80) || 'My Japa'
              : 'Extended Japa',
            targetCount: nextGoal,
            days: 1,
            startDate: istIsoDate(),
            endDate: deadlineInput || undefined,
            notes: extendNote,
          });
          japaGoalId =
            Number(response.data?.data?.goalId || japaGoalId) || japaGoalId;
        }
      } catch {
        // Offline: continue with local extended goal on same id.
      }

      await saveJapaDraft({
        mode,
        mantraId: usingOwnMantra ? undefined : mantraId,
        personalMantraId: usingOwnMantra ? personalMantraId : undefined,
        privateMantra: route.params?.privateMantra,
        goal: nextGoal,
        count: completedCount,
        postedCount: completedCount,
        japaGoalId,
      });

      navigation.replace('Chant', {
        mode,
        mantraId,
        privateMantra: route.params?.privateMantra,
        personalMantraId,
        goal: nextGoal,
        japaGoalId,
        initialCount: completedCount,
        resume: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout title={t('goalCompleteTitle')} showBack tab="JapaHub">
      <SuccessHero
        title={t('congratulations')}
        subtitle={t('youCompletedJapaGoal')}
      />

      <Text style={styles.section}>{t('extendYourJapaGoal')}</Text>
      <Text style={styles.hint}>
        {t('keepGoingToward', {
          done: completedCount.toLocaleString(),
          next: nextGoal.toLocaleString(),
        })}
      </Text>
      <View style={styles.row}>
        {EXTEND_PRESETS.map(item => (
          <TouchableOpacity
            key={item}
            style={[
              styles.chip,
              !customExtend && extendBy === item && styles.chipOn,
            ]}
            onPress={() => {
              setExtendBy(item);
              setCustomExtend('');
            }}>
            <Text style={styles.chipText}>+{item.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        value={customExtend}
        onChangeText={setCustomExtend}
        keyboardType="number-pad"
        placeholder={t('enterCustomCountHere')}
        placeholderTextColor={Colors.leafGreen}
      />

      <Text style={styles.label}>{t('newDeadlineLabel')}</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, styles.dateInput]}
          value={newDeadline}
          onChangeText={value => setNewDeadline(formatTypedDate(value))}
          keyboardType="number-pad"
          maxLength={10}
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.leafGreen}
        />
        <TouchableOpacity
          style={styles.calendarBtn}
          onPress={() => setShowCalendar(true)}
          activeOpacity={0.85}>
          <Text style={styles.calendarBtnText}>{t('pickDate')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>{t('deadlineHelp')}</Text>
      {!deadlineValid ? (
        <Text style={styles.error}>{t('deadlineInvalid')}</Text>
      ) : null}

      <PrimaryButton
        title={busy ? t('extendingGoal') : t('extendJapaGoalBtn')}
        onPress={extendGoal}
        disabled={busy || extra < 1 || !deadlineValid}
      />
      <View style={styles.gap} />
      <OutlineButton title={t('doneViewProgress')} onPress={goProgress} />
      <View style={styles.gap} />
      <OutlineButton
        title={t('rateUsOnPlayStore')}
        onPress={openPlayStore}
        rawTitle
      />

      <DatePickerModal
        visible={showCalendar}
        value={parseIsoDate(deadlineInput) ?? today}
        minimumDate={today}
        onCancel={() => setShowCalendar(false)}
        onConfirm={selected => {
          setNewDeadline(toIsoDate(selected));
          setShowCalendar(false);
        }}
      />
    </ScreenLayout>
  );
};

export default JapaGoalCompleteScreen;

const styles = StyleSheet.create({
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  hint: {
    color: Colors.sacredBrown,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
    fontWeight: '600',
  },
  label: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  error: {
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  dateInput: {
    flex: 1,
    marginBottom: 0,
  },
  calendarBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  chipOn: {
    backgroundColor: Colors.templeGold,
  },
  chipText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    borderRadius: 16,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    color: Colors.sacredBrown,
    fontWeight: '700',
    textAlign: 'center',
  },
  gap: {height: 12},
});
