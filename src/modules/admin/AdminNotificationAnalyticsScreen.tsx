import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';

const Field = ({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Enter here"
      placeholderTextColor={Colors.placeholder}
    />
  </View>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.selectRow}>
      {options.map(option => {
        const active = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const AdminNotificationAnalyticsScreen = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('All users');
  const [schedule, setSchedule] = useState('Now');

  const send = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Required', 'Enter title and message.');
      return;
    }
    Alert.alert(
      'Notification queued',
      `To: ${target}\nWhen: ${schedule}\n\nBackend send will be wired later.`,
    );
    setTitle('');
    setMessage('');
  };

  return (
    <AdminScreenLayout
      title="Notification Analytics"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Notification Analytics</Text>
      <Text style={styles.sub}>Create, schedule and target notifications.</Text>

      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Message" value={message} onChangeText={setMessage} />
      <SelectField
        label="Target Group"
        value={target}
        options={['All users', 'Active japa', 'Blocked']}
        onChange={setTarget}
      />
      <SelectField
        label="Schedule"
        value={schedule}
        options={['Now', 'Later']}
        onChange={setSchedule}
      />

      <PrimaryButton title="SEND NOTIFICATION" onPress={send} />
    </AdminScreenLayout>
  );
};

export default AdminNotificationAnalyticsScreen;

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
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chipActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#E4EFDF',
  },
  chipText: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: Colors.leafGreen,
  },
});
