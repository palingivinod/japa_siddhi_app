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
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import MoveCategoryModal from './MoveCategoryModal';
import {
  MantraCategoryOption,
  builtinCategories,
  mantraListLabel,
} from '../japa/mantraCategories';

type ListedMantra = {
  id: string;
  name: string;
  active: boolean;
  target: number;
  categoryCode: string;
};

const AdminMantraCategoryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const japaList =
    String(route.params?.list || 'SAMUHIKA').toUpperCase() === 'ANTHARANGA'
      ? 'ANTHARANGA'
      : 'SAMUHIKA';
  const categoryCode = String(route.params?.categoryCode || '');
  const categoryName = String(route.params?.categoryName || 'Category');
  const listTitle = mantraListLabel(japaList);
  const [mantras, setMantras] = useState<ListedMantra[]>([]);
  const [categories, setCategories] = useState<MantraCategoryOption[]>(
    builtinCategories(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState<ListedMantra | null>(null);

  const loadMantras = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [response, categoryResponse] = await Promise.all([
        apiService.get('/admin/mantras', {params: {list: japaList}}),
        apiService.get('/admin/mantra-categories'),
      ]);
      const categoryRows = Array.isArray(categoryResponse.data?.data)
        ? categoryResponse.data.data
        : [];
      if (categoryRows.length > 0) {
        setCategories(
          categoryRows.map((row: any) => ({
            code: String(row.code || ''),
            name: String(row.name || ''),
          })),
        );
      }
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setMantras(
        rows
          .map((row: any) => ({
            id: String(row.id),
            name: row.name || '',
            active: Boolean(row.active),
            target: Number(row.target) || 0,
            categoryCode: String(row.categoryCode || ''),
          }))
          .filter((row: ListedMantra) => row.categoryCode === categoryCode),
      );
    } catch (err) {
      setMantras([]);
      setError(getApiError(err, 'Could not load mantras.'));
    } finally {
      setLoading(false);
    }
  }, [categoryCode, japaList]);

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

  const moveTo = async (item: ListedMantra, nextCode: string) => {
    try {
      await apiService.put(`/admin/mantras/${item.id}/category`, {
        categoryCode: nextCode,
      });
      setMantras(current => current.filter(row => row.id !== item.id));
    } catch (err) {
      Alert.alert('Move failed', getApiError(err, 'Could not move mantra.'));
    }
  };

  const askMove = (category: MantraCategoryOption) => {
    const target = moving;
    setMoving(null);
    if (!target) {
      return;
    }
    if (target.categoryCode === category.code) {
      Alert.alert(
        'Already there',
        `"${target.name}" is already in ${category.name}.`,
      );
      return;
    }
    Alert.alert(
      'Move mantra',
      `Move "${target.name}" to ${category.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Move', onPress: () => moveTo(target, category.code)},
      ],
    );
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

  return (
    <AdminScreenLayout
      title={categoryName}
      tab="AdminJapa"
      showBack
      pinned={
        <TouchableOpacity
          style={styles.pinBtn}
          onPress={() =>
            navigation.navigate('AdminMantraEdit', {
              japaList,
              categoryCode,
              categoryName,
            })
          }>
          <Text style={styles.pinText}>ADD MANTRA</Text>
        </TouchableOpacity>
      }>
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
      {!loading && mantras.length === 0 ? (
        <Text style={styles.empty}>No mantras in this category yet.</Text>
      ) : null}
      {mantras.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          {item.target > 0 || !item.active ? (
            <Text style={styles.meta}>
              {item.target > 0 ? `Target ${item.target.toLocaleString('en-IN')}` : ''}
              {!item.active ? `${item.target > 0 ? ' • ' : ''}Inactive` : ''}
            </Text>
          ) : null}
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
                  categoryCode,
                  categoryName,
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
              <Text style={styles.editText}>
                {item.active ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <MoveCategoryModal
        visible={Boolean(moving)}
        mantraName={moving?.name || ''}
        categories={categories}
        onCancel={() => setMoving(null)}
        onSelect={askMove}
      />
    </AdminScreenLayout>
  );
};

export default AdminMantraCategoryScreen;

const styles = StyleSheet.create({
  pinBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pinText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
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
});
