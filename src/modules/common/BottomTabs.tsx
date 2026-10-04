import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import Colors from '../../theme/colors';

export type TabKey =
  | 'Home'
  | 'JapaHub'
  | 'SevaHub'
  | 'Rewards'
  | 'AvailableRewards'
  | 'Orders'
  | 'Profile';

interface Props {
  active: TabKey;
}

const TABS: Array<{
  key: string;
  tabKey: TabKey;
  labelKey: TranslationKey;
  emoji: string;
}> = [
  {key: 'Home', tabKey: 'Home', labelKey: 'tabHome', emoji: '🏠'},
  {key: 'JapaHub', tabKey: 'JapaHub', labelKey: 'tabJapa', emoji: '🕉️'},
  {key: 'SevaHub', tabKey: 'SevaHub', labelKey: 'tabSeva', emoji: '🤲'},
  {key: 'AvailableRewards', tabKey: 'Rewards', labelKey: 'tabRewards', emoji: '🏆'},
  {key: 'Profile', tabKey: 'Profile', labelKey: 'tabProfile', emoji: '👤'},
];

const BottomTabs: React.FC<Props> = ({active}) => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.bar, {paddingBottom: bottomPadding}]}>
      {TABS.map(tab => {
        const isActive =
          tab.tabKey === active ||
          tab.key === active ||
          (tab.tabKey === 'Rewards' &&
            (active === 'Rewards' || active === 'AvailableRewards'));
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
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#F3E2C6',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    includeFontPadding: false,
    opacity: 0.9,
  },
  emojiActive: {
    fontSize: 26,
    lineHeight: 32,
    opacity: 1,
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.leafGreen,
    includeFontPadding: true,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  active: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
});
