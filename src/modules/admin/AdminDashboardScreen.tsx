import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_CONTROL_ITEMS} from './adminData';

type DashboardStats = {
  users: number;
  japa: number;
  orders: number;
  donationsLabel: string;
};

const EMPTY_STATS: DashboardStats = {
  users: 0,
  japa: 0,
  orders: 0,
  donationsLabel: '₹0',
};

const StatCard = ({label, value}: {label: string; value: string}) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [newGoalText, setNewGoalText] = useState<string>('2000');
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, goalRes] = await Promise.all([
        apiService.get('/admin/dashboard-stats'),
        apiService.get('/admin/daily-goal').catch(() => ({data: {data: {dailyGoal: 2000}}})),
      ]);
      const data = statsRes.data?.data || {};
      const goalData = goalRes.data?.data || {};
      setStats({
        users: Number(data.users) || 0,
        japa: Number(data.japa) || 0,
        orders: Number(data.orders) || 0,
        donationsLabel: String(data.donationsLabel || '₹0'),
      });
      const currentGoal = Number(goalData.dailyGoal) || 2000;
      setDailyGoal(currentGoal);
      setNewGoalText(String(currentGoal));
    } catch (err) {
      setStats(EMPTY_STATS);
      setError(getApiError(err, 'Could not load live dashboard stats.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const saveGoal = async () => {
    const val = Number(newGoalText.replace(/[^\d]/g, ''));
    if (!val || val < 1) {
      Alert.alert('Invalid goal', 'Please enter a valid count (e.g. 2000, 10800).');
      return;
    }
    setSavingGoal(true);
    try {
      const res = await apiService.put('/admin/daily-goal', {dailyGoal: val});
      const updated = Number(res.data?.data?.dailyGoal || val);
      setDailyGoal(updated);
      setGoalModalVisible(false);
      Alert.alert('Goal Updated', `Platform Daily Japa Goal is now ${updated.toLocaleString('en-IN')} Japas.`);
    } catch (err) {
      Alert.alert('Update Failed', getApiError(err, 'Could not update daily goal.'));
    } finally {
      setSavingGoal(false);
    }
  };

  const openControl = (route?: string, title?: string) => {
    if (!route) {
      Alert.alert(title || 'Coming soon', 'This admin module will be added next.');
      return;
    }
    try {
      navigation.navigate(route as never);
    } catch (error: any) {
      Alert.alert(
        'Navigation failed',
        error?.message || `Could not open ${title || route}.`,
      );
    }
  };

  return (
    <AdminScreenLayout title="Admin Dashboard" tab="AdminDashboard" showBack={false}>
      <Text style={styles.heading}>Admin Dashboard</Text>
      <Text style={styles.sub}>
        Centralized control for the Japa Siddhi platform.
      </Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.templeGold} />
          <Text style={styles.loadingText}>Loading live stats...</Text>
        </View>
      ) : (
        <View style={styles.stats}>
          <StatCard
            label="Users"
            value={stats.users.toLocaleString('en-IN')}
          />
          <StatCard label="Japa" value={stats.japa.toLocaleString('en-IN')} />
          <StatCard
            label="Orders"
            value={stats.orders.toLocaleString('en-IN')}
          />
          <StatCard label="Donations" value={stats.donationsLabel} />
        </View>
      )}

      {error ? (
        <TouchableOpacity onPress={loadStats}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.goalCard}>
        <View style={styles.goalCopy}>
          <Text style={styles.goalLabel}>PLATFORM DAILY JAPA GOAL</Text>
          <Text style={styles.goalValue}>{dailyGoal.toLocaleString('en-IN')} Japas</Text>
          <Text style={styles.goalSub}>Target displayed on all devotees' Home screens</Text>
        </View>
        <TouchableOpacity
          style={styles.goalEditBtn}
          activeOpacity={0.8}
          onPress={() => {
            setNewGoalText(String(dailyGoal));
            setGoalModalVisible(true);
          }}>
          <Text style={styles.goalEditText}>SET GOAL</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Admin Controls</Text>
      <Text style={styles.hint}>Tap a row to open that module.</Text>
      {ADMIN_CONTROL_ITEMS.map(item => (
        <TouchableOpacity
          key={item.title}
          style={styles.controlCard}
          activeOpacity={0.85}
          onPress={() => openControl(item.route, item.title)}>
          <View style={styles.controlCopy}>
            <Text style={styles.controlTitle}>{item.title}</Text>
            <Text style={styles.controlSub}>Central management</Text>
          </View>
          <View style={styles.openBtn}>
            <Text style={styles.openText}>Open</Text>
          </View>
        </TouchableOpacity>
      ))}
      <View style={styles.bottomSpacer} />

      <Modal
        visible={goalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Platform Daily Goal</Text>
            <Text style={styles.modalDesc}>
              Enter the daily japa target count shown to devotees on their Home screen:
            </Text>
            <TextInput
              style={styles.goalInput}
              value={newGoalText}
              onChangeText={setNewGoalText}
              keyboardType="numeric"
              placeholder="e.g. 2000 or 10800"
              placeholderTextColor={Colors.placeholder}
            />
            <View style={styles.presetGoalsRow}>
              {[108, 1008, 2000, 5000, 10800].map(val => (
                <TouchableOpacity
                  key={val}
                  style={styles.presetGoalChip}
                  onPress={() => setNewGoalText(String(val))}>
                  <Text style={styles.presetGoalText}>{val.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setGoalModalVisible(false)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingGoal && styles.btnDisabled]}
                disabled={savingGoal}
                onPress={saveGoal}>
                <Text style={styles.modalSaveText}>
                  {savingGoal ? 'SAVING...' : 'SAVE GOAL'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminScreenLayout>
  );
};

export default AdminDashboardScreen;

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
  loadingBox: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  statLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  hint: {
    marginBottom: 12,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  controlCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlCopy: {flex: 1, paddingRight: 8},
  controlTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  controlSub: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  openBtn: {
    borderWidth: 1,
    borderColor: Colors.leafGreen,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  openText: {
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  goalCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.templeGold,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  goalCopy: {
    flex: 1,
    marginRight: 12,
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.leafGreen,
    letterSpacing: 0.5,
  },
  goalValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  goalSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  goalEditBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalEditText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  goalInput: {
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    backgroundColor: '#FFFEFA',
    marginBottom: 12,
  },
  presetGoalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetGoalChip: {
    backgroundColor: Colors.selectedTint,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetGoalText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  modalSaveBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalSaveText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  bottomSpacer: {height: 28},
});
