import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

interface MantraStat {
  totalChants: number;
  devotees: number;
}

const CommunityJapaScreen = () => {
  const navigation = useNavigation<any>();
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState<Record<number, MantraStat>>({});

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
    }, []),
  );

  const selectedStat = selected ? stats[Number(selected.id)] : undefined;
  const total = selectedStat?.totalChants ?? 0;
  const devotees = selectedStat?.devotees ?? 0;

  const join = async () => {
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

  return (
    <ScreenLayout title="Community Japa" showBack tab="JapaHub">
      <Text style={styles.heading}>Select a mantra</Text>
      {mantras.map(item => (
        <MenuCard
          key={item.id}
          emoji="🕉️"
          title={item.mantraName || item.transliteration}
          subtitle={selected?.id === item.id ? 'Selected' : 'Tap to select'}
          tone="gold"
          selected={selected?.id === item.id}
          onPress={() => setSelected(item)}
        />
      ))}
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
      <PrimaryButton title="JOIN SAMUHIKA JAPA" onPress={join} />
    </ScreenLayout>
  );
};

export default CommunityJapaScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  stats: {flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20},
  stat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {color: Colors.leafGreen, fontWeight: '700'},
  value: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
});
