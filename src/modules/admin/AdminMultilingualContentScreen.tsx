import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_CONTENT_ITEMS, AdminContentItem} from './adminData';

const AdminMultilingualContentScreen = () => {
  const [items] = useState<AdminContentItem[]>(ADMIN_CONTENT_ITEMS);

  return (
    <AdminScreenLayout
      title="Multilingual Content Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Multilingual Content Management</Text>
      <Text style={styles.sub}>Maintain translations for app content.</Text>

      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.languages}</Text>
          </View>
          <TouchableOpacity
            style={styles.pill}
            onPress={() =>
              Alert.alert('Edit content', `${item.title} editor coming next.`)
            }>
            <Text style={styles.pillText}>Edit</Text>
          </TouchableOpacity>
        </View>
      ))}

      <PrimaryButton
        title="SAVE CONTENT"
        onPress={() =>
          Alert.alert('Saved', 'Translations will sync when APIs are ready.')
        }
      />
    </AdminScreenLayout>
  );
};

export default AdminMultilingualContentScreen;

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
  copy: {flex: 1, paddingRight: 10},
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
    borderColor: Colors.templeGold,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.sacredBrown,
  },
});
