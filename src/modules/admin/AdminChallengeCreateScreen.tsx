import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

const Field = ({
  label,
  value,
  onChangeText,
  placeholder = 'Enter here',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.placeholder}
    />
  </View>
);

const AdminChallengeCreateScreen = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mantra, setMantra] = useState('');
  const [target, setTarget] = useState('10000');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter a challenge name.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/admin/challenges', {
        title: name.trim(),
        description: description.trim(),
        mantra: mantra.trim(),
        target,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
      });
      Alert.alert(
        'Challenge created',
        'Saved to the database. Users will see it in Challenges.',
        [
          {
            text: 'View challenges',
            onPress: () => navigation.navigate('AdminChallenges'),
          },
          {text: 'OK', onPress: () => navigation.goBack()},
        ],
      );
    } catch (err) {
      Alert.alert(
        'Create failed',
        getApiError(err, 'Could not create challenge.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout title="Challenge Creation" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Challenge Creation</Text>
      <Text style={styles.sub}>Configure challenge details.</Text>

      <Field label="Challenge Name" value={name} onChangeText={setName} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
      />
      <Field label="Mantra" value={mantra} onChangeText={setMantra} />
      <Field label="Target Count" value={target} onChangeText={setTarget} />
      <Field
        label="Start Date"
        value={startDate}
        onChangeText={setStartDate}
        placeholder="YYYY-MM-DD or DD/MM/YYYY"
      />
      <Field
        label="End Date"
        value={endDate}
        onChangeText={setEndDate}
        placeholder="YYYY-MM-DD or DD/MM/YYYY"
      />

      <PrimaryButton
        title={saving ? 'CREATING...' : 'CREATE CHALLENGE'}
        onPress={create}
        disabled={saving}
      />
    </AdminScreenLayout>
  );
};

export default AdminChallengeCreateScreen;

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
});
