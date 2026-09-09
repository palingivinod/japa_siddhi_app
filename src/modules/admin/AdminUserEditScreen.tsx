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
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminUserStatus} from './adminData';

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Enter here"
      placeholderTextColor={Colors.placeholder}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      autoCorrect={false}
    />
  </View>
);

const AdminUserEditScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId = String(route.params?.userId || '');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileCountryCode, setMobileCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [status, setStatus] = useState<AdminUserStatus>('Active');

  const loadUser = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.get(`/admin/users/${userId}`);
      const data = response.data?.data || {};
      setName(String(data.name || ''));
      setEmail(String(data.email || ''));
      setMobileCountryCode(String(data.mobileCountryCode || '91'));
      setMobileNumber(String(data.mobileNumber || ''));
      setStatus(data.status === 'Blocked' ? 'Blocked' : 'Active');
    } catch (err) {
      Alert.alert('Error', getApiError(err, 'Could not load user.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter the user name.');
      return;
    }
    setSaving(true);
    try {
      await apiService.put(`/admin/users/${userId}`, {
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        mobileCountryCode: mobileCountryCode.replace(/\D/g, ''),
        mobileNumber: mobileNumber.replace(/\D/g, ''),
        status: status === 'Blocked' ? 'BLOCKED' : 'ACTIVE',
      });
      Alert.alert('Saved', 'User updated successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('AdminUserDetails', {userId}),
        },
      ]);
    } catch (err) {
      Alert.alert('Update failed', getApiError(err, 'Could not save user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout title="Edit User" tab="AdminUsers" showBack>
      <Text style={styles.heading}>Edit User</Text>
      <Text style={styles.sub}>Update profile details and account status.</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : (
        <>
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <Field
            label="Country code"
            value={mobileCountryCode}
            onChangeText={setMobileCountryCode}
            keyboardType="phone-pad"
          />
          <Field
            label="Mobile number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {(['Active', 'Blocked'] as AdminUserStatus[]).map(option => {
              const on = option === status;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.statusChip, on && styles.statusChipOn]}
                  onPress={() => setStatus(option)}>
                  <Text
                    style={[styles.statusText, on && styles.statusTextOn]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton
            title={saving ? 'SAVING...' : 'SAVE USER'}
            onPress={save}
            disabled={saving}
          />
        </>
      )}
    </AdminScreenLayout>
  );
};

export default AdminUserEditScreen;

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
  centerBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  field: {marginBottom: 14},
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
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statusChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    borderRadius: 22,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipOn: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  statusText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  statusTextOn: {
    color: Colors.white,
  },
});
