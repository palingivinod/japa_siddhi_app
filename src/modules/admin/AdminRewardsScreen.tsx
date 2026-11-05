import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  pickProfilePhoto,
  resolveMediaUrl,
} from '../../services/profilePhoto';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminReward} from './adminData';
import {sortRewardsCanonical} from '../../utils/rewardContent';

const AdminRewardsScreen = () => {
  const navigation = useNavigation<any>();
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEligibility, setNewEligibility] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/rewards');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const mapped = rows.map((row: any) => ({
        id: String(row.id),
        name: String(row.name || ''),
        description: String(row.description || ''),
        eligibilityCriteria: Number(row.eligibilityCriteria ?? row.eligibility_criteria ?? 0),
        stock: Number(row.stock || 0),
        imageUrl: row.imageUrl || row.imagePath || null,
      }));
      setRewards(sortRewardsCanonical<AdminReward>(mapped));
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
    const title = newTitle.trim();
    const desc = newDescription.trim();
    const rawElig = newEligibility.replace(/\D/g, '');
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
      await apiService.post('/admin/rewards', {
        name: title,
        title,
        description: desc,
        eligibilityCriteria: eligibility,
      });
      setNewTitle('');
      setNewDescription('');
      setNewEligibility('');
      setShowAdd(false);
      await load();
    } catch (err) {
      Alert.alert('Rewards', getApiError(err, 'Could not add reward.'));
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (item: AdminReward) => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Reward image',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (!picked?.uri) {
        return;
      }
      setBusyId(item.id);
      const formData = new FormData();
      formData.append('image', {
        uri: picked.uri,
        type: picked.type || 'image/jpeg',
        name: picked.fileName || 'reward.jpg',
      } as any);
      const response = await apiService.post(
        `/admin/rewards/${item.id}/image`,
        formData,
      );
      const imageUrl =
        response.data?.data?.imageUrl ||
        response.data?.data?.imagePath ||
        null;
      setRewards(current =>
        current.map(row =>
          row.id === item.id ? {...row, imageUrl} : row,
        ),
      );
      Alert.alert(
        'Image saved',
        'This photo will show in reward notifications when you send one with it.',
      );
    } catch (err: any) {
      if (String(err?.message || '') === 'native_module_missing') {
        Alert.alert(
          'Photo picker unavailable',
          'Rebuild the app so the image picker native module is linked.',
        );
        return;
      }
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload reward image.'),
      );
    } finally {
      setBusyId('');
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
      <Text style={styles.section}>Reward choices & eligibility.</Text>
      <Text style={styles.hint}>
        Configure spiritual rewards with title, description, and eligibility criteria.
        Upload a photo on each reward.
      </Text>

      <PrimaryButton
        title={showAdd ? 'CANCEL' : 'ADD REWARD'}
        onPress={() => setShowAdd(current => !current)}
      />
      <View style={styles.gap} />

      {showAdd ? (
        <View style={styles.addCard}>
          <Text style={styles.label}>Reward Title *</Text>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="e.g. Consecrated Mala"
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={newDescription}
            onChangeText={setNewDescription}
            placeholder="Enter reward description and benefits"
            placeholderTextColor={Colors.placeholder}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.label}>Eligibility Criteria (Japa Count) *</Text>
          <TextInput
            style={styles.input}
            value={newEligibility}
            onChangeText={setNewEligibility}
            keyboardType="number-pad"
            placeholder="e.g. 5000, 30000"
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

      {rewards.map(item => {
        const photo = resolveMediaUrl(item.imageUrl);
        return (
          <View key={item.id} style={styles.card}>
            {photo ? (
              <Image source={{uri: photo}} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Text style={styles.thumbEmptyText}>No photo</Text>
              </View>
            )}
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.eligibilityRow}>
                <Text style={styles.eligibilityLabel}>Eligibility:</Text>
                <Text style={styles.eligibilityValue}>
                  {item.eligibilityCriteria && item.eligibilityCriteria > 0
                    ? `${item.eligibilityCriteria.toLocaleString()} Japas`
                    : '5,000 Japas'}
                </Text>
              </View>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => uploadImage(item)}
                  disabled={busyId === item.id}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Text style={styles.photoBtn}>
                    {busyId === item.id ? '...' : photo ? 'CHANGE PHOTO' : 'ADD PHOTO'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('AdminRewardStock', {
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      eligibilityCriteria: item.eligibilityCriteria,
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
            </View>
          </View>
        );
      })}

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
    marginBottom: 8,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 6,
  },
  hint: {
    color: Colors.textSecondary,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginRight: 12,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  thumbEmptyText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  copy: {flex: 1},
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  eligibilityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  eligibilityValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.templeGold,
  },
  desc: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  rowActions: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  photoBtn: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  edit: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  delete: {
    color: Colors.error,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
});
