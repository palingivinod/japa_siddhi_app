import React, {useEffect} from 'react';
import {ActivityIndicator} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

/** Legacy route: always continue straight to smart japa counting. */
const ReferenceChantScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  useEffect(() => {
    navigation.replace('Chant', {
      mode: route.params?.mode || 'community',
      mantraId: route.params?.mantraId,
      privateMantra: route.params?.privateMantra,
      goal: route.params?.goal || 2000,
      durationMs: route.params?.durationMs || 2500,
      challengeId: route.params?.challengeId,
      initialCount: route.params?.initialCount,
      challengeMantra: route.params?.challengeMantra,
      goalType: route.params?.goalType,
      endDate: route.params?.endDate,
      dailyTarget: route.params?.dailyTarget,
      japaGoalId: route.params?.japaGoalId,
    });
  }, [navigation, route.params]);

  return (
    <ScreenLayout title="Japa" showBack tab="JapaHub">
      <ActivityIndicator color={Colors.templeGold} />
    </ScreenLayout>
  );
};

export default ReferenceChantScreen;
