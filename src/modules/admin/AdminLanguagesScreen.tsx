import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import {APP_LANGUAGES} from '../../services/language';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

type LangOption = {
  code: string;
  name: string;
  nativeName: string;
};

const AdminLanguagesScreen = () => {
  const {t, language, setAppLanguage} = useLanguage();
  const [selected, setSelected] = useState(language || 'en');
  const [languages, setLanguages] = useState<LangOption[]>(APP_LANGUAGES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
          setLanguages(mapped);
        }
      } catch {
        // keep APP_LANGUAGES fallback
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectLanguage = async (item: LangOption) => {
    if (saving || item.code === selected) {
      return;
    }
    setSaving(true);
    setSelected(item.code);
    try {
      await setAppLanguage(item.code);
      try {
        await apiService.put('/profile/settings', {languageCode: item.code});
      } catch {
        // local language still applied
      }
    } catch (err) {
      Alert.alert(
        'Error',
        getApiError(err, 'Could not change app language.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout
      title={t('chooseLanguage') || 'Choose Language'}
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>
        {t('chooseLanguage') || 'Choose Language'}
      </Text>
      <Text style={styles.sub}>
        {t('selectPreferredLanguage') ||
          'Select your preferred language for the admin panel and app.'}
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {languages.map(item => {
        const isSelected = item.code === selected;
        return (
          <TouchableOpacity
            key={item.code}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => selectLanguage(item)}
            activeOpacity={0.85}>
            <View style={styles.copy}>
              <Text
                style={[
                  styles.name,
                  isSelected && styles.nameSelected,
                ]}>
                {item.name}
              </Text>
              {item.nativeName !== item.name ? (
                <Text style={styles.native}>{item.nativeName}</Text>
              ) : null}
            </View>
            <View
              style={[
                styles.markWrap,
                isSelected && styles.markWrapSelected,
              ]}>
              <Text
                style={[
                  styles.markText,
                  isSelected && styles.markTextSelected,
                ]}>
                {isSelected ? '✓' : '›'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminLanguagesScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.textSecondary,
  },
  center: {paddingVertical: 20, alignItems: 'center'},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#F3F7EF',
  },
  copy: {flex: 1},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  nameSelected: {
    color: Colors.leafGreen,
  },
  native: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  markWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7F2E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  markWrapSelected: {
    backgroundColor: Colors.leafGreen,
  },
  markText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textLight,
  },
  markTextSelected: {
    color: Colors.white,
  },
});
