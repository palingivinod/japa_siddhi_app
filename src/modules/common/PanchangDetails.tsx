import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import {PanchangPayload} from '../../services/panchang';
import Colors from '../../theme/colors';

type Props = {
  panchang: PanchangPayload;
  compact?: boolean;
};

const value = (text?: string) => text || '—';

const PanchangDetails = ({panchang, compact}: Props) => {
  const {t} = useLanguage();

  const items = [
    [
      t('labelNakshatra'),
      panchang.pada
        ? `${value(panchang.nakshatra)} · ${t('padaLabel', {n: panchang.pada})}`
        : value(panchang.nakshatra),
    ],
    [t('labelTithi'), value(panchang.tithi)],
    [
      t('labelVara'),
      panchang.vara ? `${panchang.weekday} · ${panchang.vara}` : '—',
    ],
    [t('labelPaksha'), value(panchang.paksha)],
    [t('labelYoga'), value(panchang.yoga)],
    [t('labelKarana'), value(panchang.karana)],
  ];

  if (!compact) {
    items.push(
      [t('labelMoonRashi'), value(panchang.moonRashi)],
      [t('labelSunRashi'), value(panchang.sunRashi)],
      [t('labelSunrise'), value(panchang.sunrise)],
      [t('labelSunset'), value(panchang.sunset)],
      [t('labelYamagandam'), value(panchang.yamagandam)],
    );
  } else {
    const amrutha = (panchang.auspiciousTimings?.amruthaGadiyalu || [])
      .map(slot => `${slot.startTime} – ${slot.endTime}`)
      .join(', ');
    if (amrutha) {
      items.push([t('labelAmruthaGadiyalu'), amrutha]);
    }
    if (panchang.sunrise) {
      items.push([t('labelSunrise'), value(panchang.sunrise)]);
    }
  }

  return (
    <View style={styles.wrap}>
      {panchang.locationName || panchang.source ? (
        <Text style={styles.meta}>
          {[panchang.locationName, panchang.source].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      <View style={styles.row}>
        {items.map(([label, text]) => (
          <View key={label} style={styles.item}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{text}</Text>
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
  meta: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  item: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.iconBackground,
    borderRadius: 12,
    padding: 10,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  value: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
  },
});
