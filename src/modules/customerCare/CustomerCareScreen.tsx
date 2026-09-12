import React from 'react';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import MenuCard from '../common/MenuCard';
import ScreenLayout from '../common/ScreenLayout';

const CustomerCareScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  return (
    <ScreenLayout title="Customer Care" showBack tab="Profile">
      <MenuCard
        emoji="🎫"
        title={t('raiseTicket')}
        subtitle={t('reportAnIssue')}
        onPress={() => navigation.navigate('RaiseTicket')}
      />
      <MenuCard
        emoji="💬"
        title={t('whatsappSupport')}
        subtitle={t('chatWithSupport')}
        onPress={() => navigation.navigate('WhatsAppSupport')}
      />
      <MenuCard
        emoji="📞"
        title={t('callSupport')}
        subtitle={t('speakToUs')}
        tone="green"
        onPress={() => navigation.navigate('CallSupport')}
      />
      <MenuCard
        emoji="❓"
        title={t('faq')}
        subtitle={t('findQuickAnswers')}
        tone="green"
        onPress={() => navigation.navigate('Faq')}
      />
    </ScreenLayout>
  );
};

export default CustomerCareScreen;
