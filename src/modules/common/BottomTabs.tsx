import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import AppIcon, {AppIconName} from '../../components/icons/AppIcon';
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
  icon: AppIconName;
}> = [
  {key: 'Home', labelKey: 'tabHome', icon: 'home'},
  {key: 'JapaHub', labelKey: 'tabJapa', icon: 'japa'},
  {key: 'SevaHub', labelKey: 'tabSeva', icon: 'seva'},
  {key: 'Orders', labelKey: 'tabOrders', icon: 'orders'},
  {key: 'Profile', labelKey: 'tabProfile', icon: 'profile'},
];

const BottomTabs: React.FC<Props> = ({active}) => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        const color = isActive ? Colors.templeGold : Colors.leafGreen;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => navigation.navigate(tab.key)}>
            <AppIcon name={tab.icon} size={20} color={color} />
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.leafGreen,
  },
  active: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
});
