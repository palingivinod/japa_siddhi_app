import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {
  ADMIN_NITHYA_HOMAM,
  AdminHomamItem,
  AdminHomamStatus,
} from './adminData';

const nextStatus = (status: AdminHomamStatus): AdminHomamStatus =>
  status === 'Active' ? 'Completed' : 'Active';

const AdminNithyaHomamScreen = () => {
  const [items, setItems] = useState<AdminHomamItem[]>(ADMIN_NITHYA_HOMAM);

  const cycle = (id: string) => {
    setItems(current =>
      current.map(item => {
        if (item.id !== id) {
          return item;
        }
        const status = nextStatus(item.status);
        return {
          ...item,
          status,
          stage: status === 'Completed' ? 'Completed' : item.stage,
        };
      }),
    );
  };

  return (
    <AdminScreenLayout
      title="Nithya Homam Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Nithya Homam Management</Text>
      <Text style={styles.sub}>Manage Nithya Homam enrollments.</Text>

      {items.map(item => {
        const active = item.status === 'Active';
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.code}</Text>
              <Text style={styles.meta}>
                {item.name} • {item.stage}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, active ? styles.pillOn : styles.pillDone]}
              onPress={() => cycle(item.id)}>
              <Text
                style={[
                  styles.pillText,
                  active ? styles.pillTextOn : styles.pillTextDone,
                ]}>
                {item.status}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminNithyaHomamScreen;

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
  pillDone: {borderColor: Colors.leafGreen},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextDone: {color: Colors.leafGreen},
});
