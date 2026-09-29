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
          {mantras.map(item => {
            const active = item.id === selected;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, active && styles.active]}
                onPress={() => setSelected(item.id)}>
                <View style={[styles.radio, active && styles.radioOn]}>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </View>
                <Text style={styles.name}>
                  {tt(item.mantraName || item.transliteration)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <>
          <Text style={styles.hint}>{t('yourSelectedMantra')}</Text>
          <View style={[styles.card, styles.active]}>
            <View style={[styles.radio, styles.radioOn]}>
              <Text style={styles.check}>✓</Text>
            </View>
            <Text style={styles.name}>{tt(chosenName)}</Text>
          </View>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setPicking(true)}>
            <Text style={styles.changeText}>{t('changeMantra')}</Text>
          </TouchableOpacity>
        </>
      )}
      <PrimaryButton
        title={t('setGoalBtn')}
        onPress={() =>
          navigation.navigate('GoalSelect', {
            mode: route.params?.mode || 'community',
            mantraId: selected,
          })
        }
      />
    </ScreenLayout>
  );
};

export default MantraSelectScreen;

const styles = StyleSheet.create({
  hint: {color: Colors.sacredBrown, marginBottom: 14, fontSize: 16},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  active: {
    borderColor: Colors.selectedOrange,
    borderWidth: 2,
    backgroundColor: Colors.selectedTint,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: Colors.selectedOrange,
    borderColor: Colors.selectedOrange,
  },
  check: {color: Colors.white, fontWeight: '800', fontSize: 12},
  name: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  changeBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  changeText: {
    color: Colors.templeGold,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
