import React, {useEffect, useState} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const CallSupportScreen = () => {
  const [phone, setPhone] = useState('+917349483937');
  const [hours, setHours] = useState('9 AM – 6 PM');

  useEffect(() => {
    apiService
      .get('/customer-care/config')
      .then(response => {
        const data = response.data.data || {};
        if (data.supportPhone) {
          setPhone(data.supportPhone);
        }
        if (data.hours) {
          setHours(data.hours);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <ScreenLayout title="Call Support" showBack tab="Profile">
      <View style={styles.center}>
        <View style={styles.icon}>
          <Text style={styles.phone}>☎</Text>
        </View>
        <Text style={styles.title}>Speak with support</Text>
        <Text style={styles.sub}>Support hours: {hours}</Text>
      </View>
      <PrimaryButton
        title="CALL SUPPORT"
        onPress={() => Linking.openURL(`tel:${phone}`)}
      />
    </ScreenLayout>
  );
};

export default CallSupportScreen;

const styles = StyleSheet.create({
  center: {alignItems: 'center', marginVertical: 40},
  icon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  phone: {fontSize: 34},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  sub: {marginTop: 8, color: Colors.textSecondary},
});
