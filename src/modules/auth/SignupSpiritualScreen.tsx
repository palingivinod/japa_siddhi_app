import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import type {TranslationKey} from '../../i18n/en';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';

// English IDs are what the API stores; labels are translated for display.
const PREFS = [
  'Birthday reminders',
  'Anniversary reminders',
  'Annadanam campaigns',
  'Event invitations',
];

const PREF_LABEL_KEYS: Record<string, TranslationKey> = {
  'Birthday reminders': 'prefBirthdayReminders',
  'Anniversary reminders': 'prefAnniversaryReminders',
  'Annadanam campaigns': 'prefAnnadanamCampaigns',
  'Event invitations': 'prefEventInvitations',
};

const SignupSpiritualScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);

  const toggle = (item: string) => {
    setPrefs(current =>
      current.includes(item)
        ? current.filter(value => value !== item)
        : [...current, item],
    );
  };

  return (
    <ScreenLayout title={t('spiritualDetails')} showBack>
      <Text style={styles.step}>{t('stepOf', {current: 2, total: 3})}</Text>
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
      <Text style={styles.percent}>100%</Text>
      <Text style={styles.label}>{t('gothram')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('optional')}
        value={gothram}
        onChangeText={setGothram}
      />
      <Text style={styles.label}>{t('nakshatram')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('optional')}
        value={nakshatram}
        onChangeText={setNakshatram}
      />
      <Text style={styles.label}>{t('spiritualPreferences')}</Text>
      {PREFS.map(item => (
        <TouchableOpacity key={item} style={styles.pref} onPress={() => toggle(item)}>
          <View style={[styles.box, prefs.includes(item) && styles.boxOn]} />
          <Text style={styles.prefText}>
            {PREF_LABEL_KEYS[item] ? t(PREF_LABEL_KEYS[item]) : item}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={styles.actions}>
        <PrimaryButton
          title={t('continue')}
          onPress={() =>
            navigation.navigate('SignupPhoto', {
              ...route.params,
              gothram,
              nakshatram,
              maritalStatus: route.params?.maritalStatus || 'Bachelor',
              prefs,
            })
          }
        />
      </View>
    </ScreenLayout>
  );
};

export default SignupSpiritualScreen;

const styles = StyleSheet.create({
  step: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 8},
  track: {
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {width: '66%', height: 10, backgroundColor: Colors.templeGold},
  percent: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  label: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 6, marginTop: 10},
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.sacredBrown,
  },
  pref: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    marginRight: 10,
  },
  boxOn: {backgroundColor: Colors.templeGold},
  prefText: {color: Colors.sacredBrown, fontWeight: '600'},
  actions: {
    marginTop: 28,
    marginBottom: 24,
  },
});
