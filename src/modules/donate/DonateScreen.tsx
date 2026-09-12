import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import ScreenLayout from '../common/ScreenLayout';

type Visibility = {
  japa: boolean;
  general: boolean;
  campaigns: boolean;
};

const DonateScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>({
    japa: true,
    general: true,
    campaigns: true,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      apiService
        .get('/annadanam/visibility')
        .then(response => {
          if (!active) {
            return;
          }
          const data = response.data?.data || {};
          setVisibility({
            japa: data.japa !== false,
            general: data.general !== false,
            campaigns: data.campaigns !== false,
          });
        })
        .catch(() => {
          if (active) {
            setVisibility({japa: true, general: true, campaigns: true});
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const hasAny =
    visibility.japa || visibility.general || visibility.campaigns;

  return (
    <ScreenLayout title={t('tileAnnadanam')} showBack tab="SevaHub">
      <Text style={styles.heading}>{t('offerAnnadanam')}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && !hasAny ? (
        <Text style={styles.empty}>
          {t('annadanamUnavailable')}
        </Text>
      ) : null}

      {visibility.japa ? (
        <MenuCard
          icon="japaAnnadanam"
          title={t('japaAnnadanam')}
          subtitle={t('japaAnnadanamSub')}
          tone="gold"
          onPress={() => navigation.navigate('JapaAnnadanam')}
        />
      ) : null}

      {visibility.general ? (
        <MenuCard
          icon="generalAnnadanam"
          title={t('generalAnnadanam')}
          subtitle={t('generalAnnadanamSub')}
          tone="green"
          onPress={() => navigation.navigate('GeneralAnnadanam')}
        />
      ) : null}

      {visibility.campaigns ? (
        <MenuCard
          icon="festivalCampaign"
          title={t('festivalCampaigns')}
          subtitle={t('seasonalAnnadanamCampaigns')}
          onPress={() => navigation.navigate('Festivals')}
        />
      ) : null}
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
  center: {paddingVertical: 16, alignItems: 'center'},
  empty: {
    marginBottom: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
