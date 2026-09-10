import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
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
  const [busyId, setBusyId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [saving, setSaving] = useState(false);

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

  const addReward = async () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Required', 'Enter a reward name.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/admin/rewards', {
        name,
        stock: Math.max(0, Number(newStock) || 0),
      });
      setNewName('');
      setNewStock('0');
      setShowAdd(false);
      await load();
    } catch (err) {
      Alert.alert('Rewards', getApiError(err, 'Could not add reward.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteReward = (item: AdminReward) => {
    Alert.alert('Delete reward', `Remove ${item.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id);
          try {
            await apiService.delete(`/admin/rewards/${item.id}`);
            setRewards(current => current.filter(row => row.id !== item.id));
          } catch (err) {
            Alert.alert(
              'Rewards',
              getApiError(err, 'Could not delete reward.'),
            );
          } finally {
            setBusyId('');
          }
        },
      },
    ]);
  };

  return (
    <AdminScreenLayout title="Configure Rewards" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Configure Rewards</Text>
      <Text style={styles.section}>Reward choices.</Text>

      <PrimaryButton
        title={showAdd ? 'CANCEL' : 'ADD REWARD'}
        onPress={() => setShowAdd(current => !current)}
      />
      <View style={styles.gap} />

      {showAdd ? (
        <View style={styles.addCard}>
          <Text style={styles.label}>Reward name</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter reward name"
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.label}>Stock</Text>
          <TextInput
            style={styles.input}
            value={newStock}
            onChangeText={setNewStock}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.placeholder}
          />
          <PrimaryButton
            title={saving ? 'ADDING...' : 'SAVE REWARD'}
            onPress={addReward}
            disabled={saving}
          />
        </View>
      ) : null}

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
          <TouchableOpacity
            onPress={() => deleteReward(item)}
            disabled={busyId === item.id}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.delete}>
              {busyId === item.id ? '...' : 'DELETE'}
            </Text>
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
  gap: {height: 12},
  addCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    marginBottom: 12,
    color: Colors.textPrimary,
    fontSize: 16,
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
    paddingRight: 8,
  },
  edit: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.4,
    marginRight: 14,
  },
  delete: {
    color: Colors.error,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
});
