import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import AppIcon, {AppIconName} from '../../components/icons/AppIcon';
import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';

interface Props {
  title: string;
  subtitle?: string;
  value?: string;
  emoji?: string;
  icon?: AppIconName;
  onPress?: () => void;
  tone?: 'gold' | 'green';
  selected?: boolean;
}

const MenuCard: React.FC<Props> = ({
  title,
  subtitle,
  value,
  emoji,
  icon,
  onPress,
  tone = 'gold',
  selected = false,
}) => {
  const {tt} = useLanguage();
  const showMark = Boolean(icon || emoji);
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}>
      <View
        style={[
          styles.dot,
          tone === 'green' && styles.dotGreen,
          showMark ? styles.dotEmoji : null,
          selected && styles.dotSelected,
        ]}>
        {icon ? (
          <AppIcon name={icon} size={42} color={Colors.sacredBrown} />
        ) : emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, selected && styles.titleSelected]}>
          {tt(title)}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, selected && styles.subSelected]}>
            {tt(subtitle)}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={styles.value}>{tt(value)}</Text> : null}
      {selected ? (
        <View style={styles.check}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      ) : onPress && !value ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </TouchableOpacity>
  );
};

export default MenuCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSelected: {
    backgroundColor: Colors.selectedTint,
    borderColor: Colors.selectedOrange,
    borderWidth: 2,
  },
  dot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.templeGold,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dotGreen: {
    backgroundColor: Colors.leafGreen,
  },
  dotEmoji: {
    backgroundColor: '#F3E2C6',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dotSelected: {
    borderWidth: 2,
    borderColor: Colors.selectedOrange,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    includeFontPadding: false,
  },
  copy: {
    flex: 1,
    paddingVertical: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  titleSelected: {
    color: Colors.primaryDark,
  },
  sub: {
    marginTop: 2,
    color: Colors.textSecondary,
    lineHeight: 22,
    includeFontPadding: true,
  },
  subSelected: {
    color: Colors.selectedOrange,
    fontWeight: '800',
  },
  value: {
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    color: Colors.templeGold,
    fontWeight: '700',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginLeft: 8,
    backgroundColor: Colors.selectedOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
