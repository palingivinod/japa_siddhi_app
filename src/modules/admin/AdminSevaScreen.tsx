import React, {useCallback} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';

/** Legacy route — Anna Santharpana & Nithya Homam are Open rows on More. */
const AdminSevaScreen = () => {
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      navigation.replace('AdminMore');
    }, [navigation]),
  );

  return (
    <AdminScreenLayout title="More" tab="AdminMore" showBack={false}>
      <View style={styles.center}>
        <ActivityIndicator color={Colors.templeGold} />
        <Text style={styles.hint}>Opening More…</Text>
      </View>
    </AdminScreenLayout>
  );
};

export default AdminSevaScreen;

const styles = StyleSheet.create({
  center: {paddingVertical: 40, alignItems: 'center'},
  hint: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
