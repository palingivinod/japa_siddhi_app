import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';

export type AdminTabKey =
  | 'AdminDashboard'
  | 'AdminUsers'
  | 'AdminJapa'
  | 'AdminOrders'
  | 'AdminMore';

type TabItem = {
  key: AdminTabKey;
  label: string;
  icon: string;
};

const TABS: TabItem[] = [
  {key: 'AdminDashboard', label: 'Dashboard', icon: '📊'},
  {key: 'AdminUsers', label: 'Users', icon: '👥'},
  {key: 'AdminJapa', label: 'Japa', icon: '🕉️'},
  {key: 'AdminOrders', label: 'Orders', icon: '📦'},
  {key: 'AdminMore', label: 'More', icon: '☰'},
];

type Props = {
  active: AdminTabKey;
};

const AdminTabs: React.FC<Props> = ({active}) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => navigation.navigate(tab.key)}>
            <Text style={[styles.icon, isActive && styles.active]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.active]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default AdminTabs;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 24,
    lineHeight: 30,
    color: Colors.leafGreen,
    marginBottom: 2,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  active: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
});
