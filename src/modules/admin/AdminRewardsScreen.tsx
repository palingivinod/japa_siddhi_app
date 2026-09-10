import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminReward} from './adminData';

const AdminRewardsScreen = () => {
  const navigation = useNavigation<any>();
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/rewards');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setRewards(
        rows.map((row: any) => ({
          id: String(row.id),
          name: String(row.name || ''),
          stock: Number(row.stock || 0),
        })),
      );
    } catch (err) {
      setRewards([]);
      Alert.alert('Rewards', getApiError(err, 'Could not load rewards.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <AdminScreenLayout title="Configure Rewards" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Configure Rewards</Text>
      <Text style={styles.section}>Reward choices.</Text>

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}

      {rewards.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('AdminRewardStock', {
                id: item.id,
                name: item.name,
                stock: item.stock,
              })
            }
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.edit}>EDIT</Text>
          </TouchableOpacity>
        </View>
      ))}

      {!loading && rewards.length === 0 ? (
        <Text style={styles.empty}>No rewards configured yet.</Text>
      ) : null}

      <View style={styles.gap} />
      <PrimaryButton
        title="SAVE REWARD SETTINGS"
        onPress={() => {
          Alert.alert('Saved', 'Reward settings are up to date.', [
            {text: 'OK', onPress: () => navigation.goBack()},
          ]);
        }}
      />
    </AdminScreenLayout>
  );
};

export default AdminRewardsScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 18,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  edit: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  gap: {height: 16},
});
