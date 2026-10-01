import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import AdminLanguageTabs, {
  ADMIN_LANGUAGES,
  AdminSupportedLang,
} from './components/AdminLanguageTabs';
import {parseTranslationsMap} from '../../utils/localizedContent';

interface MantraLangFields {
  name: string;
  deity: string;
  sanskrit: string;
  transliteration: string;
}

const emptyFields = (): MantraLangFields => ({
  name: '',
  deity: '',
  sanskrit: '',
  transliteration: '',
});

const defaultTranslations = (): Record<AdminSupportedLang, MantraLangFields> => ({
  en: {name: '', deity: 'Community', sanskrit: '', transliteration: ''},
  te: emptyFields(),
  hi: emptyFields(),
  ta: emptyFields(),
  kn: emptyFields(),
});

const Field = ({
  label,
  value,
  onChangeText,
  placeholder = 'Enter here',
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.placeholder}
      keyboardType={keyboardType}
    />
  </View>
);

const AdminMantraEditScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mantraId = route.params?.mantraId
    ? String(route.params.mantraId)
    : '';
  const isEdit = Boolean(mantraId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<AdminSupportedLang>('en');
  const [translations, setTranslations] = useState<
    Record<AdminSupportedLang, MantraLangFields>
  >(defaultTranslations);
  const [target, setTarget] = useState('10000');
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.get(`/admin/mantras/${mantraId}`);
      const data = response.data?.data || {};
      const parsedTrans = parseTranslationsMap<MantraLangFields>(
        data.translations,
      );

      const nextTrans = defaultTranslations();
      ADMIN_LANGUAGES.forEach(item => {
        const raw = parsedTrans[item.code];
        if (raw) {
          nextTrans[item.code] = {
            name: String(raw.name || ''),
            deity: String(raw.deity || ''),
            sanskrit: String(raw.sanskrit || ''),
            transliteration: String(raw.transliteration || ''),
          };
        }
      });

      // Default English if not explicitly set in translations
      if (!nextTrans.en.name && data.name) {
        nextTrans.en = {
          name: String(data.name || ''),
          deity: String(data.deityName || data.subtitle || 'Community'),
          sanskrit: String(data.sanskritText || ''),
          transliteration: String(data.transliteration || ''),
        };
      }

      setTranslations(nextTrans);
      setTarget(String(data.target || 108));
      setActive(Boolean(data.active));
    } catch (err) {
      Alert.alert('Error', getApiError(err, 'Could not load mantra.'));
    } finally {
      setLoading(false);
    }
  }, [isEdit, mantraId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const currentFields = translations[activeLang] || emptyFields();

  const updateField = (key: keyof MantraLangFields, val: string) => {
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        ...(prev[activeLang] || emptyFields()),
        [key]: val,
      },
    }));
  };

  const completedMap = useMemo(() => {
    const map: Partial<Record<AdminSupportedLang, boolean>> = {};
    ADMIN_LANGUAGES.forEach(item => {
      const f = translations[item.code];
      map[item.code] = Boolean(f && f.name.trim().length > 0);
    });
    return map;
  }, [translations]);

  const copyFromEnglish = () => {
    const en = translations.en;
    if (!en.name.trim()) {
      Alert.alert('Notice', 'Enter English mantra details first.');
      return;
    }
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        name: prev[activeLang].name || en.name,
        deity: prev[activeLang].deity || en.deity,
        sanskrit: prev[activeLang].sanskrit || en.sanskrit,
        transliteration: prev[activeLang].transliteration || en.transliteration,
      },
    }));
  };

  const save = async () => {
    const primaryName =
      translations.en.name.trim() || translations[activeLang].name.trim();
    if (!primaryName) {
      Alert.alert('Required', 'Enter at least an English or primary Mantra Name.');
      return;
    }

    const targetNum = Number(String(target).replace(/,/g, '')) || 108;
    setSaving(true);
    try {
      const payload = {
        mantraName:
          translations.en.name.trim() || translations[activeLang].name.trim(),
        deityName:
          translations.en.deity.trim() ||
          translations[activeLang].deity.trim() ||
          'Community',
        sanskritText:
          translations.en.sanskrit.trim() ||
          translations[activeLang].sanskrit.trim() ||
          primaryName,
        transliteration:
          translations.en.transliteration.trim() ||
          translations[activeLang].transliteration.trim() ||
          primaryName,
        defaultJapaCount: targetNum,
        isActive: active,
        translations: JSON.stringify(translations),
      };
      if (isEdit) {
        await apiService.put(`/admin/mantras/${mantraId}`, payload);
      } else {
        await apiService.post('/admin/mantras', payload);
      }
      Alert.alert(
        'Saved',
        isEdit
          ? 'Mantra and multilingual translations updated.'
          : 'Mantra created with multilingual translations.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (err) {
      Alert.alert('Save failed', getApiError(err, 'Could not save mantra.'));
    } finally {
      setSaving(false);
    }
  };

  const activeLangOption = ADMIN_LANGUAGES.find(l => l.code === activeLang);

  return (
    <AdminScreenLayout
      title={isEdit ? 'Edit Mantra' : 'Create Mantra'}
      tab="AdminJapa"
      showBack>
      <Text style={styles.heading}>
        {isEdit ? 'Edit Mantra' : 'Create Mantra'}
      </Text>
      <Text style={styles.sub}>
        Configure mantra information in 5 languages. Devotees see the mantra in
        their selected language.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : (
        <>
          <AdminLanguageTabs
            activeLang={activeLang}
            onSelectLang={setActiveLang}
            completedMap={completedMap}
            onCopyFromEnglish={copyFromEnglish}
          />

          <View style={styles.langHeaderCard}>
            <Text style={styles.langHeaderTitle}>
              Editing {activeLangOption?.nativeName} ({activeLangOption?.label})
            </Text>
            <Text style={styles.langHeaderHint}>
              {activeLang === 'en'
                ? 'Primary fallback language for all devotees.'
                : `Custom ${activeLangOption?.label} text for devotees using ${activeLangOption?.nativeName}.`}
            </Text>
          </View>

          <Field
            label={`Mantra Name (${activeLangOption?.nativeName || 'Name'})`}
            value={currentFields.name}
            onChangeText={v => updateField('name', v)}
            placeholder={
              activeLang === 'en'
                ? 'e.g. Om Namah Shivaya'
                : `Enter in ${activeLangOption?.nativeName}`
            }
          />
          <Field
            label="Deity / Subtitle"
            value={currentFields.deity}
            onChangeText={v => updateField('deity', v)}
            placeholder={
              activeLang === 'en'
                ? 'e.g. Lord Shiva / Community'
                : `Deity name in ${activeLangOption?.nativeName}`
            }
          />
          <Field
            label="Sanskrit / Original Script"
            value={currentFields.sanskrit}
            onChangeText={v => updateField('sanskrit', v)}
            placeholder="e.g. ॐ नमः शिवाय"
          />
          <Field
            label="Transliteration / Meaning"
            value={currentFields.transliteration}
            onChangeText={v => updateField('transliteration', v)}
            placeholder="e.g. Om Namah Shivaya"
          />

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>General Settings</Text>

          <Field
            label="Target Japa Count"
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
            placeholder="10000"
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {[true, false].map(option => {
              const on = option === active;
              return (
                <TouchableOpacity
                  key={String(option)}
                  style={[styles.statusChip, on && styles.statusChipOn]}
                  onPress={() => setActive(option)}>
                  <Text style={[styles.statusText, on && styles.statusTextOn]}>
                    {option ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton
            title={
              saving
                ? 'SAVING...'
                : isEdit
                  ? 'SAVE MANTRA'
                  : 'CREATE MANTRA'
            }
            onPress={save}
            disabled={saving}
          />
        </>
      )}
    </AdminScreenLayout>
  );
};

export default AdminMantraEditScreen;

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
    fontSize: 14,
    lineHeight: 20,
  },
  centerBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  langHeaderCard: {
    backgroundColor: '#F7FAF4',
    borderWidth: 1,
    borderColor: '#E2EBDC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  langHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  langHeaderHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  field: {marginBottom: 14},
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statusChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    borderRadius: 22,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipOn: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  statusText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  statusTextOn: {
    color: Colors.white,
  },
});
