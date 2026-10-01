import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../../theme/colors';

export type AdminSupportedLang = 'en' | 'te' | 'hi' | 'ta' | 'kn';

export interface AdminLanguageOption {
  code: AdminSupportedLang;
  label: string;
  nativeName: string;
}

export const ADMIN_LANGUAGES: AdminLanguageOption[] = [
  {code: 'en', label: 'English', nativeName: 'English'},
  {code: 'te', label: 'Telugu', nativeName: 'తెలుగు'},
  {code: 'hi', label: 'Hindi', nativeName: 'हिन्दी'},
  {code: 'ta', label: 'Tamil', nativeName: 'தமிழ்'},
  {code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ'},
];

interface Props {
  activeLang: AdminSupportedLang;
  onSelectLang: (lang: AdminSupportedLang) => void;
  completedMap?: Partial<Record<AdminSupportedLang, boolean>>;
  onCopyFromEnglish?: () => void;
}

const AdminLanguageTabs: React.FC<Props> = ({
  activeLang,
  onSelectLang,
  completedMap = {},
  onCopyFromEnglish,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Language Fields (5 Languages)</Text>
        {activeLang !== 'en' && onCopyFromEnglish ? (
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={onCopyFromEnglish}
            activeOpacity={0.7}>
            <Text style={styles.copyBtnText}>📋 Copy English</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {ADMIN_LANGUAGES.map(item => {
          const isActive = item.code === activeLang;
          const isFilled = Boolean(completedMap[item.code]);
          return (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.tab,
                isActive && styles.tabActive,
                !isActive && isFilled && styles.tabFilled,
              ]}
              onPress={() => onSelectLang(item.code)}
              activeOpacity={0.8}>
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.tabNative,
                    isActive && styles.tabNativeActive,
                  ]}>
                  {item.nativeName}
                </Text>
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {item.label}
                </Text>
              </View>
              {isFilled ? (
                <View
                  style={[
                    styles.badge,
                    isActive ? styles.badgeActive : styles.badgeInactive,
                  ]}>
                  <Text
                    style={[
                      styles.badgeText,
                      isActive
                        ? styles.badgeTextActive
                        : styles.badgeTextInactive,
                    ]}>
                    ✓
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default AdminLanguageTabs;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.leafGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EAEFE6',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  scrollContent: {
    paddingVertical: 4,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    marginRight: 8,
    minWidth: 95,
  },
  tabFilled: {
    borderColor: '#B8D5A3',
    backgroundColor: '#FAFDF8',
  },
  tabActive: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
    shadowColor: Colors.sacredBrown,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContent: {
    flexDirection: 'column',
  },
  tabNative: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tabNativeActive: {
    color: Colors.white,
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: Colors.templeGold,
  },
  badge: {
    marginLeft: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: Colors.templeGold,
  },
  badgeInactive: {
    backgroundColor: Colors.leafGreen,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  badgeTextActive: {
    color: Colors.sacredBrown,
  },
  badgeTextInactive: {
    color: Colors.white,
  },
});
