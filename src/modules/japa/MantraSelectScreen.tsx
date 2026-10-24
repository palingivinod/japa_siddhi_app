import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {getLocalizedMantra} from '../../utils/localizedContent';
import {
  MantraCategoryOption,
  builtinCategories,
  categoryTitle,
  groupByCategory,
} from './mantraCategories';

const MantraSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t, tt, language} = useLanguage();
  const passedId = Number(route.params?.mantraId || 0) || null;
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(passedId);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [categories, setCategories] = useState<MantraCategoryOption[]>(
    builtinCategories(),
  );
  // Arriving with a mantra already chosen (community japa) only needs
  // confirming, so the full list stays collapsed until it is asked for.
  const [picking, setPicking] = useState(!passedId);
  const [openCode, setOpenCode] = useState<string | null>(null);

  useEffect(() => {
    const list = route.params?.mode === 'private' ? 'antharanga' : 'samuhika';
    apiService.get('/mantras', {params: {list}}).then(response => {
      const items = response.data.data ?? [];
      setMantras(items);
      setSelected(current => current ?? items[0]?.id ?? null);
    });
    apiService
      .get('/mantras/categories')
      .then(response => {
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        if (rows.length > 0) {
          setCategories(
            rows.map((row: any) => ({
              code: String(row.code || ''),
              name: String(row.name || ''),
            })),
          );
        }
      })
      .catch(() => undefined);
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
  const localizedChosen = chosen
    ? getLocalizedMantra(chosen, language).name
    : '';
  const chosenName =
    tt(
      localizedChosen ||
        chosen?.mantraName ||
        chosen?.transliteration ||
        String(route.params?.mantraName || ''),
    ) ||
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

  const mantraLabel = (item: any) => {
    const loc = getLocalizedMantra(item, language).name;
    return (
      tt(loc || item.mantraName || item.transliteration || '') ||
      loc ||
      item.mantraName ||
      item.transliteration
    );
  };

  const renderChip = (item: any) => {
    const active = item.id === selected;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.chip, active && styles.chipActive]}
        activeOpacity={0.7}
        onPress={() => setSelected(item.id)}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {mantraLabel(item)}
        </Text>
      </TouchableOpacity>
    );
  };

  const {unassigned, groups} = groupByCategory(mantras, categories);

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
          <Text style={styles.hint}>{t('selectCategoryForMantra')}</Text>
          {groups.map(group => {
            const open = openCode === group.code;
            return (
              <View key={group.code} style={styles.section}>
                <TouchableOpacity
                  style={[styles.categoryBtn, open && styles.categoryBtnOpen]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setOpenCode(current =>
                      current === group.code ? null : group.code,
                    )
                  }>
                  <Text
                    style={[
                      styles.categoryText,
                      open && styles.categoryTextOpen,
                    ]}>
                    {categoryTitle(group, t)}
                  </Text>
                </TouchableOpacity>
                {open ? (
                  group.items.length > 0 ? (
                    <View style={styles.chipRow}>{group.items.map(renderChip)}</View>
                  ) : (
                    <Text style={styles.empty}>{t('noMantrasInCategory')}</Text>
                  )
                ) : null}
              </View>
            );
          })}
          {unassigned.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('mantraCatUnassigned')}</Text>
              <View style={styles.chipRow}>{unassigned.map(renderChip)}</View>
            </View>
          ) : null}
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
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 8,
  },
  categoryBtn: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  categoryBtnOpen: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  categoryText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
  },
  categoryTextOpen: {
    color: Colors.white,
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
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
