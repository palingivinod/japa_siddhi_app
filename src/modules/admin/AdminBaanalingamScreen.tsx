import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {
  ADMIN_BAANALINGAM,
  AdminBaanalingamItem,
  AdminBaanalingamStatus,
} from './adminData';

const nextStatus = (
  status: AdminBaanalingamStatus,
): AdminBaanalingamStatus => {
  if (status === 'Pending') {
    return 'Sent';
  }
  if (status === 'Sent') {
    return 'Delivered';
  }
  return 'Pending';
};

const statusTone = (status: AdminBaanalingamStatus) => {
  if (status === 'Pending') {
    return {border: Colors.templeGold, text: Colors.templeGold};
  }
  return {border: Colors.leafGreen, text: Colors.leafGreen};
};

const AdminBaanalingamScreen = () => {
  const [items, setItems] =
    useState<AdminBaanalingamItem[]>(ADMIN_BAANALINGAM);

  const cycle = (id: string) => {
    setItems(current =>
      current.map(item =>
        item.id === id ? {...item, status: nextStatus(item.status)} : item,
      ),
    );
  };

  return (
    <AdminScreenLayout
      title="Baanalingam Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Baanalingam Management</Text>
      <Text style={styles.sub}>Manage applications, payments and orders.</Text>

      {items.map(item => {
        const tone = statusTone(item.status);
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.code}</Text>
              <Text style={styles.meta}>{item.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, {borderColor: tone.border}]}
              onPress={() => cycle(item.id)}>
              <Text style={[styles.pillText, {color: tone.text}]}>
                {item.status}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminBaanalingamScreen;

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
  pillText: {fontWeight: '800', fontSize: 13},
});
