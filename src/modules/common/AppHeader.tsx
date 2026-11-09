import React, {ReactNode, useCallback, useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import AppIcon from '../../components/icons/AppIcon';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';

interface Props {
  title: string;
  /** Optional line under the title (Home: trust affiliation). */
  subtitle?: string;
  /** true = always show, false = never, omit = show when navigation can go back */
  showBack?: boolean;
  /** Home only: notification bell + unread count (no logo). */
  showBell?: boolean;
  /** Replaces the empty left slot on Home. */
  leftAction?: ReactNode;
}

const AppHeader: React.FC<Props> = ({
  title,
  subtitle,
  showBack,
  showBell = false,
  leftAction,
}) => {
  const navigation = useNavigation<any>();
  const {t, tt} = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);

  const shouldShowBack =
    showBack === true ||
    (showBack !== false && !showBell && navigation.canGoBack());

  useFocusEffect(
    useCallback(() => {
      if (!showBell) {
        return undefined;
      }
      let active = true;
      apiService
        .get('/notifications/unread-count')
        .then(res => {
          if (!active) {
            return;
          }
          const payload = res.data?.data ?? res.data ?? {};
          const raw =
            payload.unreadCount ??
            payload.count ??
            payload.unread ??
            res.data?.unreadCount ??
            0;
          setUnreadCount(Math.max(0, Math.round(Number(raw) || 0)));
        })
        .catch(() => {
          if (active) {
            setUnreadCount(0);
          }
        });
      return () => {
        active = false;
      };
    }, [showBell]),
  );

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  };

  const badgeLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : '';

  return (
    <View style={styles.row}>
      {shouldShowBack ? (
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      ) : leftAction ? (
        <View style={styles.leftAction}>{leftAction}</View>
      ) : (
        <View style={styles.back} />
      )}
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={2}>
          {tt(title)}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {tt(subtitle)}
          </Text>
        ) : null}
      </View>
      {showBell ? (
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.bellHit}
          accessibilityRole="button"
          accessibilityLabel={t('notifications') || 'Notifications'}>
          <AppIcon name="bell" size={26} color={Colors.sacredBrown} />
          {badgeLabel ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : (
        <Image
          source={require('../../assets/images/login_logo.webp')}
          style={styles.logo}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
    minHeight: 48,
  },
  back: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  leftAction: {
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backText: {
    fontSize: 32,
    color: Colors.sacredBrown,
    lineHeight: 34,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
    paddingVertical: 2,
    flexWrap: 'wrap',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: Colors.leafGreen,
    marginTop: 3,
    paddingHorizontal: 4,
  },
  logo: {
    width: 40,
    height: 40,
  },
  bellHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error || '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.white || '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
