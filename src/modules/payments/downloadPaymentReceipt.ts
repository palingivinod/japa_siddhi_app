import {Alert, NativeModules, Platform, Share} from 'react-native';

import apiService, {getApiError} from '../../services/apiService';

const {FileDownload} = NativeModules;

export type ReceiptDownloadInput = {
  paymentId?: string | null;
  orderId?: string | null;
  amount?: number | null;
  seva?: string | null;
  purpose?: string | null;
  name?: string | null;
  phone?: string | null;
};

export const downloadPaymentReceipt = async (input: ReceiptDownloadInput) => {
  const paymentId = String(input.paymentId || '').trim();
  if (!paymentId) {
    throw new Error('Payment id is missing for receipt.');
  }

  const response = await apiService.get(
    `/payments/razorpay/receipt/${encodeURIComponent(paymentId)}`,
    {
      params: {
        orderId: input.orderId || undefined,
        amount:
          Number.isFinite(Number(input.amount)) && Number(input.amount) > 0
            ? Math.round(Number(input.amount))
            : undefined,
        seva: input.seva || undefined,
        purpose: input.purpose || undefined,
        name: input.name || undefined,
        phone: input.phone || undefined,
      },
    },
  );

  const file = response.data?.data || {};
  const fileName = String(
    file.fileName || `japa-siddhi-receipt-${paymentId}.pdf`,
  );
  const mimeType = String(file.mimeType || 'application/pdf');
  const base64 = String(file.base64 || '');

  if (!base64) {
    throw new Error('Receipt file was empty.');
  }

  if (Platform.OS === 'android' && FileDownload?.saveBase64File) {
    const savedUri = await FileDownload.saveBase64File(
      fileName,
      base64,
      mimeType,
    );
    Alert.alert(
      'Receipt downloaded',
      `${fileName} saved to Downloads.${savedUri ? `\n\n${savedUri}` : ''}`,
    );
    return;
  }

  await Share.share({
    title: fileName,
    message: `Japa Siddhi payment receipt (${paymentId})`,
  });
  Alert.alert('Receipt ready', `${fileName} is ready to share.`);
};

export const alertReceiptError = (err: unknown) => {
  Alert.alert(
    'Receipt download failed',
    getApiError(err, 'Could not download payment receipt.'),
  );
};
