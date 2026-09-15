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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');

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
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const code = countryCode.replace(/\D/g, '') || '91';
    const mobile = mobileNumber.replace(/\D/g, '');

    if (!trimmedName) {
      Alert.alert('Required', 'Enter the admin full name.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Required', 'Enter a valid admin email.');
      return;
    }
    if (mobile.length < 8 || /^0+$/.test(mobile)) {
      Alert.alert('Required', 'Enter a valid mobile number.');
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
        fullName: trimmedName,
        mobileCountryCode: code,
        mobileNumber: mobile,
      });
      setFullName('');
      setEmail('');
      setCountryCode('91');
      setMobileNumber('');
      setPassword('');
      await loadAdmins();
      Alert.alert('Added', 'New admin credentials were saved.');
    } catch (error) {
      Alert.alert('Add failed', getApiError(error, 'Could not add admin.'));
    } finally {
      setSaving(false);
    }
  };

  const formatMobile = (admin: AdminAccount) => {
    const cc = String(admin.mobileCountryCode || '91').replace(/\D/g, '');
    const mobile = String(admin.mobileNumber || '').replace(/\D/g, '');
    if (!mobile) {
      return 'No mobile added';
    }
    return `+${cc} ${mobile}`;
  };

  return (
    <AdminScreenLayout title="Add Admin" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Admin accounts</Text>
      <Text style={styles.sub}>
        Admin can login with email or mobile number and password.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 20}} />
      ) : (
        admins.map(admin => (
          <View key={String(admin.id)} style={styles.row}>
            <Text style={styles.rowTitle}>{admin.fullName || 'Admin'}</Text>
            <Text style={styles.rowSub}>{admin.email}</Text>
            <Text style={styles.rowSub}>{formatMobile(admin)}</Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Add admin</Text>

      <Text style={styles.label}>Full name *</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Admin full name"
        placeholderTextColor={Colors.placeholder}
      />

      <Text style={styles.label}>Email *</Text>
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

      <Text style={styles.label}>Mobile number *</Text>
      <View style={styles.mobileRow}>
        <TextInput
          style={styles.codeInput}
          value={countryCode}
          onChangeText={setCountryCode}
          placeholder="91"
          placeholderTextColor={Colors.placeholder}
          keyboardType="phone-pad"
          maxLength={4}
        />
        <TextInput
          style={styles.mobileInput}
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="9876543210"
          placeholderTextColor={Colors.placeholder}
          keyboardType="phone-pad"
        />
      </View>

      <Text style={styles.label}>Password *</Text>
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
  mobileRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  codeInput: {
    width: 72,
    height: 54,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    marginRight: 10,
    textAlign: 'center',
  },
  mobileInput: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  bottomSpacer: {height: 28},
});
