import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const HomamConfirmationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const data = route.params || {};
  const pending =
    String(data.paymentStatus || 'PENDING').toUpperCase() === 'PENDING';

  return (
    <ScreenLayout title="Enrollment Submitted" showBack={false} tab="SevaHub">
      <SuccessHero
        title={pending ? 'Submitted for verification' : 'Enrollment Confirmed'}
        subtitle={`Nithya Homam • ID ${data.confirmationId || `NH${data.orderId || ''}`}`}
      />
      <Text style={styles.copy}>
        {pending
          ? 'Thank you. Your payment UTR was sent to admin. Enrollment will become active after the UTR is verified.'
          : 'Your Nithya Homam enrollment is active.'}
      </Text>
      {data.utr ? (
        <Text style={styles.utr}>UTR: {String(data.utr)}</Text>
      ) : null}
      <PrimaryButton
        title="BACK TO NITHYA HOMAM"
        onPress={() =>
          navigation.reset({
            index: 1,
            routes: [{name: 'Home'}, {name: 'NithyaHomam'}],
          })
        }
      />
    </ScreenLayout>
  );
};

export default HomamConfirmationScreen;

const styles = StyleSheet.create({
  copy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  utr: {
    textAlign: 'center',
    color: Colors.sacredBrown,
    fontWeight: '800',
    marginBottom: 20,
  },
});
