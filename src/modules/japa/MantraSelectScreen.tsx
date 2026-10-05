import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {getLocalizedMantra} from '../../utils/localizedContent';

const MantraSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t, tt, language} = useLanguage();
  const passedId = Number(route.params?.mantraId || 0) || null;
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(passedId);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  // Arriving with a mantra already chosen (community japa) only needs
  // confirming, so the full list stays collapsed until it is asked for.
  const [picking, setPicking] = useState(!passedId);

  useEffect(() => {
    apiService.get('/mantras').then(response => {
      const items = response.data.data ?? [];
      setMantras(items);
      setSelected(current => current ?? items[0]?.id ?? null);
    });
    apiService
      .get('/japa-goals')
      .then(res => {
        setActiveGoals(res.data?.data ?? []);
      })
      .catch(() => {
        setActiveGoals([]);
      });
  }, []);

  const chosen = mantras.find(item => item.id === selected);
  const localizedChosen = chosen ? getLocalizedMantra(chosen, language).name : '';
  const chosenName =
    localizedChosen ||
    chosen?.mantraName ||
    chosen?.transliteration ||
    String(route.params?.mantraName || '');

  const doNavigate = () => {
    navigation.navigate('GoalSelect', {
      mode: route.params?.mode || 'default',
      mantraId: selected,
      mantraName: chosenName,
      ...(route.params?.goal ? {goal: route.params.goal} : {}),
    });
  };

  const handleSetGoal = () => {
    if (!selected) return;
    const isCommunity = route.params?.mode === 'community';

    if (!isCommunity && activeGoals.length > 0) {
      const hasActiveSamuhika = activeGoals.some(g => {
        const status = String(g.status || 'ACTIVE').toUpperCase();
        if (status !== 'ACTIVE') return false;
        const isSam =
          String(g.goalName || '').toLowerCase().includes('samuhika') ||
          String(g.goal_name || '').toLowerCase().includes('samuhika') ||
          String(g.notes || '').toLowerCase().includes('samuhika');
        const gMantraId = Number(g.mantraId ?? g.mantra_id ?? 0);
        return isSam && gMantraId === selected;
      });

      if (hasActiveSamuhika) {
        const displayName = localizedChosen || tt(chosenName);
        Alert.alert(
          t('alreadyInSamuhikaTitle') || 'Active in Samuhika Japa',
          t('alreadyInSamuhikaMsg', {mantra: displayName}) ||
            `You already have an active Samuhika Japa for "${displayName}". Are you sure you want to start a separate individual Japa for this mantra?`,
          [
            {
              text: t('cancel') || 'Cancel',
              style: 'cancel',
            },
            {
              text: t('continue') || 'Continue',
              onPress: doNavigate,
            },
          ],
        );
        return;
      }
    }

    doNavigate();
  };

  return (
    <ScreenLayout title={t('selectMantra')} showBack tab="JapaHub">
      {picking ? (
        <>
          <Text style={styles.hint}>{t('chooseOneMantra')}</Text>
          <View style={styles.chipRow}>
            {mantras.map(item => {
              const active = item.id === selected;
              const loc = getLocalizedMantra(item, language).name;
              const displayName = loc || tt(item.mantraName || item.transliteration);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.7}
                  onPress={() => setSelected(item.id)}>
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}>
                    {displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.selectedContainer}>
          <Text style={styles.hint}>{t('yourSelectedMantra')}</Text>
          <View style={[styles.chip, styles.chipActive, styles.selectedChip]}>
            <Text
              style={[
                styles.chipText,
                styles.chipTextActive,
                styles.selectedChipText,
              ]}>
              {localizedChosen || tt(chosenName)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setPicking(true)}>
            <Text style={styles.changeText}>{t('changeMantra')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title={t('setGoalBtn')}
          onPress={handleSetGoal}
        />
      </View>
    </ScreenLayout>
  );
};

export default MantraSelectScreen;

const styles = StyleSheet.create({
  hint: {
    color: Colors.sacredBrown,
    marginBottom: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  chipText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  chipTextActive: {
    color: Colors.white,
  },
  selectedContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
  },
  selectedChipText: {
    fontSize: 16,
    fontWeight: '800',
  },
  changeBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  changeText: {
    color: Colors.templeGold,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginTop: 10,
  },
});
