import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {
  MANTRA_CATEGORIES,
  groupByCategory,
  mantraListLabel,
} from '../japa/mantraCategories';

type ListedMantra = {
  id: string;
  name: string;
  active: boolean;
  target: number;
  categoryCode: string;
};

const AdminMantrasScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const japaList =
    String(route.params?.list || 'SAMUHIKA').toUpperCase() === 'ANTHARANGA'
      ? 'ANTHARANGA'
      : 'SAMUHIKA';
  const listTitle = mantraListLabel(japaList);
  const [mantras, setMantras] = useState<ListedMantra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState<ListedMantra | null>(null);
  const [pickingCategory, setPickingCategory] = useState(false);

  const loadMantras = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/mantras', {
        params: {list: japaList},
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setMantras(
        rows.map((row: any) => ({
          id: String(row.id),
          name: row.name || '',
          active: Boolean(row.active),
          target: Number(row.target) || 108,
          categoryCode: String(row.categoryCode || ''),
        })),
      );
    } catch (err) {
      setMantras([]);
      setError(getApiError(err, 'Could not load mantras.'));
    } finally {
      setLoading(false);
    }
  }, [japaList]);

  useFocusEffect(
    useCallback(() => {
      loadMantras();
    }, [loadMantras]),
  );

  const confirmDelete = (item: ListedMantra) => {
    Alert.alert(
      'Delete mantra',
      `Delete "${item.name}" from ${listTitle}? It is removed from the database.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/admin/mantras/${item.id}`);
              setMantras(current => current.filter(row => row.id !== item.id));
            } catch (err) {
              Alert.alert(
                'Delete failed',
                getApiError(err, 'Could not delete mantra.'),
              );
            }
          },
        },
      ],
    );
  };

  const moveTo = async (categoryCode: string) => {
    if (!moving) {
      return;
    }
    const target = moving;
    setMoving(null);
    try {
      await apiService.put(`/admin/mantras/${target.id}/category`, {
        categoryCode,
      });
      setMantras(current =>
        current.map(row =>
          row.id === target.id ? {...row, categoryCode} : row,
        ),
      );
    } catch (err) {
      Alert.alert('Move failed', getApiError(err, 'Could not move mantra.'));
    }
  };

  const toggle = async (item: ListedMantra) => {
    const nextActive = !item.active;
    setMantras(current =>
      current.map(row =>
        row.id === item.id ? {...row, active: nextActive} : row,
      ),
    );
    try {
      await apiService.put(`/admin/mantras/${item.id}`, {
        isActive: nextActive,
        active: nextActive,
      });
    } catch (err) {
      setMantras(current =>
        current.map(row =>
          row.id === item.id ? {...row, active: item.active} : row,
        ),
      );
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update mantra status.'),
      );
    }
  };

  const {unassigned, groups} = groupByCategory(mantras);

  const renderMantra = (item: ListedMantra) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        Target {item.target.toLocaleString('en-IN')}
        {item.active ? '' : ' • Inactive'}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => setMoving(item)}>
          <Text style={styles.editText}>Move</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() =>
            navigation.navigate('AdminMantraEdit', {
              mantraId: item.id,
              japaList,
              categoryCode: item.categoryCode,
            })
          }>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => confirmDelete(item)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editBtn, item.active ? styles.activeOn : null]}
          onPress={() => toggle(item)}>
          <Text style={styles.editText}>{item.active ? 'Active' : 'Inactive'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <AdminScreenLayout title={listTitle} tab="AdminJapa" showBack>
      <Text style={styles.heading}>{listTitle}</Text>
      <Text style={styles.sub}>
        Mantras in this list stay separate from the other japa list. Move puts a
        mantra in a category. Edit corrects the spelling. Delete removes it from
        this list only.
      </Text>

      {moving ? (
        <View style={styles.picker}>
          <Text style={styles.pickerTitle}>Move "{moving.name}" to</Text>
          {MANTRA_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.code}
              style={styles.pickerRow}
              onPress={() => moveTo(category.code)}>
              <Text style={styles.pickerText}>{category.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setMoving(null)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {pickingCategory ? (
        <View style={styles.picker}>
          <Text style={styles.pickerTitle}>Add the mantra in</Text>
          {MANTRA_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.code}
              style={styles.pickerRow}
              onPress={() => {
                setPickingCategory(false);
                navigation.navigate('AdminMantraEdit', {
                  japaList,
                  categoryCode: category.code,
                });
              }}>
              <Text style={styles.pickerText}>{category.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setPickingCategory(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadMantras}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && unassigned.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not in a category yet</Text>
          {unassigned.map(renderMantra)}
        </View>
      ) : null}

      {!loading
        ? groups.map(group => (
            <View key={group.code} style={styles.section}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
              {group.items.length === 0 ? (
                <Text style={styles.empty}>No mantras in this category yet.</Text>
              ) : (
                group.items.map(renderMantra)
              )}
            </View>
          ))
        : null}

      <PrimaryButton
        title="ADD MANTRA"
        onPress={() => setPickingCategory(true)}
      />
    </AdminScreenLayout>
  );
};

export default AdminMantrasScreen;

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
    lineHeight: 20,
  },
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    fontWeight: '600',
  },
  section: {marginBottom: 8},
  sectionTitle: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 6,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  editBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  activeOn: {
    borderColor: Colors.leafGreen,
  },
  editText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  deleteBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deleteText: {
    color: Colors.error,
    fontWeight: '800',
  },
  picker: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 14,
  },
  pickerTitle: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 8,
  },
  pickerRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  pickerText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  cancelText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontWeight: '800',
  },
});
