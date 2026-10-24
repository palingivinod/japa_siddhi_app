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
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {
  MantraCategoryOption,
  builtinCategories,
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
  const [categories, setCategories] = useState<MantraCategoryOption[]>(
    builtinCategories(),
  );
  const [moving, setMoving] = useState<ListedMantra | null>(null);
  const [pickingCategory, setPickingCategory] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

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

  const saveCategory = async () => {
    const name = categoryName.trim();
    if (name.length < 2) {
      Alert.alert('Required', 'Enter a category name.');
      return;
    }
    setSavingCategory(true);
    try {
      const response = await apiService.post('/admin/mantra-categories', {name});
      const created = response.data?.data;
      if (created?.code) {
        setCategories(current => [
          ...current,
          {code: String(created.code), name: String(created.name || name)},
        ]);
      }
      setCategoryName('');
      setAddingCategory(false);
    } catch (err) {
      Alert.alert(
        'Could not add category',
        getApiError(err, 'Could not add the category.'),
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const openAddMantra = (category: MantraCategoryOption) => {
    setPickingCategory(false);
    setAddingCategory(false);
    setOpenCode(category.code);
    navigation.navigate('AdminMantraEdit', {
      japaList,
      categoryCode: category.code,
      categoryName: category.name,
    });
  };

  const {unassigned, groups} = groupByCategory(mantras, categories);
  const openCategory = categories.find(category => category.code === openCode);

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
              categoryName:
                categories.find(category => category.code === item.categoryCode)
                  ?.name || '',
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

  const confirmMove = (category: MantraCategoryOption) => {
    if (!moving) {
      return;
    }
    if (moving.categoryCode === category.code) {
      Alert.alert(
        'Already there',
        `"${moving.name}" is already in ${category.name}.`,
      );
      return;
    }
    Alert.alert(
      'Move mantra',
      `Move "${moving.name}" to ${category.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Move',
          onPress: () => {
            setOpenCode(category.code);
            moveTo(category.code);
          },
        },
      ],
    );
  };

  const onCategoryPress = (category: MantraCategoryOption) => {
    if (moving) {
      confirmMove(category);
      return;
    }
    if (pickingCategory) {
      openAddMantra(category);
      return;
    }
    setOpenCode(current => (current === category.code ? null : category.code));
  };

  return (
    <AdminScreenLayout
      title={listTitle}
      tab="AdminJapa"
      showBack
      pinned={
        <View>
          <View style={styles.pinRow}>
            <TouchableOpacity
              style={styles.pinBtn}
              onPress={() => {
                setMoving(null);
                setPickingCategory(false);
                setAddingCategory(true);
              }}>
              <Text style={styles.pinText}>ADD CATEGORY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pinBtn}
              onPress={() => {
                setAddingCategory(false);
                if (openCategory) {
                  openAddMantra(openCategory);
                  return;
                }
                setPickingCategory(true);
              }}>
              <Text style={styles.pinText}>ADD MANTRA</Text>
            </TouchableOpacity>
          </View>
          {addingCategory ? (
            <View style={styles.picker}>
              <Text style={styles.pickerTitle}>New category</Text>
              <TextInput
                style={styles.input}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="Category name"
                placeholderTextColor={Colors.placeholder}
              />
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  disabled={savingCategory}
                  onPress={saveCategory}>
                  <Text style={styles.editText}>
                    {savingCategory ? 'Saving' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddingCategory(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {moving ? (
            <Text style={styles.hint}>
              Tap a category to move "{moving.name}".{' '}
              <Text style={styles.cancelInline} onPress={() => setMoving(null)}>
                Cancel
              </Text>
            </Text>
          ) : null}
          {pickingCategory ? (
            <Text style={styles.hint}>
              Tap a category to add the mantra there.{' '}
              <Text
                style={styles.cancelInline}
                onPress={() => setPickingCategory(false)}>
                Cancel
              </Text>
            </Text>
          ) : null}
        </View>
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

      {!loading
        ? groups.map(group => {
            const open = !moving && openCode === group.code;
            return (
              <View key={group.code} style={styles.section}>
                <TouchableOpacity
                  style={[
                    styles.categoryBtn,
                    moving && styles.categoryBtnMove,
                    open && styles.categoryBtnOpen,
                  ]}
                  onPress={() => onCategoryPress(group)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.categoryText,
                      moving && styles.categoryTextMove,
                      open && styles.categoryTextOpen,
                    ]}>
                    {group.name}
                  </Text>
                  <Text
                    style={[
                      styles.categoryCount,
                      moving && styles.categoryCountMove,
                      open && styles.categoryTextOpen,
                    ]}>
                    {group.items.length}
                  </Text>
                </TouchableOpacity>
                {open ? (
                  <View style={styles.openBox}>
                    {group.items.length === 0 ? (
                      <Text style={styles.empty}>No mantras in this category yet.</Text>
                    ) : (
                      group.items.map(renderMantra)
                    )}
                    <TouchableOpacity
                      style={styles.addInCategory}
                      onPress={() => openAddMantra(group)}>
                      <Text style={styles.addInCategoryText}>
                        ADD MANTRA IN {group.name.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        : null}

      {!loading && unassigned.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not in a category yet</Text>
          <Text style={styles.meta}>
            Move each mantra into a category when you are ready.
          </Text>
          {unassigned.map(renderMantra)}
        </View>
      ) : null}
    </AdminScreenLayout>
  );
};

export default AdminMantrasScreen;

const styles = StyleSheet.create({
  pinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pinBtn: {
    flex: 1,
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
  hint: {
    marginTop: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
    lineHeight: 20,
  },
  cancelInline: {
    color: Colors.textSecondary,
    fontWeight: '800',
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  categoryBtnOpen: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  categoryBtnMove: {
    paddingVertical: 22,
    marginBottom: 18,
  },
  categoryText: {
    flex: 1,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
  },
  categoryTextMove: {
    fontSize: 22,
    lineHeight: 28,
  },
  categoryCountMove: {
    fontSize: 18,
  },
  categoryTextOpen: {
    color: Colors.white,
  },
  categoryCount: {
    marginLeft: 8,
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  openBox: {
    marginBottom: 8,
  },
  addInCategory: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  addInCategoryText: {
    color: Colors.templeGold,
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
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.sacredBrown,
    fontSize: 16,
  },
  buttonGap: {
    height: 10,
  },
});
