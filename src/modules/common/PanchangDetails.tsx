import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import {PanchangPayload} from '../../services/panchang';
import {translatePanchangValue} from '../../services/panchangTerms';
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
  const {t, language} = useLanguage();
  const shown = (text?: string | null) =>
    translatePanchangValue(text, language) || '—';
  const weekday = translatePanchangValue(panchang.weekday, language);
  const vara = translatePanchangValue(panchang.vara, language);
  const varaText =
    weekday && vara && weekday !== vara ? `${weekday} · ${vara}` : weekday || vara;
  const nakshatra = [
    translatePanchangValue(panchang.nakshatra, language),
    panchang.pada ? t('padaLabel', {n: panchang.pada}) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const rituName = [
    panchang.ritu?.vedicName || panchang.ritu?.name,
    panchang.ritu?.name &&
    panchang.ritu?.vedicName &&
    panchang.ritu.name !== panchang.ritu.vedicName
      ? panchang.ritu.name
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const items: PanchangItem[] = [
    ...(rituName
      ? [
          {
            key: 'ritu',
            label: t('labelRitu') || 'RUTHUVU',
            text: rituName,
            wide: true,
          } as PanchangItem,
        ]
      : []),
    {
      key: 'nakshatra',
      label: t('labelNakshatra'),
      text: nakshatra || '—',
      wide: true,
    },
    {key: 'tithi', label: t('labelTithi'), text: shown(panchang.tithi)},
    {
      key: 'vara',
      label: t('labelVara'),
      text: varaText || '—',
    },
    {key: 'paksha', label: t('labelPaksha'), text: shown(panchang.paksha)},
    {key: 'yoga', label: t('labelYoga'), text: shown(panchang.yoga)},
    {key: 'karana', label: t('labelKarana'), text: shown(panchang.karana)},
    {
      key: 'rahu',
      label: t('labelRahuKalam') || 'RAHU KALAM',
      text: value(panchang.rahuKalam),
    },
  ];

  if (!compact) {
    const moonRashi = translatePanchangValue(panchang.moonRashi, language);
    const sunRashi = translatePanchangValue(panchang.sunRashi, language);
    // Prokerala daily panchang has no rashi — hide empties; show when API provides them.
    if (moonRashi) {
      items.push({
        key: 'moon',
        label: t('labelMoonRashi'),
        text: moonRashi,
      });
    }
    if (sunRashi) {
      items.push({
        key: 'sun',
        label: t('labelSunRashi'),
        text: sunRashi,
      });
    }
    items.push(
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
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: 0,
    includeFontPadding: true,
  },
  value: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14.5,
    lineHeight: 22,
    includeFontPadding: true,
  },
});
