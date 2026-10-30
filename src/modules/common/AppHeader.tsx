import React, {ReactNode} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';

interface Props {
  title: string;
  /** Optional line under the title (Home: trust affiliation). */
  subtitle?: string;
  /** true = always show, false = never, omit = show when navigation can go back */
  showBack?: boolean;
  /** Home header: no back arrow, and the logo opens the profile. */
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

  const shouldShowBack =
    showBack === true ||
    (showBack !== false && !showBell && navigation.canGoBack());

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  };

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
      <TouchableOpacity
        onPress={() => {
          if (showBell) {
            navigation.navigate('Profile');
          }
        }}
        disabled={!showBell}
        accessibilityRole="button"
        accessibilityLabel={t('tabProfile')}>
        <Image
          source={require('../../assets/images/login_logo.webp')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
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
});
