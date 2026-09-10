import React, {useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {saveJapaDraft} from '../../services/japaDraft';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StarPicker from '../common/StarPicker';
import SuccessHero from '../common/SuccessHero';

const EXTEND_PRESETS = [108, 500, 1000, 2000, 5000];

const JapaGoalCompleteScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const completedCount = Number(route.params?.count || 0);
  const completedGoal = Number(route.params?.goal || 0);
  const mode = route.params?.mode === 'private' ? 'private' : 'community';
  const mantraId = Number(route.params?.mantraId || 0) || undefined;

  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  const [extendBy, setExtendBy] = useState(108);
  const [customExtend, setCustomExtend] = useState('');
  const [busy, setBusy] = useState(false);

  const extra = useMemo(() => {
    const typed = Number(customExtend);
    if (Number.isFinite(typed) && typed > 0) {
      return Math.floor(typed);
    }
    return extendBy;
  }, [customExtend, extendBy]);

  const nextGoal = Math.max(completedGoal, completedCount) + extra;

  const goProgress = () => {
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
    try {
      let japaGoalId = Number(route.params?.japaGoalId || 0) || undefined;
      try {
        const response = await apiService.post('/japa-goals', {
          mantraType: mode === 'private' ? 'PERSONAL' : 'DEFAULT',
          mantraId,
          goalName: mode === 'private' ? 'Private Japa' : 'Extended Japa',
          targetCount: nextGoal,
          days: 1,
          startDate: new Date().toISOString().slice(0, 10),
          notes: feedback
            ? `Extended after ${completedCount}; rating ${rating}. ${feedback}`
            : `Extended after ${completedCount}; rating ${rating}.`,
        });
        japaGoalId = Number(response.data?.data?.goalId || japaGoalId) || japaGoalId;
      } catch {
        // Offline: continue with local extended goal.
      }

      await saveJapaDraft({
        mode,
        mantraId,
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
    <ScreenLayout title="Goal Complete" showBack tab="JapaHub">
      <SuccessHero
        title="Well done!"
        subtitle="You completed your japa goal."
      />
      <Text style={styles.section}>Rate your experience</Text>
      <StarPicker value={rating} onChange={setRating} />
      <FormField
        label="Feedback"
        placeholder="Share your experience"
        value={feedback}
        onChangeText={setFeedback}
        multiline
        style={styles.area}
      />

      <Text style={styles.section}>Extend your japa goal</Text>
      <Text style={styles.hint}>
        Keep going from {completedCount.toLocaleString()} toward{' '}
        {nextGoal.toLocaleString()} japas
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
        placeholder="Custom extra count"
        placeholderTextColor={Colors.leafGreen}
      />

      <PrimaryButton
        title={busy ? 'EXTENDING...' : 'EXTEND JAPA GOAL'}
        onPress={extendGoal}
        disabled={busy || extra < 1}
      />
      <View style={styles.gap} />
      <OutlineButton title="DONE / VIEW PROGRESS" onPress={goProgress} />
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
  area: {minHeight: 90, textAlignVertical: 'top'},
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  chipOn: {
    backgroundColor: Colors.templeGold,
  },
  chipText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 13,
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
