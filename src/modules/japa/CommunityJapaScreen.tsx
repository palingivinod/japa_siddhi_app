import React, {useCallback, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

interface MantraStat {
  totalChants: number;
  devotees: number;
}

const CommunityJapaScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState<Record<number, MantraStat>>({});
  const [activeGoals, setActiveGoals] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      apiService
        .get('/japa/community')
        .then(response => {
          const data = response.data.data ?? {};
          const list = data.mantras ?? [];
          setMantras(list);
          setSelected((current: any) =>
            current
              ? list.find((item: any) => item.id === current.id) ?? current
              : list[0] ?? null,
          );
          const byMantra: Record<number, MantraStat> = {};
          (data.mantraStats ?? []).forEach((row: any) => {
            byMantra[Number(row.mantraId)] = {
              totalChants: Number(row.totalChants ?? 0),
              devotees: Number(row.devotees ?? 0),
            };
          });
          setStats(byMantra);
        })
        .catch(() => {
          setMantras([
            {id: 1, mantraName: 'Om Namah Shivaya'},
            {id: 2, mantraName: 'Om Namo Narayanaya'},
            {id: 3, mantraName: 'Hare Krishna'},
            {id: 4, mantraName: 'Gayatri Mantra'},
          ]);
        });

      apiService
        .get('/japa-goals')
        .then(res => {
          setActiveGoals(res.data?.data ?? []);
        })
        .catch(() => {
          setActiveGoals([]);
        });
    }, []),
  );

  const selectedStat = selected ? stats[Number(selected.id)] : undefined;
  const total = selectedStat?.totalChants ?? 0;
  const devotees = selectedStat?.devotees ?? 0;

  const doJoin = async () => {
    try {
      await apiService.post('/japa/community/join', {
        mantraId: selected?.id,
      });
    } catch {
      undefined;
    }
    navigation.navigate('MantraSelect', {
      mode: 'community',
      mantraId: selected?.id,
      mantraName: selected?.mantraName || selected?.transliteration,
    });
  };

  const join = async () => {
    if (!selected?.id) return;

    if (activeGoals.length > 0) {
      const hasActiveIndividual = activeGoals.some(g => {
        const status = String(g.status || 'ACTIVE').toUpperCase();
        if (status !== 'ACTIVE') return false;
        const isSam =
          String(g.goalName || '').toLowerCase().includes('samuhika') ||
          String(g.goal_name || '').toLowerCase().includes('samuhika') ||
          String(g.notes || '').toLowerCase().includes('samuhika');
        const gMantraId = Number(g.mantraId ?? g.mantra_id ?? 0);
        return !isSam && gMantraId === Number(selected.id);
      });

      if (hasActiveIndividual) {
        const mName =
          selected?.mantraName || selected?.transliteration || 'this mantra';
        Alert.alert(
          t('alreadyInIndividualTitle') || 'Active in Individual Japa',
          t('alreadyInIndividualMsg', {mantra: mName}) ||
            `You already have an active individual Japa for "${mName}". Are you sure you want to join Samuhika Japa for it?`,
          [
            {
              text: t('cancel') || 'Cancel',
              style: 'cancel',
            },
            {
              text: t('continue') || 'Continue',
              onPress: doJoin,
            },
          ],
        );
        return;
      }
    }

    await doJoin();
  };

  return (
    <ScreenLayout
      title={t('communityJapa') || 'Samuhika Japa'}
      showBack
      tab="JapaHub"
      scroll={false}>
      {/* Frozen / Sticky Top Section with Stats and Join Button */}
      <View style={styles.topFixedSection}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.label}>TOTAL CHANTS</Text>
            <Text style={styles.value}>{total.toLocaleString()}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>DEVOTEES</Text>
            <Text style={styles.value}>{devotees.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.joinBtnWrap}>
          <PrimaryButton title={t('joinCommunityJapa') || 'JOIN'} onPress={join} />
        </View>

        <Text style={styles.heading}>{t('selectMantra') || 'Select a mantra'}</Text>
      </View>

      {/* Scrollable list of mantras below */}
      <ScrollView
        style={styles.mantraScroll}
        contentContainerStyle={styles.mantraScrollContent}
        showsVerticalScrollIndicator={false}>
        {mantras.map(item => (
          <MenuCard
            key={item.id}
            emoji="🕉️"
            title={item.mantraName || item.transliteration}
            subtitle={selected?.id === item.id ? (t('selected') || 'Selected') : (t('tapToSelect') || 'Tap to select')}
            tone="gold"
            selected={selected?.id === item.id}
            onPress={() => setSelected(item)}
          />
        ))}
      </ScrollView>
    </ScreenLayout>
  );
};

export default CommunityJapaScreen;

const styles = StyleSheet.create({
  topFixedSection: {
    paddingBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {color: Colors.leafGreen, fontWeight: '700', fontSize: 12},
  value: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  joinBtnWrap: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  mantraScroll: {
    flex: 1,
  },
  mantraScrollContent: {
    paddingBottom: 40,
  },
});
