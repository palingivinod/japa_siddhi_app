import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import {PanchangPayload} from '../../services/panchang';
import Colors from '../../theme/colors';

type Props = {
  panchang: PanchangPayload;
  compact?: boolean;
};

type PanchangItem = {
  key: string;
  label: string;
  text: string;
  wide?: boolean;
};

const value = (text?: string) => text || '—';

const PanchangDetails = ({panchang, compact}: Props) => {
  const {t} = useLanguage();

  const items: PanchangItem[] = [
    {
      key: 'nakshatra',
      label: t('labelNakshatra'),
      text: panchang.pada
        ? `${value(panchang.nakshatra)} · ${t('padaLabel', {n: panchang.pada})}`
        : value(panchang.nakshatra),
      wide: true,
    },
    {key: 'tithi', label: t('labelTithi'), text: value(panchang.tithi)},
    {
      key: 'vara',
      label: t('labelVara'),
      text: panchang.vara ? `${panchang.weekday} · ${panchang.vara}` : '—',
    },
    {key: 'paksha', label: t('labelPaksha'), text: value(panchang.paksha)},
    {key: 'yoga', label: t('labelYoga'), text: value(panchang.yoga)},
    {key: 'karana', label: t('labelKarana'), text: value(panchang.karana)},
  ];

  if (!compact) {
    items.push(
      {key: 'moon', label: t('labelMoonRashi'), text: value(panchang.moonRashi)},
      {key: 'sun', label: t('labelSunRashi'), text: value(panchang.sunRashi)},
      {key: 'sunrise', label: t('labelSunrise'), text: value(panchang.sunrise)},
      {key: 'sunset', label: t('labelSunset'), text: value(panchang.sunset)},
      {
        key: 'yama',
        label: t('labelYamagandam'),
        text: value(panchang.yamagandam),
      },
    );
  } else {
    const amrutha = (panchang.auspiciousTimings?.amruthaGadiyalu || [])
      .map(slot => `${slot.startTime} – ${slot.endTime}`)
      .join(', ');
    if (amrutha) {
      items.push({
        key: 'amrutha',
        label: t('labelAmruthaGadiyalu'),
        text: amrutha,
      });
    }
    if (panchang.sunrise) {
      items.push({
        key: 'sunrise',
        label: t('labelSunrise'),
        text: value(panchang.sunrise),
      });
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {items.map(item => (
          <View
            key={item.key}
            style={[styles.item, item.wide && styles.itemWide]}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default PanchangDetails;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  item: {
    width: '48%',
    backgroundColor: Colors.iconBackground,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
  },
  itemWide: {
    width: '100%',
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 0,
    includeFontPadding: true,
  },
  value: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: true,
  },
});
