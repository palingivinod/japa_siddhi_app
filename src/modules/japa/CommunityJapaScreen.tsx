import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const CommunityJapaScreen = () => {
  const navigation = useNavigation<any>();
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [devotees, setDevotees] = useState(0);

  useEffect(() => {
    apiService
      .get('/japa/community')
      .then(response => {
        const data = response.data.data ?? {};
        setMantras(data.mantras ?? []);
        setSelected((data.mantras ?? [])[0] ?? null);
        setTotal(Number(data.totalChants ?? 0));
        setDevotees(Number(data.devotees ?? 0));
      })
      .catch(() => {
        setMantras([
          {id: 1, mantraName: 'Om Namah Shivaya'},
          {id: 2, mantraName: 'Om Namo Narayanaya'},
          {id: 3, mantraName: 'Hare Krishna'},
          {id: 4, mantraName: 'Gayatri Mantra'},
        ]);
      });
  }, []);

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
          tone={selected?.id === item.id ? 'green' : 'gold'}
          onPress={() => setSelected(item)}
        />
      ))}
      <Text style={styles.section}>Community goal</Text>
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
      <PrimaryButton title="JOIN COMMUNITY JAPA" onPress={join} />
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
  section: {
    marginTop: 16,
    marginBottom: 10,
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 16,
  },
  stats: {flexDirection: 'row', gap: 10, marginBottom: 20},
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
