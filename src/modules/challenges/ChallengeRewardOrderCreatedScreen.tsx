import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const ChallengeRewardOrderCreatedScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rewardName = String(route.params?.rewardName || 'Reward');
  const orderId = route.params?.orderId;
  const orderNumber = String(route.params?.orderNumber || '');
  const {t} = useLanguage();

  return (
    <ScreenLayout title={t('rewardOrderCreatedTitle')} showBack tab="JapaHub">
      <SuccessHero
        title={t('rewardOrderCreated')}
        subtitle={
          orderNumber ? t('orderNumberHash', {number: orderNumber}) : undefined
        }
      />

      <View style={styles.card}>
        <View style={styles.dot}>
          <View style={styles.dotInner} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{rewardName}</Text>
          <Text style={styles.body}>{t('deliveryDetailsSaved')}</Text>
        </View>
      </View>

      <PrimaryButton
        title={t('trackReward')}
        onPress={() => {
          if (orderId) {
            navigation.navigate('OrderDetails', {
              id: orderId,
              order: {
                id: orderId,
                orderNumber,
                itemName: rewardName,
                quantity: 1,
              },
            });
            return;
          }
          navigation.navigate('Orders');
        }}
      />
    </ScreenLayout>
  );
};

export default ChallengeRewardOrderCreatedScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
  },
  copy: {flex: 1},
  name: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 17,
    marginBottom: 6,
  },
  body: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
