import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import Colors from '../../theme/colors';
import {useBottomNavPad} from '../../utils/safeArea';

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
  // Extra room so Telugu descenders (e.g. రివార్డ్స్) are not clipped.
  const bottomPadding = Math.max(useBottomNavPad(), 10) + 4;

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
            <Text
              style={[styles.label, isActive && styles.active]}
              numberOfLines={1}>
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
    paddingBottom: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
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
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.leafGreen,
    includeFontPadding: false,
    textAlign: 'center',
    paddingHorizontal: 2,
    paddingBottom: 3,
  },
  active: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
});
