import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import ScreenLayout from '../common/ScreenLayout';

const DonateScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  return (
    <ScreenLayout title={t('tileAnnadanam')} showBack tab="SevaHub">
      <Text style={styles.heading}>{t('offerAnnadanam')}</Text>
      <MenuCard
        emoji="🙏"
        title={t('japaAnnadanam')}
        subtitle={t('japaAnnadanamSub')}
        tone="gold"
        onPress={() => navigation.navigate('JapaAnnadanam')}
      />
      <MenuCard
        emoji="🍲"
        title={t('generalAnnadanam')}
        subtitle={t('generalAnnadanamSub')}
        tone="green"
        onPress={() => navigation.navigate('GeneralAnnadanam')}
      />
      <MenuCard
        emoji="🔔"
        title={t('milestoneReminders')}
        subtitle={t('milestoneRemindersSub')}
        onPress={() => navigation.navigate('MilestoneNotifications')}
      />
    </ScreenLayout>
  );
};

export default DonateScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 16,
  },
});
