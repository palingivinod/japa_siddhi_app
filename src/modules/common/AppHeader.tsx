import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';

interface Props {
  title: string;
  /** true = always show, false = never, omit = show when navigation can go back */
  showBack?: boolean;
  /** Home header: no back arrow, and the logo opens the profile. */
  showBell?: boolean;
}

const AppHeader: React.FC<Props> = ({
  title,
  showBack,
  showBell = false,
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
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {tt(title)}
      </Text>
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
  },
  back: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 32,
    color: Colors.sacredBrown,
    lineHeight: 34,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
    paddingHorizontal: 4,
  },
  logo: {
    width: 40,
    height: 40,
  },
});
