import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import {formMessageColor} from '../../theme/formMessage';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';

interface Mantra {
  id: number;
  mantraName: string;
  deityName: string;
  transliteration: string;
  defaultJapaCount: number;
}

const ChantScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const mode = route.params?.mode === 'private' ? 'private' : 'community';
  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [selected, setSelected] = useState<Mantra | null>(null);
  const [savedTotal, setSavedTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(Number(route.params?.goal ?? 2000) || 2000);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const lastTap = useRef(0);
  const intervals = useRef<number[]>([]);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef(0);
  const goalRef = useRef(goal);

  countRef.current = count;
  goalRef.current = goal;

  const clearIdleTimer = () => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  };

  const load = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    Promise.all([apiService.get('/mantras'), apiService.get('/japa/summary')])
      .then(([mantraResponse, summaryResponse]) => {
        const items: Mantra[] = mantraResponse.data.data ?? [];
        setMantras(items);
        const preferredId = Number(route.params?.mantraId || 0);
        const preferred =
          (preferredId && items.find(item => item.id === preferredId)) ||
          items[0] ||
          null;
        setSelected(current => current ?? preferred);
        const data = summaryResponse.data.data ?? {};
        setSavedTotal(Number(data.totalJapaCount ?? 0) || 0);
        setGoal(Number(route.params?.goal ?? data.dailyTarget ?? 2000) || 2000);
      })
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load mantras from the API.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return () => clearIdleTimer();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Returning from JapaPaused must unlock tapping again.
      setPaused(false);
      setMessage('');
      return () => clearIdleTimer();
    }, []),
  );

  const armIdlePause = () => {
    clearIdleTimer();
    idleTimer.current = setTimeout(() => {
      setPaused(true);
      navigation.navigate('JapaPaused', {
        count: countRef.current,
        goal: goalRef.current,
        sessionCount: countRef.current,
      });
    }, 45000);
  };

  const tapChant = () => {
    if (paused) {
      setPaused(false);
    }
    const now = Date.now();
    if (lastTap.current) {
      const delta = now - lastTap.current;
      // Ignore accidental double-taps under 250ms; otherwise accept.
      if (delta < 250) {
        return;
      }
      const reference = Number(route.params?.durationMs || 0);
      const average =
        intervals.current.length >= 3
          ? intervals.current.reduce((sum, item) => sum + item, 0) /
            intervals.current.length
          : reference;
      // Soft pace hint only after we have a stable average; never hard-block early taps.
      if (
        intervals.current.length >= 5 &&
        average > 0 &&
        delta < average * 0.35
      ) {
        setMessage('Slow down a little to match your chanting pace.');
        lastTap.current = now;
        return;
      }
      if (intervals.current.length < 12 && delta < 10000) {
        intervals.current = [...intervals.current, delta];
      }
    }
    lastTap.current = now;
    setCount(value => value + 1);
    setMessage('');
    armIdlePause();
  };

  const saveSession = async () => {
    if (count < 1) {
      setMessage('Tap the circle for each chant before saving.');
      return;
    }
    if (!selected) {
      setMessage('Select a mantra, then save your session.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const response = await apiService.post('/japa/session', {
        mantraType: 'DEFAULT',
        mantraId: selected.id,
        chantMode: 'TAP',
        sessionCount: count,
        durationSeconds: Math.max(count * 2, 1),
        japaGoalId: route.params?.japaGoalId,
        remarks:
          mode === 'private'
            ? `Private Japa · ${String(route.params?.privateMantra || 'Private').slice(0, 80)}`
            : undefined,
      });
      const userTotal = Number(
        response.data.data?.userTotal ?? savedTotal + count,
      );
      const savedCount = Number(response.data.data?.count ?? count);
      setSavedTotal(userTotal);
      setCount(0);
      countRef.current = 0;
      setMessage(`Saved ${savedCount.toLocaleString()} japas to your account.`);
      if (userTotal >= 10000) {
        navigation.navigate('MilestoneNotifications');
        return;
      }
      navigation.navigate('JapaProgress', {
        count: userTotal,
        goal,
        sessionCount: savedCount,
      });
    } catch (err: any) {
      setMessage(
        err?.response?.data?.message ??
          'Could not save the session. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const progress = Math.min(100, Math.round((count / Math.max(goal, 1)) * 100));

  if (loading) {
    return (
      <ScreenLayout title="Smart Japa" showBack tab="JapaHub">
        <ActivityIndicator color={Colors.templeGold} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Smart Japa" showBack tab="JapaHub">
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <Text style={styles.mode}>
        {mode === 'private' ? 'My Japa' : 'Community Japa'}
      </Text>
      <View style={styles.chipRow}>
        {mantras.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.chip, selected?.id === item.id && styles.chipActive]}
            onPress={() => setSelected(item)}>
            <Text
              style={[
                styles.chipText,
                selected?.id === item.id && styles.chipTextActive,
              ]}>
              {item.mantraName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.mantra}>
        {mode === 'private'
          ? route.params?.privateMantra || 'Private Japa'
          : selected?.transliteration || 'Om Namah Shivaya'}
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.ring, paused && styles.ringPaused]}
        onPress={tapChant}>
        <View style={styles.innerRing}>
          <Text style={styles.count}>{count.toLocaleString()}</Text>
          <Text style={styles.japas}>JAPAS</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.goal}>
        Goal {goal.toLocaleString()}
        {savedTotal > 0 ? ` · Lifetime ${savedTotal.toLocaleString()}` : ''}
      </Text>
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.percent}>{progress}%</Text>
      </View>
      <Text style={styles.hint}>
        {paused
          ? 'Paused — tap the circle to continue counting'
          : 'Tap the circle once for each chant'}
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.tapCircle, paused && styles.tapCirclePaused]}
        onPress={tapChant}
      />
      <TouchableOpacity
        onPress={() => {
          if (paused) {
            setPaused(false);
            setMessage('');
            armIdlePause();
            return;
          }
          clearIdleTimer();
          setPaused(true);
          navigation.navigate('JapaPaused', {
            count,
            goal,
            sessionCount: count,
          });
        }}>
        <Text style={styles.pause}>{paused ? 'Resume' : 'Pause'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.save}
        onPress={saveSession}
        disabled={saving}>
        <Text style={styles.saveText}>
          {saving ? 'Saving...' : 'Save Session'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.save}
        onPress={() =>
          navigation.navigate('JapaProgress', {
            count: savedTotal + count,
            goal,
            sessionCount: count,
          })
        }>
        <Text style={styles.saveText}>View Progress</Text>
      </TouchableOpacity>
      {message ? (
        <Text style={[styles.message, {color: formMessageColor(message)}]}>
          {message}
        </Text>
      ) : null}
    </ScreenLayout>
  );
};

export default ChantScreen;

const styles = StyleSheet.create({
  mode: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  chipText: {color: Colors.sacredBrown, fontWeight: '700'},
  chipTextActive: {color: Colors.white},
  mantra: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.leafGreen,
    textAlign: 'center',
    marginBottom: 16,
  },
  ring: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPaused: {
    opacity: 0.75,
  },
  innerRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  japas: {
    marginTop: 4,
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 1,
  },
  goal: {
    marginTop: 18,
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: Colors.templeGold,
  },
  percent: {fontWeight: '800', color: Colors.sacredBrown},
  hint: {
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  tapCircle: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.templeGold,
    marginTop: 12,
  },
  tapCirclePaused: {
    opacity: 0.7,
  },
  pause: {
    textAlign: 'center',
    marginTop: 12,
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 16,
  },
  save: {
    marginTop: 18,
    backgroundColor: Colors.templeGold,
    borderRadius: 30,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {color: Colors.white, fontWeight: '800'},
  message: {marginTop: 14, fontWeight: '600', lineHeight: 22},
});
