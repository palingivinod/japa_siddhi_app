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
          <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
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
    backgroundColor: '#1F1812',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1},
  label: {
    color: '#E8D9B8',
    fontSize: 13,
    fontWeight: '700',
  },
  name: {
    marginTop: 6,
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '800',
  },
  time: {
    marginTop: 6,
    color: '#F7E7C4',
    fontWeight: '700',
    fontSize: 14,
  },
  effect: {
    marginTop: 4,
    color: '#C8B48A',
    fontSize: 12,
    fontWeight: '700',
  },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#8B6A3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    color: '#F7E7C4',
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#3A2F24',
  },
  rowActive: {
    borderTopColor: Colors.gold,
  },
  rowName: {
    color: '#F7E7C4',
    fontWeight: '800',
    fontSize: 15,
  },
  rowNameActive: {
    color: Colors.gold,
  },
  rowMeta: {
    marginTop: 3,
    color: '#C8B48A',
    fontSize: 12,
  },
});
