import React, {useEffect, useState} from 'react';
import {Image, Linking, StyleSheet, Text, View} from 'react-native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const WhatsAppSupportScreen = () => {
  const [url, setUrl] = useState('https://wa.me/919849535599');

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
        <Image
          source={require('../../assets/images/whatsapp_logo.png')}
          style={styles.icon}
          resizeMode="contain"
        />
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
    width: 96,
    height: 96,
    borderRadius: 48,
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
