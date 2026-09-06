import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';

interface Props {
  title: string;
  subtitle?: string;
  value?: string;
  emoji?: string;
  onPress?: () => void;
  tone?: 'gold' | 'green';
}

const MenuCard: React.FC<Props> = ({
  title,
  subtitle,
  value,
  emoji,
  onPress,
  tone = 'gold',
}) => {
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
          emoji ? styles.dotEmoji : null,
        ]}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 4,
    color: Colors.textSecondary,
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
