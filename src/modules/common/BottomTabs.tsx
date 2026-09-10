import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import Colors from '../../theme/colors';

export type TabKey = 'Home' | 'JapaHub' | 'SevaHub' | 'Orders' | 'Profile';

interface Props {
  active: TabKey;
}

const TABS: Array<{
  key: TabKey;
  labelKey: TranslationKey;
  emoji: string;
}> = [
  {key: 'Home', labelKey: 'tabHome', emoji: '🏠'},
  {key: 'JapaHub', labelKey: 'tabJapa', emoji: '🕉️'},
  {key: 'SevaHub', labelKey: 'tabSeva', emoji: '🤲'},
  {key: 'Orders', labelKey: 'tabOrders', emoji: '📦'},
  {key: 'Profile', labelKey: 'tabProfile', emoji: '👤'},
];

const BottomTabs: React.FC<Props> = ({active}) => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => navigation.navigate(tab.key)}
            activeOpacity={0.75}>
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Text style={[styles.emoji, isActive && styles.emojiActive]}>
                {tab.emoji}
              </Text>
            </View>
            <Text style={[styles.label, isActive && styles.active]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomTabs;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 4,
    paddingBottom: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#F3E2C6',
  },
  emoji: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
    opacity: 0.85,
  },
  emojiActive: {
    fontSize: 16,
    lineHeight: 20,
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.leafGreen,
  },
  active: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
});
