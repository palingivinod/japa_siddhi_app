import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity} from 'react-native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import {formMessageColor} from '../../theme/formMessage';
import ScreenLayout from '../common/ScreenLayout';

const NithyaHomamScreen = () => {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('501');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !mobile.trim() || !purpose.trim()) {
      setMessage('Name, mobile, and purpose are required.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/donations', {
        donationType: 'NITHYA_HOMAM',
        amount: Number(amount) || 501,
        paymentMethod: 'UPI',
        remarks: `${fullName} | ${mobile} | ${gothram} | ${nakshatram} | ${purpose}`,
      });
      setMessage('Nithya Homam enrollment saved.');
    } catch (error: any) {
      setMessage(getApiError(error, 'Could not enroll for Nithya Homam.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Nithya Homam">
      <Text style={styles.hint}>
        Enroll for daily homam with your spiritual details.
      </Text>
      <TextInput style={styles.input} placeholder="Name *" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Mobile Number *" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Gothram" value={gothram} onChangeText={setGothram} />
      <TextInput style={styles.input} placeholder="Nakshatram" value={nakshatram} onChangeText={setNakshatram} />
      <TextInput style={styles.input} placeholder="Purpose *" value={purpose} onChangeText={setPurpose} />
      <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Enroll Now'}</Text>
      </TouchableOpacity>
      {message ? (
        <Text style={[styles.message, {color: formMessageColor(message)}]}>
          {message}
        </Text>
      ) : null}
    </ScreenLayout>
  );
};

export default NithyaHomamScreen;

const styles = StyleSheet.create({
  hint: {color: Colors.textSecondary, marginBottom: 12, lineHeight: 20},
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {color: Colors.white, fontWeight: '700'},
  message: {marginTop: 12, fontWeight: '600'},
});
