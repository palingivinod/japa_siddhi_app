import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const MantraSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t, tt} = useLanguage();
  const passedId = Number(route.params?.mantraId || 0) || null;
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(passedId);
  // Arriving with a mantra already chosen (community japa) only needs
  // confirming, so the full list stays collapsed until it is asked for.
  const [picking, setPicking] = useState(!passedId);

  useEffect(() => {
    apiService.get('/mantras').then(response => {
      const items = response.data.data ?? [];
      setMantras(items);
      setSelected(current => current ?? items[0]?.id ?? null);
    });
  }, []);

  const chosen = mantras.find(item => item.id === selected);
  const chosenName =
    chosen?.mantraName ||
    chosen?.transliteration ||
    String(route.params?.mantraName || '');

  return (
    <ScreenLayout title={t('selectMantra')} showBack tab="JapaHub">
      {picking ? (
        <>
          <Text style={styles.hint}>{t('chooseOneMantra')}</Text>
          <View style={styles.chipRow}>
            {mantras.map(item => {
              const active = item.id === selected;
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
                    {tt(item.mantraName || item.transliteration)}
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
              {tt(chosenName)}
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
          onPress={() =>
            navigation.navigate('GoalSelect', {
              mode: route.params?.mode || 'community',
              mantraId: selected,
            })
          }
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
