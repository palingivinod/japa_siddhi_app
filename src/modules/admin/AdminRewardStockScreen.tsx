import React, {useEffect, useState} from 'react';
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
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import {
  pickProfilePhoto,
  resolveMediaUrl,
} from '../../services/profilePhoto';
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
  const [imageUrl, setImageUrl] = useState<string | null>(
    route.params?.imageUrl || null,
  );
  const [newImage, setNewImage] = useState<{
    uri: string;
    type?: string;
    fileName?: string;
  } | null>(null);
  const [stock, setStock] = useState(
    Math.max(0, Number(route.params?.stock ?? 0)),
  );
  const [saving, setSaving] = useState(false);
  const [stockBusy, setStockBusy] = useState(false);
  const [loading, setLoading] = useState(!route.params?.name && Boolean(rewardId));
  const inStock = stock > 0;

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
        if (match.imageUrl) {
          setImageUrl(match.imageUrl);
        }
        setStock(Math.max(0, Number(match.stock || 0)));
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

  const setStockStatus = async (nextInStock: boolean) => {
    if (!rewardId) {
      Alert.alert('Missing reward', 'Reward id is required.');
      return;
    }
    const nextStock = nextInStock ? (stock > 0 ? stock : 50) : 0;
    if (nextInStock === inStock) {
      return;
    }
    setStockBusy(true);
    try {
      await apiService.put(`/admin/rewards/${rewardId}`, {
        stock: nextStock,
        active: true,
      });
      setStock(nextStock);
    } catch (err) {
      Alert.alert(
        'Stock',
        getApiError(err, 'Could not update stock status.'),
      );
    } finally {
      setStockBusy(false);
    }
  };

  const pickImage = async () => {
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
        stock,
        active: true,
      });

      if (newImage?.uri) {
        const formData = new FormData();
        formData.append('image', {
          uri: newImage.uri,
          type: newImage.type || 'image/jpeg',
          name: newImage.fileName || 'reward.jpg',
        } as any);
        await apiService.post(`/admin/rewards/${rewardId}/image`, formData);
      }

      Alert.alert('Reward updated', `${title} details saved successfully.`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err) {
      Alert.alert('Update failed', getApiError(err, 'Could not update reward.'));
    } finally {
      setSaving(false);
    }
  };

  const displayPhoto = newImage?.uri || resolveMediaUrl(imageUrl);

  return (
    <AdminScreenLayout
      title="Edit Reward"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Edit Reward</Text>

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} />
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Reward Photo</Text>
            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={pickImage}
              activeOpacity={0.85}>
              {displayPhoto ? (
                <View style={styles.imagePickerFilled}>
                  <Image source={{uri: displayPhoto}} style={styles.imagePreview} />
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
          </View>

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

          <View style={styles.field}>
            <Text style={styles.label}>Stock Status</Text>
            <Text style={styles.stockHint}>
              {inStock
                ? `In Stock (${stock.toLocaleString('en-IN')}) — devotees can grab if eligible.`
                : 'Out of Stock — devotees cannot grab this reward.'}
            </Text>
            <View style={styles.stockRow}>
              <TouchableOpacity
                style={[
                  styles.stockBtn,
                  inStock && styles.stockBtnOn,
                  stockBusy && styles.stockBtnDisabled,
                ]}
                activeOpacity={0.85}
                disabled={stockBusy || saving}
                onPress={() => setStockStatus(true)}>
                <Text
                  style={[
                    styles.stockBtnText,
                    inStock && styles.stockBtnTextOn,
                  ]}>
                  In Stock
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.stockBtn,
                  !inStock && styles.stockBtnOff,
                  stockBusy && styles.stockBtnDisabled,
                ]}
                activeOpacity={0.85}
                disabled={stockBusy || saving}
                onPress={() => setStockStatus(false)}>
                <Text
                  style={[
                    styles.stockBtnText,
                    !inStock && styles.stockBtnTextOff,
                  ]}>
                  Out of Stock
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.gap} />
          <PrimaryButton
            title={saving ? 'SAVING...' : 'SAVE REWARD'}
            onPress={save}
            disabled={saving || loading || stockBusy}
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
  imagePickerBtn: {
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: Colors.background,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerFilled: {
    alignItems: 'center',
    gap: 8,
  },
  imagePreview: {
    width: 84,
    height: 84,
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
  stockHint: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  stockRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stockBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  stockBtnOn: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#EBF7EE',
  },
  stockBtnOff: {
    borderColor: Colors.error,
    backgroundColor: '#FEE2E2',
  },
  stockBtnDisabled: {
    opacity: 0.6,
  },
  stockBtnText: {
    fontWeight: '800',
    fontSize: 14,
    color: Colors.sacredBrown,
  },
  stockBtnTextOn: {
    color: Colors.leafGreen,
  },
  stockBtnTextOff: {
    color: Colors.error,
  },
  gap: {height: 16},
});
