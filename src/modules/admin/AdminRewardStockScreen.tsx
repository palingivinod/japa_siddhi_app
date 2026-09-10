import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'number-pad';
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholderTextColor={Colors.placeholder}
    />
  </View>
);

const AdminRewardStockScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rewardId = String(route.params?.id || '').trim();

  const [name, setName] = useState(String(route.params?.name || ''));
  const [currentStock, setCurrentStock] = useState(
    String(route.params?.stock ?? 0),
  );
  const [quantity, setQuantity] = useState('0');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!route.params?.name && Boolean(rewardId));

  useEffect(() => {
    if (!rewardId || route.params?.name) {
      return;
    }
    let alive = true;
    setLoading(true);
    apiService
      .get('/admin/rewards')
      .then(response => {
        if (!alive) {
          return;
        }
        const rows = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        const match = rows.find((row: any) => String(row.id) === rewardId);
        if (!match) {
          Alert.alert('Not found', 'Reward could not be loaded.');
          return;
        }
        setName(String(match.name || ''));
        setCurrentStock(String(match.stock ?? 0));
      })
      .catch(err => {
        Alert.alert('Rewards', getApiError(err, 'Could not load reward.'));
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [rewardId, route.params?.name]);

  const previewStock = useMemo(() => {
    const base = Number(currentStock);
    const delta = Number(quantity);
    const safeBase = Number.isFinite(base) ? base : 0;
    const safeDelta = Number.isFinite(delta) ? delta : 0;
    return Math.max(0, Math.round(safeBase + safeDelta));
  }, [currentStock, quantity]);

  const inStock = previewStock > 0;

  const save = async () => {
    if (!rewardId) {
      Alert.alert('Missing reward', 'Reward id is required.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Required', 'Enter a reward name.');
      return;
    }
    setSaving(true);
    try {
      await apiService.put(`/admin/rewards/${rewardId}`, {
        name: name.trim(),
        stock: previewStock,
        active: previewStock > 0,
      });
      Alert.alert('Stock updated', `${name.trim()} stock is now ${previewStock}.`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err) {
      Alert.alert('Update failed', getApiError(err, 'Could not update stock.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout
      title="Update Reward Stock"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Update Reward Stock</Text>

      {loading ? (
        <Text style={styles.hint}>Loading reward...</Text>
      ) : (
        <>
          <Field label="Reward" value={name} onChangeText={setName} />
          <Field
            label="Current Stock"
            value={currentStock}
            onChangeText={setCurrentStock}
            keyboardType="number-pad"
          />
          <Field
            label="Add / Remove Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Stock state</Text>
          <View style={[styles.badge, inStock ? styles.badgeOn : styles.badgeOff]}>
            <Text
              style={[
                styles.badgeText,
                inStock ? styles.badgeTextOn : styles.badgeTextOff,
              ]}>
              {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
            </Text>
          </View>
          <Text style={styles.hint}>
            If stock reaches 0, user selection is disabled automatically.
          </Text>
          <Text style={styles.preview}>
            After update: {previewStock} available
          </Text>

          <View style={styles.gap} />
          <PrimaryButton
            title={saving ? 'UPDATING...' : 'UPDATE STOCK'}
            onPress={save}
            disabled={saving || loading}
          />
        </>
      )}
    </AdminScreenLayout>
  );
};

export default AdminRewardStockScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 18,
  },
  field: {marginBottom: 14},
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  badgeOn: {borderColor: Colors.leafGreen},
  badgeOff: {borderColor: Colors.error},
  badgeText: {fontWeight: '800', fontSize: 13, letterSpacing: 0.3},
  badgeTextOn: {color: Colors.leafGreen},
  badgeTextOff: {color: Colors.error},
  hint: {
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  preview: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    marginTop: 4,
  },
  gap: {height: 16},
});
