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
import {
  checkRewardEligibility,
  getRewardRequirement,
} from '../../utils/rewardContent';

type RewardTab = 'fixed' | 'relative';

/** Same eligibility devotees see (API override, else name-based). */
const displayEligibility = (
  name: string,
  apiCriteria?: number,
  unlockMode?: string,
) => {
  if (unlockMode === 'relative') {
    const extra = Number(apiCriteria || 0);
    return extra > 0
      ? `Present + ${extra.toLocaleString('en-IN')} Japas`
      : 'Present + count';
  }
  const elig = checkRewardEligibility(
    name,
    0,
    'en',
    typeof apiCriteria === 'number' && apiCriteria > 0 ? apiCriteria : undefined,
  );
  if (elig.requiredJapas > 0) {
    return `${elig.requiredJapas.toLocaleString('en-IN')} Japas`;
  }
  return elig.requiredLabel || '—';
};

const AdminRewardsScreen = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<RewardTab>('fixed');
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEligibility, setNewEligibility] = useState('');
  const [newImage, setNewImage] = useState<{
    uri: string;
    type?: string;
    fileName?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/rewards');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const mapped = rows.map((row: any) => {
        const unlockMode =
          String(row.unlockMode || row.unlock_mode || 'fixed').toLowerCase() ===
          'relative'
            ? 'relative'
            : 'fixed';
        return {
          id: String(row.id),
          name: String(row.name || ''),
          description: String(row.description || ''),
          eligibilityCriteria: Number(
            row.eligibilityCriteria ?? row.eligibility_criteria ?? 0,
          ),
          unlockMode: unlockMode as 'fixed' | 'relative',
          stock: Number(row.stock || 0),
          inStock: row.inStock !== false && !row.adminMarkedOos,
          adminMarkedOos: Boolean(row.adminMarkedOos),
          imageUrl: row.imageUrl || row.imagePath || null,
        };
      });
      setRewards(
        [...mapped].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}),
        ),
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

  const pickNewImage = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Reward image',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (picked?.uri) {
        setNewImage(picked);
      }
    } catch (err: any) {
      if (String(err?.message || '') === 'native_module_missing') {
        Alert.alert(
          'Photo picker unavailable',
          'Rebuild the app so the image picker native module is linked.',
        );
      }
    }
  };

  const addReward = async () => {
    const title = newTitle.trim();
    const desc = newDescription.trim();
    const rawElig = newEligibility.replace(/\D/g, '');
    const parsed = rawElig ? parseInt(rawElig, 10) : 0;
    const fromName = title ? getRewardRequirement(title).count : 0;
    const eligibility =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : tab === 'relative'
          ? 0
          : fromName > 0
            ? fromName
            : 0;
    if (!title || !desc) {
      Alert.alert('Rewards', 'Title and description are required.');
      return;
    }
    if (tab === 'relative' && eligibility <= 0) {
      Alert.alert(
        'Rewards',
        'Enter the extra japa count (present + N), e.g. 3000.',
      );
      return;
    }

    setSaving(true);
    try {
      const res = await apiService.post('/admin/rewards', {
        name: title,
        title,
        description: desc,
        eligibilityCriteria: eligibility,
        unlockMode: tab,
      });

      const createdId = res.data?.data?.id;
      if (createdId && newImage?.uri) {
        try {
          const formData = new FormData();
          formData.append('image', {
            uri: newImage.uri,
            type: newImage.type || 'image/jpeg',
            name: newImage.fileName || 'reward.jpg',
          } as any);
          await apiService.post(`/admin/rewards/${createdId}/image`, formData);
        } catch {
          // Photo upload can be retried via CHANGE PHOTO on the card
        }
      }

      setNewTitle('');
      setNewDescription('');
      setNewEligibility('');
      setNewImage(null);
      setShowAdd(false);
      await load();
    } catch (err) {
      Alert.alert('Rewards', getApiError(err, 'Could not add reward.'));
    } finally {
      setSaving(false);
    }
  };

  const visibleRewards = rewards.filter(item =>
    tab === 'relative'
      ? item.unlockMode === 'relative'
      : item.unlockMode !== 'relative',
  );

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
        'This photo will show in reward notifications and user catalog.',
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
        Fixed = lifetime japa target. Present + Count = each devotee’s current
        total + the extra count you set (like Marakata + 3000).
      </Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabChip, tab === 'fixed' && styles.tabChipOn]}
          onPress={() => {
            setTab('fixed');
            setShowAdd(false);
          }}
          activeOpacity={0.85}>
          <Text style={[styles.tabChipText, tab === 'fixed' && styles.tabChipTextOn]}>
            Fixed targets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabChip, tab === 'relative' && styles.tabChipOn]}
          onPress={() => {
            setTab('relative');
            setShowAdd(false);
          }}
          activeOpacity={0.85}>
          <Text
            style={[styles.tabChipText, tab === 'relative' && styles.tabChipTextOn]}>
            Present + Count
          </Text>
        </TouchableOpacity>
      </View>

      <PrimaryButton
        title={
          showAdd
            ? 'CANCEL'
            : tab === 'relative'
              ? 'ADD PRESENT + COUNT REWARD'
              : 'ADD REWARD'
        }
        onPress={() => setShowAdd(current => !current)}
      />
      <View style={styles.gap} />

      {showAdd ? (
        <View style={styles.addCard}>
          <Text style={styles.label}>Reward Photo</Text>
          <TouchableOpacity
            style={styles.imagePickerBtn}
            onPress={pickNewImage}
            activeOpacity={0.85}>
            {newImage?.uri ? (
              <View style={styles.imagePickerFilled}>
                <Image source={{uri: newImage.uri}} style={styles.imagePreview} />
                <Text style={styles.changeImageText}>Change Photo</Text>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📷</Text>
                <Text style={styles.imagePlaceholderText}>
                  + Tap to select reward photo
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Reward Title</Text>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="e.g. Consecrated Mala"
            placeholderTextColor={Colors.placeholder}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={newDescription}
            onChangeText={setNewDescription}
            placeholder="Enter reward description and benefits"
            placeholderTextColor={Colors.placeholder}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>
            {tab === 'relative'
              ? 'Extra japa count (Present + N)'
              : 'Eligibility Criteria (Japa Count)'}
          </Text>
          <TextInput
            style={styles.input}
            value={newEligibility}
            onChangeText={setNewEligibility}
            keyboardType="number-pad"
            placeholder={tab === 'relative' ? 'e.g. 3000, 5000' : 'e.g. 5000, 30000'}
            placeholderTextColor={Colors.placeholder}
          />
          {tab === 'relative' ? (
            <Text style={styles.relativeHint}>
              Devotee unlocks at their present total + this number. Each user gets
              their own personal target.
            </Text>
          ) : null}

          <PrimaryButton
            title={saving ? 'SAVING...' : 'SAVE REWARD'}
            onPress={addReward}
            disabled={saving}
          />
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}

      {visibleRewards.map(item => {
        const photo = resolveMediaUrl(item.imageUrl);
        const inStock = item.inStock !== false && !item.adminMarkedOos;
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
                <Text style={styles.eligibilityLabel}>
                  {tab === 'relative' ? 'Unlock:' : 'Eligibility:'}
                </Text>
                <Text style={styles.eligibilityValue}>
                  {displayEligibility(
                    item.name,
                    item.eligibilityCriteria,
                    item.unlockMode,
                  )}
                </Text>
              </View>
              <Text
                style={[
                  styles.stockStatus,
                  inStock ? styles.stockStatusOn : styles.stockStatusOff,
                ]}>
                {inStock
                  ? `In Stock · qty ${Number(item.stock || 0).toLocaleString('en-IN')}`
                  : 'Out of Stock'}
              </Text>
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
                  onPress={() => {
                    const apiElig = Number(item.eligibilityCriteria || 0);
                    const resolved =
                      apiElig > 0
                        ? apiElig
                        : getRewardRequirement(item.name).count;
                    navigation.navigate('AdminRewardStock', {
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      eligibilityCriteria: resolved > 0 ? resolved : undefined,
                      imageUrl: item.imageUrl,
                      stock: item.stock,
                      unlockMode: item.unlockMode,
                      adminMarkedOos: item.adminMarkedOos,
                      inStock: item.inStock,
                    });
                  }}
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

      {!loading && visibleRewards.length === 0 ? (
        <Text style={styles.empty}>
          {tab === 'relative'
            ? 'No present + count rewards yet. Add one above.'
            : 'No fixed-target rewards configured yet.'}
        </Text>
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabChipOn: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#E8F5E9',
  },
  tabChipText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  tabChipTextOn: {
    color: Colors.leafGreen,
  },
  relativeHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: -4,
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
  imagePickerBtn: {
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: Colors.background,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerFilled: {
    alignItems: 'center',
    gap: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  changeImageText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  imagePlaceholder: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  imagePlaceholderIcon: {
    fontSize: 28,
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
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
  stockStatus: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  stockStatusOn: {
    color: Colors.leafGreen,
  },
  stockStatusOff: {
    color: Colors.error,
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
