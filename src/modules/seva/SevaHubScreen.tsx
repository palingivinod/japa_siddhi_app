import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import AppIcon, {AppIconName} from '../../components/icons/AppIcon';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import BottomTabs from '../common/BottomTabs';

const SevaHubScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [annadanamEnabled, setAnnadanamEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      apiService
        .get('/annadanam/visibility')
        .then(response => {
          if (active) {
            setAnnadanamEnabled(response.data?.data?.any !== false);
          }
        })
        .catch(() => {
          if (active) {
            setAnnadanamEnabled(true);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const items = useMemo(() => {
    const all = [
      {
        icon: 'banalingam' as AppIconName,
        title: t('tileBaanalingam'),
        sub: t('tileBaanalingamSub'),
        route: 'BanaLingam',
      },
      {
        icon: 'bowl' as AppIconName,
        title: t('tileAnnadanam'),
        sub: t('tileAnnadanamSub'),
        route: 'Donate',
      },
      {
        icon: 'flame' as AppIconName,
        title: t('tileNithyaHomam'),
        sub: t('tileNithyaHomamSub'),
        route: 'NithyaHomam',
      },
    ];
    return all.filter(item => item.route !== 'Donate' || annadanamEnabled);
  }, [t, annadanamEnabled]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Seva" />
        <Text style={styles.heading}>{t('spiritualServices')}</Text>
        {items.map(item => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => navigation.navigate(item.route)}>
            <View style={styles.dot}>
              <AppIcon name={item.icon} size={44} color={Colors.sacredBrown} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <BottomTabs active="SevaHub" />
    </SafeAreaView>
  );
};

export default SevaHubScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E2C6',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  copy: {flex: 1},
  title: {fontSize: 18, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 4, color: Colors.textSecondary},
});
