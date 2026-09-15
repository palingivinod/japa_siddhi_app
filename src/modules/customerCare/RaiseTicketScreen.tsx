import React, {useState} from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {
  pickSupportScreenshot,
  type PickedMedia,
} from '../../services/mediaPick';

const RaiseTicketScreen = () => {
  const navigation = useNavigation<any>();
  const [subject, setSubject] = useState('');
  const [orderService, setOrderService] = useState('');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<PickedMedia | null>(null);
  const [saving, setSaving] = useState(false);

  const chooseScreenshot = async () => {
    try {
      const picked = await pickSupportScreenshot();
      if (picked) {
        setScreenshot(picked);
      }
    } catch (error: any) {
      const code = String(error?.message || '');
      if (code === 'permission') {
        Alert.alert(
          'Screenshot',
          'Please allow camera / gallery access to upload a screenshot.',
        );
        return;
      }
      Alert.alert('Screenshot', 'Could not pick a photo. Please try again.');
    }
  };

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Ticket', 'Subject and description are required.');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('message', message.trim());
      formData.append('orderService', orderService.trim());
      if (screenshot?.uri) {
        formData.append('screenshot', {
          uri: screenshot.uri,
          type: screenshot.type || 'image/jpeg',
          name: screenshot.fileName || 'screenshot.jpg',
        } as any);
      }
      await apiService.post('/customer-care', formData);
      Alert.alert('Ticket', 'Your ticket was submitted. Admin will review it.');
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

      <Text style={styles.label}>Problem screenshot (optional)</Text>
      <TouchableOpacity style={styles.mediaBtn} onPress={chooseScreenshot}>
        <Text style={styles.mediaText}>
          {screenshot ? 'Change screenshot' : 'Upload screenshot'}
        </Text>
      </TouchableOpacity>
      {screenshot?.uri ? (
        <View style={styles.previewWrap}>
          <Image source={{uri: screenshot.uri}} style={styles.preview} />
          <TouchableOpacity onPress={() => setScreenshot(null)}>
            <Text style={styles.remove}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.hint}>
          Attach a screenshot so admin can understand the problem faster.
        </Text>
      )}

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
  label: {
    marginTop: 4,
    marginBottom: 8,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  mediaBtn: {
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  mediaText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  previewWrap: {
    marginBottom: 16,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  remove: {
    color: Colors.error,
    fontWeight: '700',
    alignSelf: 'flex-end',
  },
  hint: {
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
});
