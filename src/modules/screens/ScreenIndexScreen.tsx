import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import {SCREEN_CATALOG} from './screenCatalog';

const ScreenIndexScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="All Screens 0–64" showBack tab="Home">
      <Text style={styles.hint}>
        Open every user screen in wireframe order. Challenge and order screens
        use sample data when a live record is not selected.
      </Text>
      {SCREEN_CATALOG.map(item => (
        <TouchableOpacity
          key={`${item.order}-${item.route}`}
          style={styles.row}
          onPress={() => navigation.navigate(item.route, item.params)}>
          <View style={styles.badge}>
            <Text style={styles.num}>{item.order}</Text>
          </View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScreenLayout>
  );
};

export default ScreenIndexScreen;

const styles = StyleSheet.create({
  hint: {color: Colors.textSecondary, marginBottom: 16, lineHeight: 20},
  row: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  num: {fontWeight: '800', color: Colors.sacredBrown},
  name: {flex: 1, fontWeight: '800', color: Colors.sacredBrown},
  chevron: {fontSize: 22, color: Colors.templeGold, fontWeight: '700'},
});
