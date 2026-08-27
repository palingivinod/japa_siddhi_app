import React from 'react';
import {useNavigation} from '@react-navigation/native';

import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const CustomerCareScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="Customer Care" showBack tab="Profile">
      <MenuCard
        title="Raise Ticket"
        subtitle="Report an issue"
        onPress={() => navigation.navigate('RaiseTicket')}
      />
      <MenuCard
        title="WhatsApp Support"
        subtitle="Chat with support"
        onPress={() => navigation.navigate('WhatsAppSupport')}
      />
      <MenuCard
        title="Call Support"
        subtitle="Speak to us"
        tone="green"
        onPress={() => navigation.navigate('CallSupport')}
      />
      <MenuCard
        title="FAQ"
        subtitle="Find quick answers"
        tone="green"
        onPress={() => navigation.navigate('Faq')}
      />
      <PrimaryButton
        title="FEEDBACK Form"
        onPress={() => navigation.navigate('Feedback')}
      />
    </ScreenLayout>
  );
};

export default CustomerCareScreen;
