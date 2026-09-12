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
}

const MenuCard: React.FC<Props> = ({
  title,
  subtitle,
  value,
  emoji,
  icon,
  onPress,
  tone = 'gold',
}) => {
  const {tt} = useLanguage();
  const showMark = Boolean(icon || emoji);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}>
      <View
        style={[
          styles.dot,
          tone === 'green' && styles.dotGreen,
          showMark ? styles.dotEmoji : null,
        ]}>
        {icon ? (
          <AppIcon name={icon} size={42} color={Colors.sacredBrown} />
        ) : emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{tt(title)}</Text>
        {subtitle ? <Text style={styles.sub}>{tt(subtitle)}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{tt(value)}</Text> : null}
      {onPress && !value ? <Text style={styles.chevron}>›</Text> : null}
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
  sub: {
    marginTop: 2,
    color: Colors.textSecondary,
    lineHeight: 22,
    includeFontPadding: true,
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
});
