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
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/rewards');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const mapped = rows.map((row: any) => ({
        id: String(row.id),
        name: String(row.name || ''),
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
      <Text style={styles.section}>Reward choices.</Text>
      <Text style={styles.hint}>
        Upload a photo on each reward. You can also attach an image when sending
        a notification.
      </Text>

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
              <Text style={styles.stock}>Stock: {item.stock}</Text>
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
  stock: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
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
