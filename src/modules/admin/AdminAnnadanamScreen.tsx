import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_ANNADANAM, AdminAnnadanamItem} from './adminData';

const AdminAnnadanamScreen = () => {
  const [items, setItems] = useState<AdminAnnadanamItem[]>(ADMIN_ANNADANAM);

  const toggle = (id: string) => {
    setItems(current =>
      current.map(item =>
        item.id === id ? {...item, active: !item.active} : item,
      ),
    );
  };

  return (
    <AdminScreenLayout
      title="Annadanam Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Annadanam Management</Text>
      <Text style={styles.sub}>Manage Japa and General Annadanam.</Text>

      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.title}</Text>
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
              {item.active ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </AdminScreenLayout>
  );
};

export default AdminAnnadanamScreen;

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
  pillOff: {borderColor: Colors.error},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.error},
});
