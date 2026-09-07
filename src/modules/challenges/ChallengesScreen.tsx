import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const ChallengesScreen = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    apiService
      .get('/challenges')
      .then(response => setItems(response.data.data ?? []))
      .catch(() => setItems([]));
  }, []);

  return (
    <ScreenLayout title="Japa Challenges" showBack tab="JapaHub">
      <Text style={styles.heading}>Choose a challenge</Text>
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.dot}>
            <Text style={styles.emoji}>🏆</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.description}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChallengeDetails', {id: item.id})}>
            <Text style={styles.join}>JOIN</Text>
          </TouchableOpacity>
        </View>
      ))}
      {items.length === 0 ? (
        <Text style={styles.empty}>No active challenges yet.</Text>
      ) : null}
    </ScreenLayout>
  );
};

export default ChallengesScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E2C6',
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
  title: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  meta: {marginTop: 4, color: Colors.textSecondary},
  join: {color: Colors.sacredBrown, fontWeight: '800'},
  empty: {color: Colors.textSecondary},
});
