import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  NativeModules,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Clipboard from 'react-native/Libraries/Components/Clipboard/Clipboard';

import AppIcon, {AppIconName} from '../../components/icons/AppIcon';
import {PLAYSTORE_URL} from '../../constants/app';
import {useLanguage} from '../../i18n/LanguageContext';
import {
  BookingScreen,
  publicBookingUrlForScreen,
} from '../../navigation/bookingDeepLinks';
import {useTabSwipe} from '../../navigation/useTabSwipe';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import {
  isSevaOfferingInStock,
  isSevaStockRoute,
  SevaOfferingsStockMap,
} from '../../utils/sevaOfferingsStock';
import AppHeader from '../common/AppHeader';
import BottomTabs from '../common/BottomTabs';

type SevaItem = {
  icon?: AppIconName;
  emoji?: string;
  title: string;
  /** Short name for OOS popup (without free-of-cost suffix). */
  itemName: string;
  sub: string;
  route: BookingScreen;
};

const buildAllSevaShareText = (items: SevaItem[]) => {
  const lines = [
    '🙏 Japa Siddhi – Bilva Patra Trust — Spiritual Services 🙏',
    '',
    'Book / request seva in the Japa Siddhi app:',
    '',
  ];
  items.forEach(item => {
    lines.push(item.title);
    lines.push(publicBookingUrlForScreen(item.route));
    lines.push('');
  });
  lines.push('Download app:');
  lines.push(PLAYSTORE_URL);
  return lines.join('\n');
};

const SevaHubScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [annadanamEnabled, setAnnadanamEnabled] = useState(true);
  const [sevaStock, setSevaStock] = useState<SevaOfferingsStockMap>({});
  const tabSwipe = useTabSwipe('SevaHub');

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
      apiService
        .get('/home/seva-offerings-stock')
        .then(response => {
          if (active) {
            setSevaStock(response.data?.data || {});
          }
        })
        .catch(() => {
          if (active) {
            setSevaStock({});
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const freeOfCostBracket = `(${t('freeOfCost')})`;

  const items = useMemo(() => {
    const all: SevaItem[] = [
      {
        icon: 'banalingam' as AppIconName,
        title: `${t('tileBaanalingam')} ${freeOfCostBracket}`,
        itemName: t('tileBaanalingam'),
        sub: t('tileBaanalingamSub'),
        route: 'BanaLingam',
      },
      {
        icon: 'bowl' as AppIconName,
        title: t('tileAnnadanam'),
        itemName: t('tileAnnadanam'),
        sub: t('tileAnnadanamSub'),
        route: 'Donate',
      },
      {
        icon: 'flame' as AppIconName,
        title: t('tileNithyaHomam'),
        itemName: t('tileNithyaHomam'),
        sub: t('tileNithyaHomamSub'),
        route: 'NithyaHomam',
      },
      {
        icon: 'ramakoti' as AppIconName,
        title: `${t('tileRamakoti')} ${freeOfCostBracket}`,
        itemName: t('tileRamakoti'),
        sub: t('tileRamakotiSub'),
        route: 'RamakotiBooks',
      },
      {
        icon: 'homaBhasma' as AppIconName,
        title: `${t('tileHomaBhasma')} ${freeOfCostBracket}`,
        itemName: t('tileHomaBhasma'),
        sub: t('tileHomaBhasmaSub'),
        route: 'HomaBhasma',
      },
      {
        icon: 'biravaPendant' as AppIconName,
        title: `${t('tileBirava')} ${freeOfCostBracket}`,
        itemName: t('tileBirava'),
        sub: t('tileBiravaSub'),
        route: 'BiravaPendant',
      },
    ];
    return all.filter(item => item.route !== 'Donate' || annadanamEnabled);
  }, [t, annadanamEnabled, freeOfCostBracket]);

  const onSevaPress = (item: SevaItem) => {
    if (
      isSevaStockRoute(item.route) &&
      !isSevaOfferingInStock(sevaStock, item.route)
    ) {
      Alert.alert(
        t('outOfStockTitle') || 'Out of Stock',
        t('sevaItemOutOfStockSoon', {item: item.itemName}) ||
          `${item.itemName} is not available right now. It will be in stock soon.`,
        [{text: t('ok') || 'OK'}],
      );
      return;
    }
    navigation.navigate(item.route);
  };

  const handleShareAllSevas = async () => {
    const message = buildAllSevaShareText(items);
    try {
      (Clipboard as {setString?: (value: string) => void}).setString?.(message);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          t('copiedToClipboard') || 'Details copied to clipboard!',
          ToastAndroid.SHORT,
        );
      }
    } catch {
      // ignore
    }

    try {
      if (Platform.OS === 'android' && NativeModules.AppShare?.shareLogo) {
        await NativeModules.AppShare.shareLogo(message);
        return;
      }
      await Share.share(
        Platform.OS === 'ios'
          ? {url: PLAYSTORE_URL, message}
          : {title: 'Japa Siddhi - Spiritual Services', message},
      );
    } catch (err: any) {
      try {
        await Share.share({
          title: 'Japa Siddhi - Spiritual Services',
          message,
        });
      } catch (fallbackErr: any) {
        if (
          fallbackErr?.message &&
          !/dismiss|cancel/i.test(String(fallbackErr.message))
        ) {
          Alert.alert(
            t('shareDetailsTitle') || 'Share',
            t('shareDetailsClipboardHint') ||
              'Details were copied. Paste them in WhatsApp or any app.',
          );
        }
      }
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
      {...tabSwipe.panHandlers}>
      <View style={styles.body}>
        <AppHeader title="Seva" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled">
          <View style={styles.headingRow}>
            <Text style={styles.heading}>{t('spiritualServices')}</Text>
            <TouchableOpacity
              onPress={handleShareAllSevas}
              activeOpacity={0.7}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityRole="button"
              accessibilityLabel={t('share') || 'Share'}>
              <Text style={styles.shareLink}>{t('share') || 'Share'}</Text>
            </TouchableOpacity>
          </View>
          {items.map(item => {
            const outOfStock =
              isSevaStockRoute(item.route) &&
              !isSevaOfferingInStock(sevaStock, item.route);
            return (
              <TouchableOpacity
                key={item.route}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => onSevaPress(item)}>
                <View style={styles.dot}>
                  {item.emoji ? (
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  ) : (
                    <AppIcon
                      name={item.icon || 'bowl'}
                      size={44}
                      color={Colors.sacredBrown}
                    />
                  )}
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{item.title}</Text>
                  {outOfStock ? (
                    <Text style={styles.oos}>{t('outOfStockTitle') || 'Out of Stock'}</Text>
                  ) : (
                    <Text style={styles.sub}>{item.sub}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <BottomTabs active="SevaHub" />
    </SafeAreaView>
  );
};

export default SevaHubScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 12},
  scrollContent: {paddingBottom: 36},
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  heading: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  shareLink: {
    flexShrink: 0,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
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
  copy: {flex: 1, paddingVertical: 1, minWidth: 0},
  emoji: {fontSize: 22},
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  sub: {
    marginTop: 2,
    color: '#4A3B2C',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: true,
  },
  oos: {
    marginTop: 2,
    color: '#B45309',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    includeFontPadding: true,
  },
});
