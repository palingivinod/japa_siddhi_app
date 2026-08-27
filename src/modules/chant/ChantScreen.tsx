import React, {useRef, useState} from 'react';
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
  const [goal, setGoal] = useState(2000);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const lastTap = useRef(0);
  const intervals = useRef<number[]>([]);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    Promise.all([apiService.get('/mantras'), apiService.get('/japa/summary')])
      .then(([mantraResponse, summaryResponse]) => {
        const items = mantraResponse.data.data ?? [];
        setMantras(items);
        setSelected(current => current ?? items[0] ?? null);
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

  useFocusEffect(
    React.useCallback(() => {
      load();
      return () => {
        if (idleTimer.current) {
          clearTimeout(idleTimer.current);
        }
      };
    }, []),
  );

  const armIdlePause = () => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    idleTimer.current = setTimeout(() => {
      setPaused(true);
      setMessage('Japa paused after a short pause. Tap Resume to continue.');
    }, 12000);
  };

  const tapChant = () => {
    if (paused) {
      return;
    }
    const now = Date.now();
    if (lastTap.current) {
      const delta = now - lastTap.current;
      if (intervals.current.length >= 3) {
        const average =
          intervals.current.reduce((sum, item) => sum + item, 0) /
          intervals.current.length;
        if (delta < average * 0.55) {
          setMessage('Too fast. Chant at your reference pace.');
          return;
        }
      }
      if (intervals.current.length < 8 && delta < 8000) {
        intervals.current = [...intervals.current, delta];
      }
    }
    lastTap.current = now;
    setCount(value => value + 1);
    setMessage('');
    armIdlePause();
  };

  const saveSession = async () => {
    if (!selected || count < 1) {
      setMessage('Tap to chant at least once before saving.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.post('/japa/session', {
        mantraType: 'DEFAULT',
        mantraId: selected.id,
        chantMode: 'TAP',
        sessionCount: count,
        durationSeconds: Math.max(count * 2, 1),
      });
      const userTotal = Number(
        response.data.data?.userTotal ?? savedTotal + count,
      );
      setSavedTotal(userTotal);
      setMessage(`Saved ${count} chants. Your total is now ${userTotal}.`);
      setCount(0);
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Could not save the session.');
    } finally {
      setSaving(false);
    }
  };

  const total = savedTotal + count;
  const progress = Math.min(100, Math.round((total / Math.max(goal, 1)) * 100));

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
        {selected?.transliteration || 'Om Namah Shivaya'}
      </Text>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.ring}
        onPress={tapChant}
        disabled={paused}>
        <View style={styles.innerRing}>
          <Text style={styles.count}>{total.toLocaleString()}</Text>
          <Text style={styles.japas}>JAPAS</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.goal}>Goal {goal.toLocaleString()}</Text>
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.percent}>{progress}%</Text>
      </View>
      <Text style={styles.hint}>Tap to chant</Text>
      <TouchableOpacity style={styles.tapCircle} onPress={tapChant} disabled={paused} />
      <TouchableOpacity
        onPress={() => {
          if (paused) {
            setPaused(false);
            setMessage('');
            return;
          }
          setPaused(true);
          navigation.navigate('JapaPaused', {count: total, goal});
        }}>
        <Text style={styles.pause}>{paused ? 'Resume' : 'Pause'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.save} onPress={saveSession} disabled={saving}>
        <Text style={styles.saveText}>
          {saving ? 'Saving...' : 'Save Session'}
        </Text>
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
