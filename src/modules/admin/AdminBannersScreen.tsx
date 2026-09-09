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
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminBanner, AdminBannerStatus} from './adminData';

const MODULES = ['Home', 'Challenges', 'Annadanam', 'Japa', 'Donate'];

const nextStatus = (status: AdminBannerStatus): AdminBannerStatus => {
  if (status === 'Active') {
    return 'Scheduled';
  }
  if (status === 'Scheduled') {
    return 'Blocked';
  }
  return 'Active';
};

const statusStyle = (status: AdminBannerStatus) => {
  if (status === 'Active') {
    return {border: Colors.leafGreen, text: Colors.leafGreen};
  }
  if (status === 'Scheduled') {
    return {border: Colors.templeGold, text: Colors.templeGold};
  }
  return {border: Colors.error, text: Colors.error};
};

const AdminBannersScreen = () => {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [moduleName, setModuleName] = useState('Home');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/banners');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setBanners(
        rows.map((row: any) => ({
          id: String(row.id),
          title: row.title || '',
          module: row.module || 'Home',
          status:
            row.status === 'Scheduled' || row.status === 'Blocked'
              ? row.status
              : 'Active',
        })),
      );
    } catch (err) {
      setBanners([]);
      Alert.alert('Error', getApiError(err, 'Could not load banners.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cycle = async (item: AdminBanner) => {
    const status = nextStatus(item.status);
    setBusyId(item.id);
    try {
      await apiService.put(`/admin/banners/${item.id}`, {status});
      setBanners(prev =>
        prev.map(row => (row.id === item.id ? {...row, status} : row)),
      );
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update banner status.'),
      );
    } finally {
      setBusyId('');
    }
  };

  const remove = (item: AdminBanner) => {
    Alert.alert('Delete banner', `Remove "${item.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id);
          try {
            await apiService.delete(`/admin/banners/${item.id}`);
            setBanners(prev => prev.filter(row => row.id !== item.id));
          } catch (err) {
            Alert.alert(
              'Delete failed',
              getApiError(err, 'Could not delete banner.'),
            );
          } finally {
            setBusyId('');
          }
        },
      },
    ]);
  };

  const create = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Enter a banner title.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/admin/banners', {
        title: title.trim(),
        subtitle: subtitle.trim(),
        module: moduleName,
        status: 'Active',
      });
      setTitle('');
      setSubtitle('');
      setModuleName('Home');
      setShowForm(false);
      await load();
    } catch (err) {
      Alert.alert(
        'Create failed',
        getApiError(err, 'Could not create banner.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout title="Banner Management" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Banner Management</Text>
      <Text style={styles.sub}>
        Active Home banners appear on the user home screen. Tap status to cycle
        Active → Scheduled → Blocked.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && banners.length === 0 ? (
        <Text style={styles.empty}>No banners yet. Add one below.</Text>
      ) : null}

      {banners.map(item => {
        const tone = statusStyle(item.status);
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.module}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.pill, {borderColor: tone.border}]}
                onPress={() => cycle(item)}
                disabled={busy}>
                <Text style={[styles.pillText, {color: tone.text}]}>
                  {busy ? '...' : item.status}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => remove(item)}
                disabled={busy}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New banner</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={Colors.placeholder}
          />
          <TextInput
            style={styles.input}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="Subtitle (optional)"
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.label}>Module</Text>
          <View style={styles.moduleRow}>
            {MODULES.map(option => {
              const active = option === moduleName;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setModuleName(option)}>
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <PrimaryButton
            title={saving ? 'SAVING...' : 'SAVE BANNER'}
            onPress={create}
            disabled={saving}
          />
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowForm(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PrimaryButton title="ADD BANNER" onPress={() => setShowForm(true)} />
      )}
    </AdminScreenLayout>
  );
};

export default AdminBannersScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.textSecondary,
  },
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  empty: {color: Colors.textSecondary, marginBottom: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1, paddingRight: 8},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  actions: {alignItems: 'flex-end'},
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 92,
    alignItems: 'center',
  },
  pillText: {fontWeight: '800', fontSize: 13},
  deleteBtn: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 92,
    alignItems: 'center',
  },
  deleteText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.error,
  },
  form: {
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  formTitle: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 10,
    fontSize: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  moduleRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8},
  chip: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#E4EFDF',
  },
  chipText: {color: Colors.textSecondary, fontWeight: '700'},
  chipTextActive: {color: Colors.leafGreen},
  cancelBtn: {alignItems: 'center', marginTop: 10},
  cancelText: {color: Colors.textSecondary, fontWeight: '700'},
});
