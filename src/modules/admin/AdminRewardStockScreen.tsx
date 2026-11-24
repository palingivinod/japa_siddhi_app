import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Switch,
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
import {getRewardRequirement} from '../../utils/rewardContent';
import {
  normalizeOrderPrefix,
  resolveRewardOrderPrefix,
  rewardOrderPrefix,
} from '../../utils/rewardOrderPrefix';

const resolveEligibilityField = (rewardName: string, apiValue?: number | string) => {
  const parsed = Number(apiValue || 0);
  if (Number.isFinite(parsed) && parsed > 0) {
    return String(parsed);
  }
  const fromName = getRewardRequirement(rewardName || '').count;
  return fromName > 0 ? String(fromName) : '';
};

const AdminRewardStockScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rewardId = String(route.params?.id || '').trim();

  const [name, setName] = useState(String(route.params?.name || ''));
  const [orderId, setOrderId] = useState(
    String(route.params?.orderPrefix || '').trim() ||
      (route.params?.name
        ? rewardOrderPrefix(String(route.params.name))
        : ''),
  );
  const [orderIdTouched, setOrderIdTouched] = useState(
    Boolean(String(route.params?.orderPrefix || '').trim()),
  );
  const [allRewards, setAllRewards] = useState<
    Array<{id: string; name: string; orderPrefix?: string | null}>
  >([]);
  const [description, setDescription] = useState(
    String(route.params?.description || ''),
  );
  const [eligibilityCriteria, setEligibilityCriteria] = useState(
    resolveEligibilityField(
      String(route.params?.name || ''),
      route.params?.eligibilityCriteria,
    ),
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
  const [adminMarkedOos, setAdminMarkedOos] = useState(
    route.params?.adminMarkedOos === true ||
      route.params?.adminMarkedOos === 1 ||
      route.params?.inStock === false,
  );
  const [unlockMode, setUnlockMode] = useState<'fixed' | 'relative'>(
    String(route.params?.unlockMode || '').toLowerCase() === 'relative'
      ? 'relative'
      : 'fixed',
  );
  const [saving, setSaving] = useState(false);
  const [stockBusy, setStockBusy] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [loading, setLoading] = useState(!route.params?.name && Boolean(rewardId));
  // Qty is a label only — availability is the admin In/Out toggle.
  const inStock = !adminMarkedOos;

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
        setAllRewards(
          rows.map((row: any) => ({
            id: String(row.id),
            name: String(row.name || row.title || ''),
            orderPrefix:
              String(row.orderPrefix || row.order_prefix || '').trim() || null,
          })),
        );
        const match = rows.find((row: any) => String(row.id) === rewardId);
        if (!match) {
          Alert.alert('Not found', 'Reward could not be loaded.');
          return;
        }
        const rewardName = String(match.name || match.title || '');
        setName(rewardName);
        const storedPrefix = String(
          match.orderPrefix || match.order_prefix || '',
        ).trim();
        setOrderId(
          storedPrefix || resolveRewardOrderPrefix({name: rewardName}),
        );
        setOrderIdTouched(Boolean(storedPrefix));
        setDescription(String(match.description || ''));
        setEligibilityCriteria(
          resolveEligibilityField(
            rewardName,
            match.eligibilityCriteria ?? match.eligibility_criteria,
          ),
        );
        if (match.imageUrl) {
          setImageUrl(match.imageUrl);
        }
        setStock(Math.max(0, Number(match.stock || 0)));
        setAdminMarkedOos(
          match.adminMarkedOos === true ||
            match.adminMarkedOos === 1 ||
            match.inStock === false,
        );
        setUnlockMode(
          String(match.unlockMode || match.unlock_mode || '')
            .toLowerCase() === 'relative'
            ? 'relative'
            : 'fixed',
        );
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
    if (nextInStock === inStock) {
      return;
    }
    Alert.alert(
      nextInStock ? 'Mark In Stock?' : 'Mark Out of Stock?',
      nextInStock
        ? 'Devotees can grab this reward even if the qty number is 0 (number is only a label).'
        : 'It stays unavailable until you mark In Stock again.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: nextInStock ? 'Mark In Stock' : 'Out of Stock',
          style: nextInStock ? 'default' : 'destructive',
          onPress: async () => {
            setStockBusy(true);
            try {
              await apiService.put(`/admin/rewards/${rewardId}`, {
                inStock: nextInStock,
                adminMarkedOos: !nextInStock,
                active: true,
              });
              setAdminMarkedOos(!nextInStock);
            } catch (err) {
              Alert.alert(
                'Stock',
                getApiError(err, 'Could not update stock status.'),
              );
            } finally {
              setStockBusy(false);
            }
          },
        },
      ],
    );
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

  const prefixConflict = (() => {
    const prefix = normalizeOrderPrefix(orderId);
    if (prefix.length < 2) {
      return null;
    }
    return (
      allRewards.find(
        item =>
          item.id !== rewardId &&
          resolveRewardOrderPrefix({
            name: item.name,
            orderPrefix: item.orderPrefix,
          }) === prefix,
      ) || null
    );
  })();

  const save = async () => {
    if (!rewardId) {
      Alert.alert('Missing reward', 'Reward id is required.');
      return;
    }
    const title = name.trim();
    const desc = description.trim();
    const orderPrefix = normalizeOrderPrefix(
      orderId || rewardOrderPrefix(title),
    );
    const rawElig = eligibilityCriteria.replace(/\D/g, '');
    const parsed = rawElig ? parseInt(rawElig, 10) : 0;
    const fromName = title ? getRewardRequirement(title).count : 0;
    const eligibility =
      Number.isFinite(parsed) && parsed > 0 ? parsed : fromName > 0 ? fromName : 0;
    if (orderPrefix.length < 2) {
      Alert.alert('Rewards', 'Order ID must be at least 2 letters (A–Z).');
      return;
    }
    if (prefixConflict) {
      Alert.alert(
        'Duplicate Order ID',
        `Already this ID (${orderPrefix}) is for "${prefixConflict.name}". Please choose a new ID.`,
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
        unlockMode,
        orderPrefix,
        stock,
        // Keep availability as the toggle — do not let qty=0 flip OOS on save.
        inStock: !adminMarkedOos,
        adminMarkedOos: !!adminMarkedOos,
        active: true,
        // Off by default — turn ON only to broadcast after edit.
        notifyUsers,
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

      Alert.alert(
        'Reward updated',
        notifyUsers
          ? `${title} saved and users notified.`
          : `${title} details saved successfully.`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
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
            <Text style={styles.label}>Reward Title</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={text => {
                setName(text);
                if (!orderIdTouched) {
                  setOrderId(text.trim() ? rewardOrderPrefix(text) : '');
                }
              }}
              placeholder="Enter reward title"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Order ID (auto — editable)</Text>
            <TextInput
              style={styles.input}
              value={orderId}
              onChangeText={text => {
                setOrderIdTouched(true);
                setOrderId(normalizeOrderPrefix(text));
              }}
              autoCapitalize="characters"
              maxLength={3}
              placeholder="e.g. CM"
              placeholderTextColor={Colors.placeholder}
            />
            <Text style={styles.stockHint}>
              Used on claim orders (e.g. CM00001). Change if needed.
            </Text>
            {prefixConflict ? (
              <Text style={styles.prefixWarn}>
                {`Already this ID (${normalizeOrderPrefix(orderId)}) is for "${prefixConflict.name}". Please choose a new ID.`}
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
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
            <Text style={styles.label}>
              {unlockMode === 'relative'
                ? 'Extra japa count (Present + N)'
                : 'Eligibility Criteria (Japa Count)'}
            </Text>
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
                ? `In Stock — devotees can grab if eligible. Qty label: ${stock.toLocaleString('en-IN')} (does not block claims).`
                : `Out of Stock — devotees cannot grab. Qty label: ${stock.toLocaleString('en-IN')}.`}
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

          <View style={styles.notifyRow}>
            <View style={styles.notifyCopy}>
              <Text style={styles.label}>Notify all users</Text>
              <Text style={styles.stockHint}>
                Leave OFF while testing. Turn ON only when you want a push about
                this updated reward.
              </Text>
            </View>
            <Switch
              value={notifyUsers}
              onValueChange={setNotifyUsers}
              trackColor={{false: '#D1D5DB', true: Colors.leafGreen}}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.gap} />
          <PrimaryButton
            title={saving ? 'SAVING...' : 'SAVE REWARD'}
            onPress={save}
            disabled={saving || loading || stockBusy || Boolean(prefixConflict)}
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
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    paddingVertical: 4,
  },
  notifyCopy: {
    flex: 1,
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
  prefixWarn: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 4,
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
