import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_MANTRAS, AdminMantra} from './adminData';

const AdminMantrasScreen = () => {
  const [mantras, setMantras] = useState<AdminMantra[]>(
    ADMIN_MANTRAS.slice(0, 3).map(item => ({
      ...item,
      target: item.target ?? 10000,
    })),
  );

  return (
    <AdminScreenLayout title="Mantra Management" tab="AdminJapa" showBack>
      <Text style={styles.heading}>Mantra Management</Text>
      <Text style={styles.sub}>Create, edit or delete community mantras.</Text>

      {mantras.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              Target {(item.target ?? 10000).toLocaleString('en-IN')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              Alert.alert('Edit mantra', `${item.name} editor coming soon.`)
            }>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
      ))}

      <PrimaryButton
        title="CREATE MANTRA"
        onPress={() => {
          const next: AdminMantra = {
            id: String(Date.now()),
            name: `New Mantra ${mantras.length + 1}`,
            subtitle: 'Community mantra',
            active: true,
            target: 10000,
          };
          setMantras(current => [...current, next]);
          Alert.alert('Mantra created', 'Saved locally until admin API is ready.');
        }}
      />
    </AdminScreenLayout>
  );
};

export default AdminMantrasScreen;

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
  editBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
});
