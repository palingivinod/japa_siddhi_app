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
import {pickAudioFile, pickFeedbackVideo} from '../../services/mediaPick';
import {pickProfilePhoto} from '../../services/profilePhoto';
import AdminScreenLayout from './AdminScreenLayout';
import MoveCategoryModal from './MoveCategoryModal';
import {
  MantraCategoryOption,
  builtinCategories,
  groupByCategory,
  isSamuhikaStyleList,
  mantraListLabel,
  normalizeMantraListParam,
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
  const japaList = normalizeMantraListParam(route.params?.list);
  const listTitle = mantraListLabel(japaList);
  const samuhikaStyle = isSamuhikaStyleList(japaList);
  const [mantras, setMantras] = useState<ListedMantra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<MantraCategoryOption[]>(
    builtinCategories(),
  );
  const [moving, setMoving] = useState<ListedMantra | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MantraCategoryOption | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'NORMAL' | 'EVENT'>('NORMAL');
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  const [categoryVideoUrl, setCategoryVideoUrl] = useState('');
  const [categoryAudioUrl, setCategoryAudioUrl] = useState('');
  const [categoryNotify, setCategoryNotify] = useState(true);
  const [uploadingCategoryMedia, setUploadingCategoryMedia] = useState<
    null | 'image' | 'video' | 'audio'
  >(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const resetCategoryMedia = () => {
    setCategoryImageUrl('');
    setCategoryVideoUrl('');
    setCategoryAudioUrl('');
    setCategoryType('NORMAL');
    setCategoryNotify(true);
    setUploadingCategoryMedia(null);
  };

  const uploadCategoryImage = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Category image',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (!picked?.uri) {
        return;
      }
      setUploadingCategoryMedia('image');
      const formData = new FormData();
      formData.append('image', {
        uri: picked.uri,
        type: picked.type || 'image/jpeg',
        name: picked.fileName || 'category.jpg',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-image',
        formData,
      );
      const uploaded =
        response.data?.data?.imageUrl || response.data?.data?.path || '';
      if (!uploaded) {
        throw new Error('No image URL returned');
      }
      setCategoryImageUrl(String(uploaded));
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
        getApiError(err, 'Could not upload category image.'),
      );
    } finally {
      setUploadingCategoryMedia(null);
    }
  };

  const uploadCategoryVideo = async () => {
    try {
      const picked = await pickFeedbackVideo();
      if (!picked?.uri) {
        return;
      }
      setUploadingCategoryMedia('video');
      const formData = new FormData();
      formData.append('video', {
        uri: picked.uri,
        type: picked.type || 'video/mp4',
        name: picked.fileName || 'category.mp4',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-video',
        formData,
      );
      const uploaded =
        response.data?.data?.videoUrl || response.data?.data?.path || '';
      if (!uploaded) {
        throw new Error('No video URL returned');
      }
      setCategoryVideoUrl(String(uploaded));
    } catch (err: any) {
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload category video.'),
      );
    } finally {
      setUploadingCategoryMedia(null);
    }
  };

  const uploadCategoryAudio = async () => {
    try {
      setUploadingCategoryMedia('audio');
      const picked = await pickAudioFile();
      if (!picked?.uri) {
        return;
      }
      const formData = new FormData();
      formData.append('audio', {
        uri: picked.uri,
        type: picked.type || 'audio/mpeg',
        name: picked.fileName || 'category.mp3',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-audio',
        formData,
      );
      const uploaded =
        response.data?.data?.audioUrl || response.data?.data?.path || '';
      if (!uploaded) {
        throw new Error('No audio URL returned');
      }
      setCategoryAudioUrl(String(uploaded));
    } catch (err: any) {
      if (String(err?.message || '') === 'not_audio') {
        Alert.alert('Audio only', 'Please select an audio file (MP3, M4A, WAV).');
        return;
      }
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload category audio.'),
      );
    } finally {
      setUploadingCategoryMedia(null);
    }
  };

  const loadMantras = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [response, categoryResponse] = await Promise.all([
        apiService.get('/admin/mantras', {params: {list: japaList}}),
        apiService.get('/admin/mantra-categories', {
          params: {list: japaList},
        }),
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
          target: Number(row.target) || 0,
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

  const moveTo = async (item: ListedMantra, categoryCode: string) => {
    try {
      await apiService.put(`/admin/mantras/${item.id}/category`, {
        categoryCode,
      });
      setMantras(current =>
        current.map(row =>
          row.id === item.id ? {...row, categoryCode} : row,
        ),
      );
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

  const startEditCategory = (category: MantraCategoryOption) => {
    setMoving(null);
    setAddingCategory(false);
    setDeletingCategory(false);
    setEditingCategory(category);
    setCategoryName(category.name);
  };

  const saveCategoryEdit = async () => {
    if (!editingCategory) {
      return;
    }
    const name = categoryName.trim();
    if (name.length < 2) {
      Alert.alert('Required', 'Enter a category name.');
      return;
    }
    setSavingCategory(true);
    try {
      const response = await apiService.put(
        `/admin/mantra-categories/${editingCategory.code}`,
        {name},
      );
      const saved = String(response.data?.data?.name || name);
      setCategories(current =>
        current.map(row =>
          row.code === editingCategory.code ? {...row, name: saved} : row,
        ),
      );
      setEditingCategory(null);
      setCategoryName('');
    } catch (err) {
      Alert.alert(
        'Could not save category',
        getApiError(err, 'Could not save the category.'),
      );
    } finally {
      setSavingCategory(false);
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
      const response = await apiService.post('/admin/mantra-categories', {
        name,
        japaList,
        categoryType: samuhikaStyle ? categoryType : 'NORMAL',
        imageUrl: categoryImageUrl.trim() || undefined,
        videoUrl: categoryVideoUrl.trim() || undefined,
        audioUrl: categoryAudioUrl.trim() || undefined,
        notifyUsers: samuhikaStyle ? categoryNotify : false,
      });
      const created = response.data?.data;
      if (created?.code) {
        setCategories(current => [
          ...current,
          {code: String(created.code), name: String(created.name || name)},
        ]);
      }
      setCategoryName('');
      resetCategoryMedia();
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

  const removeCategory = async (category: MantraCategoryOption) => {
    try {
      await apiService.delete(`/admin/mantra-categories/${category.code}`);
      setCategories(current => current.filter(row => row.code !== category.code));
      setMantras(current =>
        current.map(row =>
          row.categoryCode === category.code ? {...row, categoryCode: ''} : row,
        ),
      );
    } catch (err) {
      Alert.alert(
        'Could not delete category',
        getApiError(err, 'Could not delete the category.'),
      );
    }
  };

  const askDeleteCategory = (category: MantraCategoryOption) => {
    setDeletingCategory(false);
    Alert.alert(
      'Delete category',
      `Delete "${category.name}"? It is removed from the database for both Samuhika and Antharanga. Mantras in it stay, without a category.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeCategory(category),
        },
      ],
    );
  };

  const {unassigned, groups} = groupByCategory(mantras, categories);

  const renderMantra = (item: ListedMantra) => (
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
                setDeletingCategory(false);
                setEditingCategory(null);
                setCategoryName('');
                resetCategoryMedia();
                setAddingCategory(true);
              }}>
              <Text style={styles.pinText}>ADD CATEGORY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pinBtn, styles.deletePinBtn]}
              onPress={() => {
                setMoving(null);
                setAddingCategory(false);
                setEditingCategory(null);
                setDeletingCategory(true);
              }}>
              <Text style={styles.deletePinText}>DELETE CATEGORY</Text>
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
              {samuhikaStyle ? (
                <>
                  <Text style={styles.meta}>Type</Text>
                  <View style={styles.actions}>
                    {(['NORMAL', 'EVENT'] as const).map(option => {
                      const on = categoryType === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.choiceChip, on && styles.choiceChipOn]}
                          onPress={() => setCategoryType(option)}>
                          <Text
                            style={[
                              styles.choiceChipText,
                              on && styles.choiceChipTextOn,
                            ]}>
                            {on ? '✓ ' : ''}
                            {option === 'EVENT' ? 'Event' : 'Normal'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.meta}>Media (optional)</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      disabled={Boolean(uploadingCategoryMedia) || savingCategory}
                      onPress={() => void uploadCategoryImage()}>
                      <Text style={styles.editText}>
                        {uploadingCategoryMedia === 'image'
                          ? 'Uploading…'
                          : categoryImageUrl
                            ? 'Photo ✓'
                            : 'Upload photo'}
                      </Text>
                    </TouchableOpacity>
                    {categoryImageUrl ? (
                      <TouchableOpacity
                        onPress={() => setCategoryImageUrl('')}>
                        <Text style={styles.cancelText}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      disabled={Boolean(uploadingCategoryMedia) || savingCategory}
                      onPress={() => void uploadCategoryVideo()}>
                      <Text style={styles.editText}>
                        {uploadingCategoryMedia === 'video'
                          ? 'Uploading…'
                          : categoryVideoUrl
                            ? 'Video ✓'
                            : 'Upload video'}
                      </Text>
                    </TouchableOpacity>
                    {categoryVideoUrl ? (
                      <TouchableOpacity
                        onPress={() => setCategoryVideoUrl('')}>
                        <Text style={styles.cancelText}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      disabled={Boolean(uploadingCategoryMedia) || savingCategory}
                      onPress={() => void uploadCategoryAudio()}>
                      <Text style={styles.editText}>
                        {uploadingCategoryMedia === 'audio'
                          ? 'Uploading…'
                          : categoryAudioUrl
                            ? 'Audio ✓'
                            : 'Upload audio'}
                      </Text>
                    </TouchableOpacity>
                    {categoryAudioUrl ? (
                      <TouchableOpacity
                        onPress={() => setCategoryAudioUrl('')}>
                        <Text style={styles.cancelText}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <Text style={styles.meta}>Notify users</Text>
                  <View style={styles.actions}>
                    {[true, false].map(option => {
                      const on = categoryNotify === option;
                      return (
                        <TouchableOpacity
                          key={`cat-notify-${String(option)}`}
                          style={[styles.choiceChip, on && styles.choiceChipOn]}
                          onPress={() => setCategoryNotify(option)}>
                          <Text
                            style={[
                              styles.choiceChipText,
                              on && styles.choiceChipTextOn,
                            ]}>
                            {on ? '✓ ' : ''}
                            {option ? 'Yes' : 'No (testing)'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}
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
          {editingCategory ? (
            <View style={styles.picker}>
              <Text style={styles.pickerTitle}>
                Edit {editingCategory.name}
              </Text>
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
                  onPress={saveCategoryEdit}>
                  <Text style={styles.editText}>
                    {savingCategory ? 'Saving' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditingCategory(null);
                    setCategoryName('');
                  }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
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
        ? groups.map(group => (
            <View key={group.code} style={styles.categoryBtn}>
              <TouchableOpacity
                style={styles.categoryMain}
                onPress={() =>
                  navigation.navigate('AdminMantraCategory', {
                    list: japaList,
                    categoryCode: group.code,
                    categoryName: group.name,
                  })
                }
                activeOpacity={0.8}>
                <Text style={styles.categoryText}>{group.name}</Text>
                <Text style={styles.categoryCount}>{group.items.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => startEditCategory(group)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))
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
      <MoveCategoryModal
        visible={Boolean(moving)}
        mantraName={moving?.name || ''}
        categories={categories}
        onCancel={() => setMoving(null)}
        onSelect={askMove}
      />
      <MoveCategoryModal
        visible={deletingCategory}
        title="Delete a category"
        subtitle="Choose the category to remove."
        categories={categories}
        onCancel={() => setDeletingCategory(false)}
        onSelect={askDeleteCategory}
      />
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
  deletePinBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  pinText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  deletePinText: {
    color: Colors.error,
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  categoryMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginRight: 8,
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
  choiceChip: {
    flexGrow: 1,
    minWidth: 120,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#D6C4A8',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipOn: {
    borderColor: Colors.sacredBrown,
    backgroundColor: Colors.sacredBrown,
  },
  choiceChipText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
  },
  choiceChipTextOn: {
    color: Colors.white,
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
