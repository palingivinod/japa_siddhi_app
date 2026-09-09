import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import {APP_LANGUAGES, getLanguage} from '../../services/language';
import apiService from '../../services/apiService';
import AppHeader from '../common/AppHeader';
import PrimaryButton from '../common/PrimaryButton';

type LangOption = {
  code: string;
  name: string;
  nativeName: string;
};

const LanguageSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fromSettings = route.params?.fromSettings;
  const {t, language, setAppLanguage} = useLanguage();
  const [selected, setSelected] = useState(language || 'en');
  const [options, setOptions] = useState<LangOption[]>(APP_LANGUAGES);

  useEffect(() => {
    // First-run gate only. Returning users should never land here unless Settings.
    if (fromSettings) {
      return;
    }
    let mounted = true;
    getLanguage().then(code => {
      if (!mounted || !code) {
        return;
      }
      navigation.replace('Login');
    });
    return () => {
      mounted = false;
    };
  }, [fromSettings, navigation]);

  useEffect(() => {
    getLanguage().then(code => {
      if (code) {
        setSelected(code);
      }
    });
  }, []);

  useEffect(() => {
    if (language) {
      setSelected(language);
    }
  }, [language]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await apiService.get('/master/languages');
        const rows = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        if (!mounted || !rows.length) {
          return;
        }
        const mapped = rows
          .map((row: any) => {
            const code = String(row.code || '').toLowerCase();
            const fallback = APP_LANGUAGES.find(item => item.code === code);
            return {
              code,
              name: String(row.name || fallback?.name || code),
              nativeName: String(
                row.nativeName ||
                  row.native_name ||
                  fallback?.nativeName ||
                  row.name ||
                  code,
              ),
            };
          })
          .filter((item: LangOption) => item.code);
        if (mapped.length) {
          setOptions(mapped);
        }
      } catch {
        // keep APP_LANGUAGES fallback
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const continueNext = async () => {
    await setAppLanguage(selected);
    // Sync to profile only when already logged in (Settings / returning session).
    if (fromSettings) {
      try {
        await apiService.put('/profile/settings', {languageCode: selected});
      } catch {
        undefined;
      }
      navigation.goBack();
      return;
    }
    // First-time choose language → Login. Do not ask again on later opens.
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader title="Choose Language" showBack={fromSettings} />
      <Text style={styles.hint}>{t('selectPreferredLanguage')}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {options.map(item => {
          const active = item.code === selected;
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => setSelected(item.code)}>
              <View>
                <Text style={styles.name}>{item.nativeName}</Text>
                {item.nativeName !== item.name ? (
                  <Text style={styles.native}>{item.name}</Text>
                ) : null}
              </View>
              <Text style={styles.mark}>{active ? '✓' : '›'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <PrimaryButton title={t('continue')} onPress={continueNext} />
    </SafeAreaView>
  );
};

export default LanguageSelectScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  hint: {
    textAlign: 'center',
    color: Colors.sacredBrown,
    fontSize: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#F3F7EF',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  native: {
    marginTop: 2,
    color: Colors.textSecondary,
  },
  mark: {
    fontSize: 18,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
});
