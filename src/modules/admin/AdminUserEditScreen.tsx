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
  multiline = false,
  placeholder = 'Enter here',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  placeholder?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.placeholder}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      autoCorrect={false}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
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
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [region, setRegion] = useState('');
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [spouseDob, setSpouseDob] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');

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
      setGender(String(data.gender || ''));
      setDateOfBirth(String(data.dateOfBirth || ''));
      setAddress(String(data.address || ''));
      setPostalCode(String(data.postalCode || ''));
      setRegion(String(data.region || ''));
      setStateName(String(data.stateName || ''));
      setCityName(String(data.cityName || ''));
      setMaritalStatus(String(data.maritalStatus || ''));
      setSpouseName(String(data.spouseName || ''));
      setSpouseDob(String(data.spouseDob || ''));
      setAnniversaryDate(String(data.anniversaryDate || ''));
      setGothram(String(data.gothram || ''));
      setNakshatram(String(data.nakshatram || ''));
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
    const mobile = mobileNumber.replace(/\D/g, '');
    if (mobile.length < 6 || /^0+$/.test(mobile)) {
      Alert.alert('Required', 'Enter a valid mobile number.');
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
        gender: gender.trim(),
        dateOfBirth: dateOfBirth.trim(),
        address: address.trim(),
        postalCode: postalCode.replace(/\D/g, ''),
        region: region.trim(),
        maritalStatus: maritalStatus.trim(),
        spouseName: spouseName.trim(),
        spouseDob: spouseDob.trim(),
        anniversaryDate: anniversaryDate.trim(),
        gothram: gothram.trim(),
        nakshatram: nakshatram.trim(),
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
          <Text style={styles.section}>Account</Text>
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

          <Text style={styles.section}>Personal</Text>
          <Field label="Gender" value={gender} onChangeText={setGender} />
          <Field
            label="Date of birth"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Marital status"
            value={maritalStatus}
            onChangeText={setMaritalStatus}
          />
          <Field
            label="Spouse name"
            value={spouseName}
            onChangeText={setSpouseName}
          />
          <Field
            label="Spouse DOB"
            value={spouseDob}
            onChangeText={setSpouseDob}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Anniversary"
            value={anniversaryDate}
            onChangeText={setAnniversaryDate}
            placeholder="YYYY-MM-DD"
          />
          <Field label="Gothram" value={gothram} onChangeText={setGothram} />
          <Field
            label="Nakshatram"
            value={nakshatram}
            onChangeText={setNakshatram}
          />

          <Text style={styles.section}>Address</Text>
          <Field
            label="Address"
            value={address}
            onChangeText={setAddress}
            multiline
          />
          <Field
            label="Pincode"
            value={postalCode}
            onChangeText={text =>
              setPostalCode(text.replace(/\D/g, '').slice(0, 6))
            }
            keyboardType="phone-pad"
          />
          <Field
            label="Region / area"
            value={region}
            onChangeText={setRegion}
            placeholder="Your nearest city"
          />
          {stateName || cityName ? (
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyLabel}>
                State / City (from profile pickers)
              </Text>
              <Text style={styles.readOnlyValue}>
                {[cityName, stateName].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
          ) : null}

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
    marginBottom: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 14,
  },
  centerBox: {paddingVertical: 24, alignItems: 'center'},
  field: {marginBottom: 12},
  label: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 88,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statusChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusChipOn: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
  },
  statusText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  statusTextOn: {
    color: Colors.white,
  },
  readOnlyBox: {
    backgroundColor: '#F8F1E7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    marginBottom: 14,
  },
  readOnlyLabel: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  readOnlyValue: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
});
