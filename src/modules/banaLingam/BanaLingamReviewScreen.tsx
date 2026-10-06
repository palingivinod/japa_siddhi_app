import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import {saveDeliveryAddress} from '../../services/savedAddresses';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BanaLingamReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [saving, setSaving] = useState(false);
  const params = route.params || {};
  const address = String(params.address || '').trim();
  const hasAddress = address.length > 0;

  const placeOrder = async () => {
    if (!hasAddress) {
      Alert.alert('Baanalingam', 'Add a delivery address before submitting the application.');
      return;
    }
    setSaving(true);
    try {
      await saveDeliveryAddress(address);
      const response = await apiService.post('/donations/checkout', {
        kind: 'BANA_LINGAM',
        fullName: params.fullName,
        mobile: params.mobile,
        address,
        nakshatram: params.nakshatram,
        gothram: params.gothram,
        remarks: 'Baanalingam application',
      });
      const data = response.data.data || {};
      navigation.replace('PaymentConfirmation', {
        ...data,
        itemName: 'Baanalingam',
      });
    } catch (error) {
      Alert.alert('Application', getApiError(error, 'Could not submit this application.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Application Overview" showBack tab="SevaHub">
      <MenuCard
        icon="banalingam"
        title="Baanalingam Seva"
        subtitle="Review your details before final submission"
      />

      <View style={styles.overviewCard}>
        <Text style={styles.cardHeader}>Devotee & Delivery Details</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{params.fullName || '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Mobile</Text>
          <Text style={styles.value}>{params.mobile || '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.valueAddress}>{hasAddress ? address : '—'}</Text>
        </View>

        {params.gothram ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Gothram</Text>
              <Text style={styles.value}>{params.gothram}</Text>
            </View>
          </>
        ) : null}

        {params.nakshatram ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Nakshatram</Text>
              <Text style={styles.value}>{params.nakshatram}</Text>
            </View>
          </>
        ) : null}
      </View>

      {hasAddress ? (
        <>
          <PrimaryButton
            title={saving ? 'SUBMITTING...' : 'SUBMIT'}
            onPress={placeOrder}
            disabled={saving}
          />
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <Text style={styles.editBtnText}>Edit Details</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Please add your delivery address to submit this application.
          </Text>
          <PrimaryButton
            title="ADD ADDRESS"
            onPress={() => navigation.navigate('BanaLingam')}
          />
        </>
      )}
    </ScreenLayout>
  );
};

export default BanaLingamReviewScreen;

const styles = StyleSheet.create({
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8D9B8',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#56350F',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: '32%',
  },
  value: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  valueAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EBD9',
    marginVertical: 4,
  },
  editBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  editBtnText: {
    color: Colors.templeGold,
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  hint: {
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
});
