import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_LANGUAGES, AdminLanguage} from './adminData';

const AdminLanguagesScreen = () => {
  const [languages, setLanguages] =
    useState<AdminLanguage[]>(ADMIN_LANGUAGES);

  const toggle = (id: string) => {
    setLanguages(current =>
      current.map(item =>
        item.id === id ? {...item, active: !item.active} : item,
      ),
    );
  };

  return (
    <AdminScreenLayout
      title="Language Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Language Management</Text>
      <Text style={styles.sub}>Manage supported languages.</Text>

      {languages.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>Available</Text>
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

      <PrimaryButton
        title="ADD LANGUAGE"
        onPress={() =>
          Alert.alert('Add language', 'Language editor will be wired next.')
        }
      />
    </AdminScreenLayout>
  );
};

export default AdminLanguagesScreen;

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
