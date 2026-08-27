import React, {useState} from 'react';
import {Alert, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const RaiseTicketScreen = () => {
  const navigation = useNavigation<any>();
  const [subject, setSubject] = useState('');
  const [orderService, setOrderService] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Ticket', 'Subject and description are required.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/customer-care', {
        subject,
        message,
        orderService,
      });
      Alert.alert('Ticket', 'Your ticket was submitted.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ticket', getApiError(error, 'Could not submit ticket.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Raise a Ticket" showBack tab="Profile">
      <FormField
        label="Subject"
        placeholder="Issue subject"
        value={subject}
        onChangeText={setSubject}
      />
      <FormField
        label="Order / Service"
        placeholder="Optional"
        value={orderService}
        onChangeText={setOrderService}
      />
      <FormField
        label="Description"
        placeholder="Describe your issue"
        value={message}
        onChangeText={setMessage}
        multiline
        style={styles.area}
      />
      <PrimaryButton
        title={saving ? 'SUBMITTING...' : 'SUBMIT TICKET'}
        onPress={submit}
        disabled={saving}
      />
    </ScreenLayout>
  );
};

export default RaiseTicketScreen;

const styles = StyleSheet.create({
  area: {minHeight: 110, textAlignVertical: 'top'},
});
