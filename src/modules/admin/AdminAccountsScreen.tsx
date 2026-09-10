import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import {
  AdminAccount,
  addAdminAccount,
  getApiError,
  listAdminAccounts,
} from './adminCredentials';

const AdminAccountsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAdminAccounts();
      setAdmins(rows);
    } catch (error) {
      Alert.alert(
        'Admins',
        getApiError(error, 'Could not load admin accounts.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdmins();
    }, [loadAdmins]),
  );

  const addAdmin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Required', 'Enter a valid admin email.');
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      await addAdminAccount({
        email: trimmedEmail,
        password: password.trim(),
        fullName: fullName.trim() || undefined,
      });
      setEmail('');
      setPassword('');
      setFullName('');
      await loadAdmins();
      Alert.alert('Added', 'New admin credentials were saved.');
    } catch (error) {
      Alert.alert('Add failed', getApiError(error, 'Could not add admin.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout title="Add Admin" tab="AdminDashboard">
      <Text style={styles.heading}>Admin accounts</Text>
      <Text style={styles.sub}>
        Add login credentials for another administrator.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 20}} />
      ) : (
        admins.map(admin => (
          <View key={String(admin.id)} style={styles.row}>
            <Text style={styles.rowTitle}>{admin.fullName || 'Admin'}</Text>
            <Text style={styles.rowSub}>{admin.email}</Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Add admin</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Optional name"
        placeholderTextColor={Colors.placeholder}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="admin@email.com"
        placeholderTextColor={Colors.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Create password"
        placeholderTextColor={Colors.placeholder}
        secureTextEntry
      />

      {saving ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 16}} />
      ) : (
        <PrimaryButton title="ADD ADMIN" onPress={addAdmin} />
      )}
      <View style={styles.bottomSpacer} />
    </AdminScreenLayout>
  );
};

export default AdminAccountsScreen;

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
  section: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  rowTitle: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
  },
  rowSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
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
    marginBottom: 14,
  },
  bottomSpacer: {height: 28},
});
