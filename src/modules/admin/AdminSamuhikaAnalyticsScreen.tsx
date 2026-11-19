import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

type CategoryRow = {code: string; name: string; categoryType?: string};
type MantraRow = {
  id: number;
  name: string;
  target: number;
  deadlineAt?: string | null;
};
type UserRow = {
  userId: number;
  name: string;
  phone: string;
  japaCount: number;
  targetCount: number;
  completed: boolean;
};

const AdminSamuhikaAnalyticsScreen = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [mantras, setMantras] = useState<MantraRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMantraId, setSelectedMantraId] = useState<number | null>(null);
  const [enrolled, setEnrolled] = useState(0);
  const [done, setDone] = useState(0);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [mantraName, setMantraName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get(
        '/admin/samuhika-analytics/categories',
      );
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setCategories(
        rows.map((row: any) => ({
          code: String(row.code || ''),
          name: String(row.name || ''),
          categoryType: String(row.categoryType || 'NORMAL'),
        })),
      );
    } catch (err) {
      Alert.alert(
        'Load failed',
        getApiError(err, 'Could not load Samuhika categories.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  const loadMantras = async (categoryCode: string) => {
    setSelectedCategory(categoryCode);
    setSelectedMantraId(null);
    setUsers([]);
    setEnrolled(0);
    setDone(0);
    setMantraName('');
    setLoadingDetail(true);
    try {
      const response = await apiService.get('/admin/samuhika-analytics/mantras', {
        params: {categoryCode},
      });
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setMantras(
        rows.map((row: any) => ({
          id: Number(row.id),
          name: String(row.name || ''),
          target: Number(row.target) || 0,
          deadlineAt: row.deadlineAt || null,
        })),
      );
    } catch (err) {
      setMantras([]);
      Alert.alert(
        'Load failed',
        getApiError(err, 'Could not load mantras.'),
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadMantraDetail = async (mantraId: number) => {
    setSelectedMantraId(mantraId);
    setLoadingDetail(true);
    try {
      const response = await apiService.get(
        `/admin/samuhika-analytics/mantras/${mantraId}`,
      );
      const data = response.data?.data || {};
      setMantraName(String(data.mantra?.name || ''));
      setEnrolled(Number(data.enrolled) || 0);
      setDone(Number(data.done) || 0);
      setUsers(
        Array.isArray(data.users)
          ? data.users.map((row: any) => ({
              userId: Number(row.userId) || 0,
              name: String(row.name || 'Devotee'),
              phone: String(row.phone || ''),
              japaCount: Number(row.japaCount) || 0,
              targetCount: Number(row.targetCount) || 0,
              completed: Boolean(row.completed),
            }))
          : [],
      );
    } catch (err) {
      setUsers([]);
      Alert.alert(
        'Load failed',
        getApiError(err, 'Could not load mantra analytics.'),
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const copyText = (value: string, label: string) => {
    const text = String(value || '').trim();
    if (!text) {
      Alert.alert('Nothing to copy', `${label} is empty.`);
      return;
    }
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied.`);
  };

  const copyAll = () => {
    if (!users.length) {
      Alert.alert('Nothing to copy', 'No enrolled users for this mantra yet.');
      return;
    }
    const lines = [
      `Samuhika Japa — ${mantraName || 'Mantra'}`,
      `Enrolled: ${enrolled} | Completed: ${done}`,
      '',
      'ID | Name | Phone | Japa Count',
      ...users.map(
        row =>
          `${row.userId} | ${row.name} | ${row.phone || '-'} | ${row.japaCount}`,
      ),
    ];
    Clipboard.setString(lines.join('\n'));
    Alert.alert('Copied', 'All user data copied as text.');
  };

  const onUserLongPress = (row: UserRow) => {
    const fullRow = `${row.userId} | ${row.name} | ${row.phone || '-'} | ${row.japaCount}`;
    Alert.alert(
      'Copy user data',
      `${row.name} (ID ${row.userId})`,
      [
        {
          text: 'Copy ID',
          onPress: () => copyText(String(row.userId), 'User ID'),
        },
        {
          text: 'Copy name',
          onPress: () => copyText(row.name, 'Name'),
        },
        {
          text: 'Copy phone',
          onPress: () => copyText(row.phone, 'Phone'),
        },
        {
          text: 'Copy japa count',
          onPress: () => copyText(String(row.japaCount), 'Japa count'),
        },
        {
          text: 'Copy full row',
          onPress: () => copyText(fullRow, 'Full row'),
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  return (
    <AdminScreenLayout title="Samuhika Japa Analytics" showBack>
      {loading ? (
        <ActivityIndicator color={Colors.templeGold} />
      ) : (
        <>
          <Text style={styles.heading}>Categories / Events</Text>
          {categories.map(item => (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.card,
                selectedCategory === item.code && styles.cardOn,
              ]}
              onPress={() => void loadMantras(item.code)}>
              <Text style={styles.cardTitle}>
                {item.name}
                {String(item.categoryType || '').toUpperCase() === 'EVENT'
                  ? ' · Event'
                  : ''}
              </Text>
            </TouchableOpacity>
          ))}

          {selectedCategory ? (
            <>
              <Text style={styles.heading}>Mantras</Text>
              {loadingDetail && !selectedMantraId ? (
                <ActivityIndicator color={Colors.templeGold} />
              ) : null}
              {mantras.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.card,
                    selectedMantraId === item.id && styles.cardOn,
                  ]}
                  onPress={() => void loadMantraDetail(item.id)}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.target > 0
                      ? `Target ${item.target.toLocaleString()}`
                      : 'No target'}
                    {item.deadlineAt
                      ? ` · Until ${String(item.deadlineAt).slice(0, 10)}`
                      : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          {selectedMantraId ? (
            <>
              <Text style={styles.heading}>{mantraName || 'Mantra detail'}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Enrolled</Text>
                  <Text style={styles.statValue}>{enrolled}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={styles.statValue}>{done}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={copyAll}>
                <Text style={styles.copyText}>COPY ALL USER DATA</Text>
              </TouchableOpacity>
              {loadingDetail ? (
                <ActivityIndicator color={Colors.templeGold} />
              ) : null}
              <Text style={styles.hint}>Long-press a user to copy ID, name, phone, or japa count.</Text>
              {users.map(row => (
                <TouchableOpacity
                  key={`${row.userId}-${row.japaCount}`}
                  style={styles.userCard}
                  activeOpacity={0.85}
                  onLongPress={() => onUserLongPress(row)}
                  delayLongPress={350}>
                  <Text style={styles.cardTitle}>
                    {row.name} (ID {row.userId})
                  </Text>
                  <Text style={styles.meta}>
                    {row.phone || 'No phone'} · Japa {row.japaCount.toLocaleString()}
                    {row.targetCount > 0
                      ? ` / ${row.targetCount.toLocaleString()}`
                      : ''}
                    {row.completed ? ' · Done' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
              {!loadingDetail && users.length === 0 ? (
                <Text style={styles.meta}>No enrollments yet.</Text>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </AdminScreenLayout>
  );
};

export default AdminSamuhikaAnalyticsScreen;

const styles = StyleSheet.create({
  heading: {
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '800',
    fontSize: 16,
    color: Colors.sacredBrown,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 8,
  },
  cardOn: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF8EC',
  },
  cardTitle: {
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
  },
  statLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 12,
  },
  statValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  copyBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  copyText: {
    color: Colors.white,
    fontWeight: '800',
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  hint: {
    marginBottom: 8,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
});
