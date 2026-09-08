import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_MANTRAS, AdminMantra} from './adminData';

const AdminJapaScreen = () => {
  const navigation = useNavigation<any>();
  const [mantras, setMantras] = useState<AdminMantra[]>(ADMIN_MANTRAS);

  const toggle = (id: string) => {
    setMantras(current =>
      current.map(item =>
        item.id === id ? {...item, active: !item.active} : item,
      ),
    );
  };

  return (
    <AdminScreenLayout title="Japa Management" tab="AdminJapa">
      <Text style={styles.heading}>Japa Management</Text>
      <Text style={styles.sub}>Manage up to 12 predefined mantras.</Text>

      {mantras.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.subtitle}</Text>
          </View>
          <TouchableOpacity
            style={[styles.pill, item.active ? styles.pillOn : styles.pillOff]}
            onPress={() => toggle(item.id)}>
            <Text
              style={[
                styles.pillText,
                item.active ? styles.pillTextOn : styles.pillTextOff,
              ]}>
              {item.active ? 'Active' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <PrimaryButton
        title="MANTRA MANAGEMENT"
        onPress={() => navigation.navigate('AdminMantras')}
      />
    </AdminScreenLayout>
  );
};

export default AdminJapaScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillOn: {borderColor: Colors.leafGreen},
  pillOff: {borderColor: Colors.textLight},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.textLight},
});
