import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {
  alertReceiptError,
  downloadPaymentReceipt,
} from './downloadPaymentReceipt';

const formatIstNow = () =>
  new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});

const Row = ({label, value, emphasize}: {label: string; value: string; emphasize?: boolean}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, emphasize ? styles.valueStrong : null]}>{value}</Text>
  </View>
);

const PaymentReceiptViewScreen = () => {
  const route = useRoute<any>();
  const {t} = useLanguage();
  const data = route.params || {};
  const [downloading, setDownloading] = useState(false);

  const paymentId = String(
    data.paymentId || data.confirmationId || data.orderNumber || '',
  ).trim();
  const amount = Number(data.amount);
  const amountLabel =
    Number.isFinite(amount) && amount > 0
      ? `₹${Math.round(amount).toLocaleString('en-IN')}`
      : '—';
  const seva = String(data.seva || data.itemName || '').trim();
  const purpose = String(data.purpose || '').trim();
  const name = String(data.name || '').trim();
  const phone = String(data.phone || '').trim();
  const when = useMemo(
    () => String(data.paidAt || data.date || formatIstNow()),
    [data.paidAt, data.date],
  );

  const onDownload = async () => {
    if (!paymentId || downloading) {
      return;
    }
    setDownloading(true);
    try {
      await downloadPaymentReceipt({
        paymentId,
        amount,
        seva,
        purpose,
        name,
        phone,
      });
    } catch (err) {
      alertReceiptError(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScreenLayout title={t('viewReceipt') || 'View Receipt'} showBack tab="Orders">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.brand}>Japa Siddhi</Text>
          <Text style={styles.trust}>Bilva Patra Trust</Text>
          <Text style={styles.receiptTitle}>
            {t('paymentSuccessful') || 'Payment Success'}
          </Text>
          <View style={styles.divider} />
          <Row label="Status" value="SUCCESS" emphasize />
          <Row label="Date" value={when} />
          <Row label="Payment ID" value={paymentId || '—'} />
          <Row label="Amount" value={amountLabel} emphasize />
          {seva ? <Row label="Seva" value={seva} /> : null}
          {purpose && purpose !== seva ? (
            <Row label="Purpose" value={purpose} />
          ) : null}
          {name ? <Row label="Devotee" value={name} /> : null}
          {phone ? <Row label="Mobile" value={phone} /> : null}
          <View style={styles.divider} />
          <Text style={styles.footer}>
            Thank you for your contribution. This receipt confirms your
            offerings.
          </Text>
          <Text style={styles.footerTeam}>
            Team Japa Siddhi — Bilva Patra Trust
          </Text>
        </View>

        {paymentId ? (
          <View style={styles.downloadWrap}>
            {downloading ? (
              <ActivityIndicator color={Colors.templeGold} style={styles.spinner} />
            ) : null}
            <PrimaryButton
              title={
                downloading
                  ? t('downloadingReceipt')
                  : t('downloadReceipt')
              }
              onPress={onDownload}
              disabled={downloading}
            />
          </View>
        ) : null}
      </ScrollView>
    </ScreenLayout>
  );
};

export default PaymentReceiptViewScreen;

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
  },
  brand: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  trust: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  receiptTitle: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.templeGold,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8D9B8',
    marginVertical: 14,
  },
  row: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  value: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: '#3A2010',
  },
  valueStrong: {
    fontWeight: '900',
    fontSize: 16,
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  footerTeam: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  downloadWrap: {
    marginTop: 16,
  },
  spinner: {
    marginBottom: 8,
  },
});
