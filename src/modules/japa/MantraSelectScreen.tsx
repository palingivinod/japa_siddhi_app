import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const MantraSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(
    route.params?.mantraId ?? null,
  );

  useEffect(() => {
    apiService.get('/mantras').then(response => {
      const items = response.data.data ?? [];
      setMantras(items);
      setSelected(current => current ?? items[0]?.id ?? null);
    });
  }, []);

  return (
    <ScreenLayout title="Select Mantra" showBack tab="JapaHub">
      <Text style={styles.hint}>Choose one mantra to chant</Text>
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
            <Text style={styles.name}>{item.mantraName}</Text>
          </TouchableOpacity>
        );
      })}
      <PrimaryButton
        title="SET GOAL"
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
  },
  active: {borderColor: Colors.templeGold, borderWidth: 2},
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
  radioOn: {backgroundColor: Colors.templeGold},
  check: {color: Colors.white, fontWeight: '800', fontSize: 12},
  name: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
});
