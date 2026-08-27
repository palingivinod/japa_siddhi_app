import React, {useEffect, useState} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const WhatsAppSupportScreen = () => {
  const [url, setUrl] = useState('https://wa.me/917349483937');

  useEffect(() => {
    apiService
      .get('/customer-care/config')
      .then(response => {
        if (response.data.data?.whatsappUrl) {
          setUrl(response.data.data.whatsappUrl);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <ScreenLayout title="WhatsApp Support" showBack tab="Profile">
      <View style={styles.center}>
        <View style={styles.icon} />
        <Text style={styles.title}>Chat with our support team</Text>
        <Text style={styles.sub}>Available for service and order help.</Text>
      </View>
      <PrimaryButton
        title="OPEN WHATSAPP"
        onPress={() => Linking.openURL(url)}
      />
    </ScreenLayout>
  );
};

export default WhatsAppSupportScreen;

const styles = StyleSheet.create({
  center: {alignItems: 'center', marginVertical: 40},
  icon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.leafGreen,
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  sub: {marginTop: 8, color: Colors.textSecondary, textAlign: 'center'},
});
