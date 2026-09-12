import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import {
  ChoghadiyaPayload,
  ChoghadiyaPeriod,
  choghadiyaWindow,
  currentChoghadiya,
} from '../../services/panchang';
import Colors from '../../theme/colors';

type Props = {
  choghadiya?: ChoghadiyaPayload;
};

const ChaughadiyaCard = ({choghadiya}: Props) => {
  const {t} = useLanguage();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const current = useMemo(
    () => currentChoghadiya(choghadiya, now),
    [choghadiya, now],
  );
  const periods = choghadiya?.periods || [];

  if (!current && !periods.length) {
    return null;
  }

  const effectLabel =
    current?.effect === 'good'
      ? t('chaughadiyaGood')
      : current?.effect === 'bad'
        ? t('chaughadiyaBad')
        : t('chaughadiyaNeutral');

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.85}
        onPress={() => setOpen(value => !value)}>
        <View style={styles.copy}>
          <Text style={styles.label}>{t('currentChaughadiya')}</Text>
          <Text style={styles.name}>{current?.name || '—'}</Text>
          <Text style={styles.time}>{choghadiyaWindow(current)}</Text>
          {current?.effect ? (
            <Text style={styles.effect}>{effectLabel}</Text>
          ) : null}
        </View>
        <View style={styles.chevronWrap}>
          <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {open
        ? periods.map(item => (
            <PeriodRow
              key={`${item.period}-${item.startIso}-${item.name}`}
              item={item}
              active={
                Boolean(current?.startIso) && item.startIso === current?.startIso
              }
            />
          ))
        : null}
    </View>
  );
};

const PeriodRow = ({
  item,
  active,
}: {
  item: ChoghadiyaPeriod;
  active: boolean;
}) => {
  const {t} = useLanguage();
  return (
    <View style={[styles.row, active && styles.rowActive]}>
      <View style={styles.copy}>
        <Text style={[styles.rowName, active && styles.rowNameActive]}>
          {item.name}
        </Text>
        <Text style={styles.rowMeta}>
          {item.period === 'night' ? t('chaughadiyaNight') : t('chaughadiyaDay')}{' '}
          · {choghadiyaWindow(item)}
        </Text>
      </View>
    </View>
  );
};

export default ChaughadiyaCard;

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: Colors.iconBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copy: {flex: 1, paddingRight: 10},
  label: {
    color: Colors.leafGreen,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0,
    includeFontPadding: true,
  },
  name: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '800',
    includeFontPadding: true,
  },
  time: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: true,
  },
  effect: {
    marginTop: 4,
    color: Colors.leafGreen,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    includeFontPadding: true,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chevron: {
    color: Colors.sacredBrown,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
  },
  row: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  rowActive: {
    borderTopColor: Colors.templeGold,
  },
  rowName: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 24,
    includeFontPadding: true,
  },
  rowNameActive: {
    color: Colors.templeGold,
  },
  rowMeta: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: true,
  },
});
