import {Alert, DeviceEventEmitter, Linking, NativeModules} from 'react-native';

import apiService from '../../services/apiService';
import {navigateTo} from '../../navigation/navigationRef';
import {paymentsPageUrl} from './paymentsPageUrl';

export type AppPaymentInput = {
  amount?: number;
  purpose?: string;
  seva?: string;
  name?: string;
  phone?: string;
  preferDate?: string;
  occasion?: string;
  forWhom?: string;
  personName?: string;
  gothram?: string;
  nakshatram?: string;
  comments?: string;
};

const websiteFallback = (input: AppPaymentInput) =>
  Linking.openURL(
    paymentsPageUrl({
      amount:
        Number.isFinite(Number(input.amount)) && Number(input.amount) > 0
          ? Math.round(Number(input.amount))
          : undefined,
      purpose: input.purpose,
      seva: input.seva,
      name: input.name,
      phone: input.phone,
    }),
  ).catch(() => {
    Alert.alert('Payment', 'Could not open payments page.');
  });

const showFailure = (input: AppPaymentInput) => {
  Alert.alert('Payment failed', 'Please try again.', [
    {text: 'OK', style: 'cancel'},
    {
      text: 'Retry',
      onPress: () => {
        void startAppPayment(input);
      },
    },
  ]);
};

let paying = false;

const openCheckout = (options: Record<string, unknown>) => {
  const native = NativeModules.RNRazorpayCheckout;
  if (!native?.open) {
    throw new Error('Razorpay checkout is not linked');
  }
  return new Promise<any>((resolve, reject) => {
    const success = DeviceEventEmitter.addListener(
      'Razorpay::PAYMENT_SUCCESS',
      data => {
        cleanup();
        resolve(data);
      },
    );
    const failure = DeviceEventEmitter.addListener(
      'Razorpay::PAYMENT_ERROR',
      data => {
        cleanup();
        reject(data);
      },
    );
    const cleanup = () => {
      success.remove();
      failure.remove();
    };
    try {
      native.open(options);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

const checkoutOpened = (error: any) => {
  const description = String(error?.description || '');
  const code = Number(error?.code);
  return description.length > 0 || code === 0 || code === 2 || code === 3;
};

export async function startAppPayment(input: AppPaymentInput) {
  if (paying) {
    return;
  }
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 1) {
    await websiteFallback(input);
    return;
  }
  paying = true;
  try {
    const orderRes = await apiService.post('/payments/razorpay/order', {
      amountRupees: amount,
      name: input.name || '',
      phone: input.phone || '',
      note: String(input.seva || input.purpose || 'Seva offering').slice(0, 80),
      source: 'app',
      preferDate: String(input.preferDate || '').slice(0, 10),
      occasion: String(input.occasion || input.purpose || '').slice(0, 40),
      forWhom: String(input.forWhom || '').slice(0, 20),
      personName: String(input.personName || '').slice(0, 80),
      gothram: String(input.gothram || '').trim().slice(0, 80),
      nakshatram: String(input.nakshatram || '').trim().slice(0, 80),
      comments: String(input.comments || '').trim().slice(0, 1000),
    });
    const order = orderRes.data?.data || {};
    const keyId = String(order.keyId || '');
    const orderId = String(order.orderId || '');
    const amountPaise = Number(order.amount);
    if (!keyId || !orderId || !Number.isFinite(amountPaise) || amountPaise < 100) {
      await websiteFallback(input);
      return;
    }
    let result: any;
    try {
      result = await openCheckout({
        key: keyId,
        amount: String(amountPaise),
        currency: String(order.currency || 'INR'),
        name: 'Japa Siddhi',
        description: String(input.seva || input.purpose || 'Seva offering').slice(0, 80),
        order_id: orderId,
        prefill: {
          name: String(input.name || ''),
          contact: String(input.phone || '').replace(/\D/g, '').slice(-10),
        },
        theme: {color: '#C9881D'},
      });
    } catch (error: any) {
      if (!checkoutOpened(error)) {
        await websiteFallback(input);
        return;
      }
      showFailure(input);
      return;
    }
    const paymentId = String(result?.razorpay_payment_id || '');
    const paidOrderId = String(result?.razorpay_order_id || orderId);
    const signature = String(result?.razorpay_signature || '');
    try {
      await apiService.post('/payments/razorpay/verify', {
        razorpay_order_id: paidOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });
    } catch {
      Alert.alert(
        'Payment',
        'Payment could not be confirmed. If money was deducted, we will update it shortly.',
      );
      return;
    }
    const confirmationParams = {
      kind: 'RAZORPAY' as const,
      seva: input.seva,
      itemName: input.seva || input.purpose || 'Seva offering',
      purpose: input.purpose,
      orderNumber: paymentId,
      confirmationId: paymentId,
      razorpayOrderId: paidOrderId,
      amount,
      name: input.name,
      phone: input.phone,
    };
    const isMonthlySupport = /monthly\s*support/i.test(
      String(input.seva || input.purpose || ''),
    );
    navigateTo(
      isMonthlySupport ? 'MonthlySupportThankYou' : 'PaymentConfirmation',
      confirmationParams,
    );
  } catch {
    await websiteFallback(input);
  } finally {
    paying = false;
  }
}
