import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';
import {
  alertReceiptError,
  downloadPaymentReceipt,
} from './downloadPaymentReceipt';

const PaymentConfirmationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const data = route.params || {};
  const isRazorpay = data.kind === 'RAZORPAY';
  const isBana = data.kind === 'BANA_LINGAM';
  const rawSeva = String(data.seva || '').trim().toLowerCase();
  const sevaName =
    rawSeva === 'annadanam'
      ? t('annadanamName')
      : rawSeva === 'nithya homam'
        ? t('nithyaHomam')
        : String(data.seva || '').trim() || t('yourOffering');
  const orderNumber = data.orderNumber
    ? String(data.orderNumber).startsWith('BL-')
      ? t('orderNumberPlain', {number: data.orderNumber})
      : t('orderNumberHash', {number: data.orderNumber})
    : t('orderNumberHash', {number: data.confirmationId || 'BL-0001'});
  const paymentId = String(
    data.confirmationId || data.orderNumber || data.paymentId || '',
  ).trim();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
    if (!paymentId || downloading) {
      return;
    }
    setDownloading(true);
    try {
      await downloadPaymentReceipt({
        paymentId,
        orderId: data.razorpayOrderId || data.orderId,
        amount: data.amount,
        seva: data.seva || data.itemName,
        purpose: data.purpose,
        name: data.name,
        phone: data.phone,
      });
    } catch (err) {
      alertReceiptError(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScreenLayout
      title={isRazorpay ? t('paymentSuccessful') : t('placedSuccessful')}
      showBack
      tab="Orders">
      <SuccessHero
        title={
          isBana
            ? t('orderUnderReview')
            : isRazorpay
              ? t('paymentSuccessful')
              : t('orderPlaced')
        }
        subtitle={
          isRazorpay ? t('thankYouForSeva', {name: sevaName}) : orderNumber
        }
      />
      <MenuCard
        emoji="✅"
        title={
          isRazorpay
            ? t('requestSubmittedSuccessfully')
            : data.itemName || 'Baanalingam'
        }
        subtitle={
          isBana
            ? t('applicationUnderReview')
            : isRazorpay
              ? t('weWillContactSoon')
              : t('orderCreatedSuccessfully')
        }
      />
      {isRazorpay && paymentId ? (
        <View style={styles.receiptWrap}>
          {downloading ? (
            <ActivityIndicator color={Colors.templeGold} style={styles.spinner} />
          ) : null}
          <PrimaryButton
            title={
              downloading
                ? t('downloadingReceipt')
                : t('downloadReceipt')
            }
            onPress={handleDownloadReceipt}
            disabled={downloading}
          />
        </View>
      ) : null}
      <PrimaryButton
        title={isRazorpay ? t('continue') : t('viewOrder')}
        onPress={() =>
          isRazorpay
            ? navigation.navigate('Home')
            : navigation.navigate('OrderDetails', {
                id: data.orderId,
                order: data,
              })
        }
      />
    </ScreenLayout>
  );
};

export default PaymentConfirmationScreen;

const styles = StyleSheet.create({
  receiptWrap: {
    marginBottom: 10,
  },
  spinner: {
    marginBottom: 8,
  },
});
