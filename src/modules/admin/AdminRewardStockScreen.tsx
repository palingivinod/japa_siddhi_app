import React, {useEffect, useState} from 'react';
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

const AdminRewardStockScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rewardId = String(route.params?.id || '').trim();

  const [name, setName] = useState(String(route.params?.name || ''));
  const [description, setDescription] = useState(
    String(route.params?.description || ''),
  );
  const [eligibilityCriteria, setEligibilityCriteria] = useState(
    route.params?.eligibilityCriteria
      ? String(route.params.eligibilityCriteria)
      : '',
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!route.params?.name && Boolean(rewardId));

  useEffect(() => {
    if (!rewardId) {
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
        setName(String(match.name || match.title || ''));
        setDescription(String(match.description || ''));
        if (match.eligibilityCriteria) {
          setEligibilityCriteria(String(match.eligibilityCriteria));
        }
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
  }, [rewardId]);

  const save = async () => {
    if (!rewardId) {
      Alert.alert('Missing reward', 'Reward id is required.');
      return;
    }
    const title = name.trim();
    const desc = description.trim();
    const rawElig = eligibilityCriteria.replace(/\D/g, '');
    const eligibility = parseInt(rawElig, 10);

    if (!title) {
      Alert.alert('Required', 'Enter a reward title.');
      return;
    }
    if (!desc) {
      Alert.alert('Required', 'Enter a reward description.');
      return;
    }
    if (!eligibility || eligibility <= 0) {
      Alert.alert(
        'Required',
        'Enter a valid eligibility number (greater than 0).',
      );
      return;
    }

    setSaving(true);
    try {
      await apiService.put(`/admin/rewards/${rewardId}`, {
        name: title,
        title,
        description: desc,
        eligibilityCriteria: eligibility,
        active: true,
      });
      Alert.alert('Reward updated', `${title} details saved successfully.`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err) {
      Alert.alert('Update failed', getApiError(err, 'Could not update reward.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout
      title="Edit Reward"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Edit Reward</Text>

      {loading ? (
        <Text style={styles.hint}>Loading reward...</Text>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Reward Title *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter reward title"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description and benefits"
              placeholderTextColor={Colors.placeholder}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Eligibility Criteria (Japa Count) *</Text>
            <TextInput
              style={styles.input}
              value={eligibilityCriteria}
              onChangeText={setEligibilityCriteria}
              keyboardType="number-pad"
              placeholder="e.g. 5000, 30000"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          <View style={styles.gap} />
          <PrimaryButton
            title={saving ? 'SAVING...' : 'SAVE REWARD'}
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
  field: {marginBottom: 16},
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  hint: {
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  gap: {height: 16},
});
