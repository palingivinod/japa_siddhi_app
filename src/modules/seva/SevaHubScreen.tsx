import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import BottomTabs from '../common/BottomTabs';

const ITEMS = [
  {
    title: 'Baanalingam',
    sub: 'Apply / order',
    route: 'BanaLingam',
  },
  {
    title: 'Annadanam',
    sub: 'Offer food service',
    route: 'Donate',
  },
  {
    title: 'Nithya Homam',
    sub: 'Enroll now',
    route: 'NithyaHomam',
  },
];

const SevaHubScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Seva" />
        <Text style={styles.heading}>Spiritual services</Text>
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => navigation.navigate(item.route)}>
            <View style={styles.dot} />
            <View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <BottomTabs active="SevaHub" />
    </SafeAreaView>
  );
};

export default SevaHubScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    marginRight: 12,
  },
  title: {fontSize: 18, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 4, color: Colors.textSecondary},
});
