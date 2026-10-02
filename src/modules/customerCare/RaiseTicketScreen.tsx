import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
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

const STATIC_SERVICES = [
  'Baanalingam Order / Delivery',
  'Japa Annadanam Seva',
  'General Annadanam Seva',
  'Festival Annadanam Campaign',
  'Nithya Homam Enrollment & Sankalpam',
  'Challenge Reward Claim & Delivery',
  'Japa Counter & Daily Goal',
  'Antharanga Japa (Silent Sadhana)',
  'Family Japa Group',
  'Panchangam & Festivals Calendar',
  'Donation / Payment Verification (UTR)',
  'Profile & Account Settings',
  'Other / General Inquiry',
];

const RaiseTicketScreen = () => {
  const navigation = useNavigation<any>();
  const [subject, setSubject] = useState('');
  const [orderService, setOrderService] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [userOrders, setUserOrders] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<PickedMedia | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiService
      .get('/orders')
      .then(response => {
        if (!mounted) return;
        const list = response?.data?.data ?? [];
        if (Array.isArray(list) && list.length > 0) {
          const formatted = list.slice(0, 5).map((o: any) => {
            const code =
              o.orderId ||
              `BL-${String(o.id || '').padStart(4, '0')}`;
            const label = o.itemTitle || o.title || 'Baanalingam Order';
            return `Order #${code} - ${label}`;
          });
          setUserOrders(formatted);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const allCategories = useMemo(() => {
    return [...userOrders, ...STATIC_SERVICES];
  }, [userOrders]);

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
      Alert.alert(
        'Ticket',
        'Your ticket was submitted. Check My Tickets for the status and support reply.',
      );
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

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Select Category</Text>
        <TouchableOpacity
          style={styles.dropdownField}
          activeOpacity={0.8}
          onPress={() => setCategoryModalVisible(true)}>
          <Text
            style={
              orderService ? styles.dropdownValue : styles.dropdownPlaceholder
            }>
            {orderService || 'Select Category'}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

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
          Upload screenshot to understand your problem to resolve.
        </Text>
      )}

      <PrimaryButton
        title={saving ? 'SUBMITTING...' : 'SUBMIT TICKET'}
        onPress={submit}
        disabled={saving}
      />

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}>
              {allCategories.map((item, index) => {
                const isSelected = orderService === item;
                return (
                  <TouchableOpacity
                    key={`${item}-${index}`}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setOrderService(item);
                      setCategoryModalVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}>
                      {item}
                    </Text>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
};

export default RaiseTicketScreen;

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 14,
  },
  dropdownField: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.sacredBrown,
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: Colors.placeholder,
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: Colors.sacredBrown,
    marginLeft: 8,
  },
  area: {minHeight: 110, textAlignVertical: 'top'},
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    maxHeight: '75%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: '#FFFDF9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    padding: 4,
  },
  optionsList: {
    paddingVertical: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F3EB',
  },
  optionRowSelected: {
    backgroundColor: '#FDF7EE',
  },
  optionText: {
    fontSize: 15,
    color: Colors.sacredBrown,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '800',
    color: Colors.templeGold,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.templeGold,
    marginLeft: 10,
  },
});
