import React, {useCallback, useEffect, useState} from 'react';
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
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const PRESET_GOALS = [108, 1008, 10116, 50116, 100116];

type SavedMantra = {
  id?: number;
  name: string;
  preferredJapaCount?: number;
};

const PrivateJapaScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [mantra, setMantra] = useState('');
  const [goal, setGoal] = useState('1008');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentMantras, setRecentMantras] = useState<SavedMantra[]>([]);

  const loadRecentMantras = useCallback(async () => {
    try {
      // 1. Get from AsyncStorage
      let localList: SavedMantra[] = [];
      const stored = await AsyncStorage.getItem('recent_custom_mantras');
      if (stored) {
        try {
          localList = JSON.parse(stored);
        } catch {
          localList = [];
        }
      }

      // 2. Get from Backend API
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

      // Merge and deduplicate by name (case-insensitive)
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

  /** Reuse the saved mantra if the user typed it before, else create it. */
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
      preferredJapaCount: Number(String(goal).replace(/,/g, '')) || 1008,
    });
    return Number(created.data?.data?.id || 0) || undefined;
  };

  const start = async () => {
    const name = mantra.trim();
    if (!name) {
      setMessage(t('enterYourMantra'));
      return;
    }
    setSaving(true);
    setMessage('');
    const targetGoal = Number(String(goal).replace(/,/g, '')) || 1008;
    let personalMantraId: number | undefined;
    try {
      personalMantraId = await resolvePersonalMantraId(name);
    } catch {
      personalMantraId = undefined;
    }
    await saveToRecent(name, targetGoal, personalMantraId);
    setSaving(false);
    navigation.navigate('GoalSelect', {
      mode: 'private',
      privateMantra: name,
      personalMantraId,
      goal: targetGoal,
    });
  };

  /** Not everyone chants their own mantra — go straight to the listed ones. */
  const startWithListedMantra = () => {
    navigation.navigate('Chant', {
      mode: 'private',
      goal: Number(String(goal).replace(/,/g, '')) || 1008,
    });
  };

  return (
    <ScreenLayout title="My Japa" showBack tab="JapaHub">
      <View style={styles.card}>
        <View style={styles.dot}>
          <Text style={styles.emoji}>📿</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('privateMantra')}</Text>
          <Text style={styles.meta}>{t('mantraHiddenSecure')}</Text>
        </View>
      </View>
      <Text style={styles.label}>{t('enterYourMantra')}</Text>
      <TextInput
        style={styles.input}
        value={mantra}
        onChangeText={text => {
          setMantra(text);
          setMessage('');
        }}
        placeholder={t('keptPrivateReports')}
        placeholderTextColor={Colors.placeholder}
      />

      {recentMantras.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>{t('recentMantras')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}>
            {recentMantras.map(item => {
              const isSelected =
                mantra.trim().toLowerCase() === item.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={item.id ? `pm-${item.id}` : `m-${item.name}`}
                  style={[
                    styles.suggestionChip,
                    isSelected && styles.suggestionChipActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setMantra(item.name);
                    if (item.preferredJapaCount) {
                      setGoal(String(item.preferredJapaCount));
                    }
                    setMessage('');
                  }}>
                  <Text style={styles.suggestionIcon}>📿</Text>
                  <Text
                    style={[
                      styles.suggestionText,
                      isSelected && styles.suggestionTextActive,
                    ]}
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isSelected ? (
                    <Text style={styles.suggestionCheck}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Text style={styles.label}>{t('setGoal')}</Text>
      <TextInput
        style={styles.input}
        value={goal}
        onChangeText={setGoal}
        keyboardType="numeric"
      />
      <View style={styles.presetsRow}>
        {PRESET_GOALS.map(preset => {
          const isSelected =
            Number(String(goal).replace(/[^\d]/g, '')) === preset;
          return (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetChip,
                isSelected && styles.presetChipActive,
              ]}
              onPress={() => setGoal(String(preset))}>
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
      <PrimaryButton
        title={saving ? t('loading') : t('startPrivateJapa')}
        onPress={start}
      />
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
      {message ? <Text style={styles.error}>{message}</Text> : null}
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
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  suggestionsContainer: {
    marginTop: -2,
    marginBottom: 12,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    includeFontPadding: true,
  },
  suggestionsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  suggestionChipActive: {
    backgroundColor: Colors.selectedTint,
    borderColor: Colors.selectedOrange,
    borderWidth: 1.5,
  },
  suggestionIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
    maxWidth: 160,
  },
  suggestionTextActive: {
    color: Colors.selectedOrange,
    fontWeight: '800',
  },
  suggestionCheck: {
    fontSize: 12,
    color: Colors.selectedOrange,
    fontWeight: '800',
    marginLeft: 5,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
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
    marginTop: 14,
    color: Colors.error,
    fontWeight: '700',
    textAlign: 'center',
  },
});
