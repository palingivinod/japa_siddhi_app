import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';

export type TabKey = 'Home' | 'JapaHub' | 'SevaHub' | 'Orders' | 'Profile';

interface Props {
  active: TabKey;
}

const TABS: Array<{key: TabKey; label: string; icon: string}> = [
  {key: 'Home', label: 'Home', icon: '⌂'},
  {key: 'JapaHub', label: 'Japa', icon: '◎'},
  {key: 'SevaHub', label: 'Seva', icon: '♡'},
  {key: 'Orders', label: 'Orders', icon: '▣'},
  {key: 'Profile', label: 'Profile', icon: '☺'},
];

const BottomTabs: React.FC<Props> = ({active}) => {
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

export default BottomTabs;

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
  },
  icon: {
    fontSize: 18,
    color: Colors.leafGreen,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.leafGreen,
  },
  active: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
});
