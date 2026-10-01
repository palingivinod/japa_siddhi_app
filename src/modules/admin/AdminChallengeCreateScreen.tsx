import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import AdminLanguageTabs, {
  ADMIN_LANGUAGES,
  AdminSupportedLang,
} from './components/AdminLanguageTabs';
import {parseTranslationsMap} from '../../utils/localizedContent';

interface ChallengeLangFields {
  title: string;
  description: string;
  mantra: string;
}

const emptyFields = (): ChallengeLangFields => ({
  title: '',
  description: '',
  mantra: '',
});

const defaultTranslations = (): Record<AdminSupportedLang, ChallengeLangFields> => ({
  en: emptyFields(),
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
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.placeholder}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

const mantraFromReward = (rewardName?: string) => {
  const value = String(rewardName || '')
    .replace(/\s*Certificate$/i, '')
    .trim();
  if (!value || value.toLowerCase() === 'certificate') {
    return '';
  }
  return value;
};

const toYmd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateValue = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const slash = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (slash) {
    const date = new Date(
      Number(slash[3]),
      Number(slash[2]) - 1,
      Number(slash[1]),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDisplayDate = (date: Date | null) => {
  if (!date) {
    return 'Select date';
  }
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const AdminChallengeCreateScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editId = String(route.params?.id || '').trim();
  const isEdit = Boolean(editId);

  const [activeLang, setActiveLang] = useState<AdminSupportedLang>('en');
  const [translations, setTranslations] = useState<
    Record<AdminSupportedLang, ChallengeLangFields>
  >(defaultTranslations);

  const [target, setTarget] = useState(
    String(route.params?.targetValue || route.params?.target || '10000'),
  );
  const [startDate, setStartDate] = useState<Date | null>(
    () => parseDateValue(route.params?.startDate) || new Date(),
  );
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const parsed = parseDateValue(route.params?.endDate);
    if (parsed) {
      return parsed;
    }
    const next = new Date();
    next.setDate(next.getDate() + 30);
    return next;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit && !route.params?.title);

  useEffect(() => {
    if (route.params?.title) {
      const parsedTrans = parseTranslationsMap<ChallengeLangFields>(
        route.params.translations,
      );
      const nextTrans = defaultTranslations();
      ADMIN_LANGUAGES.forEach(item => {
        const raw = parsedTrans[item.code];
        if (raw) {
          nextTrans[item.code] = {
            title: String(raw.title || ''),
            description: String(raw.description || ''),
            mantra: String(raw.mantra || ''),
          };
        }
      });
      if (!nextTrans.en.title) {
        nextTrans.en = {
          title: String(route.params.title || ''),
          description: String(
            route.params.description || route.params.detail || '',
          ),
          mantra: String(
            route.params.mantra ||
              mantraFromReward(route.params.rewardName) ||
              '',
          ),
        };
      }
      setTranslations(nextTrans);
    }
  }, [route.params]);

  useEffect(() => {
    if (!isEdit || route.params?.title) {
      return;
    }
    let alive = true;
    setLoading(true);
    apiService
      .get('/admin/challenges')
      .then(response => {
        if (!alive) {
          return;
        }
        const rows = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        const match = rows.find((row: any) => String(row.id) === editId);
        if (!match) {
          Alert.alert('Not found', 'Challenge could not be loaded.');
          return;
        }

        const parsedTrans = parseTranslationsMap<ChallengeLangFields>(
          match.translations,
        );
        const nextTrans = defaultTranslations();
        ADMIN_LANGUAGES.forEach(item => {
          const raw = parsedTrans[item.code];
          if (raw) {
            nextTrans[item.code] = {
              title: String(raw.title || ''),
              description: String(raw.description || ''),
              mantra: String(raw.mantra || ''),
            };
          }
        });
        if (!nextTrans.en.title) {
          nextTrans.en = {
            title: String(match.title || ''),
            description: String(match.description || match.detail || ''),
            mantra: mantraFromReward(match.rewardName),
          };
        }
        setTranslations(nextTrans);
        setTarget(String(match.targetValue || '10000'));
        setStartDate(parseDateValue(match.startDate) || new Date());
        setEndDate(
          parseDateValue(match.endDate) ||
            (() => {
              const next = new Date();
              next.setDate(next.getDate() + 30);
              return next;
            })(),
        );
      })
      .catch(err => {
        Alert.alert(
          'Load failed',
          getApiError(err, 'Could not load challenge.'),
        );
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [editId, isEdit, route.params?.title]);

  const currentFields = translations[activeLang] || emptyFields();

  const updateField = (key: keyof ChallengeLangFields, val: string) => {
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
      map[item.code] = Boolean(f && f.title.trim().length > 0);
    });
    return map;
  }, [translations]);

  const copyFromEnglish = () => {
    const en = translations.en;
    if (!en.title.trim()) {
      Alert.alert('Notice', 'Enter English challenge title first.');
      return;
    }
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        title: prev[activeLang].title || en.title,
        description: prev[activeLang].description || en.description,
        mantra: prev[activeLang].mantra || en.mantra,
      },
    }));
  };

  const onStartChange = (selected: Date) => {
    setStartDate(selected);
    if (endDate && selected > endDate) {
      setEndDate(selected);
    }
    setShowStartPicker(false);
  };

  const onEndChange = (selected: Date) => {
    setEndDate(selected);
    setShowEndPicker(false);
  };

  const save = async () => {
    const primaryTitle =
      translations.en.title.trim() || translations[activeLang].title.trim();
    if (!primaryTitle) {
      Alert.alert('Required', 'Enter at least an English or primary Challenge Name.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Required', 'Select start and end dates.');
      return;
    }
    if (toYmd(endDate) < toYmd(startDate)) {
      Alert.alert('Invalid dates', 'End date must be on or after start date.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: primaryTitle,
        description:
          translations.en.description.trim() ||
          translations[activeLang].description.trim(),
        mantra:
          translations.en.mantra.trim() ||
          translations[activeLang].mantra.trim(),
        target,
        startDate: toYmd(startDate),
        endDate: toYmd(endDate),
        translations: JSON.stringify(translations),
      };
      if (isEdit) {
        await apiService.put(`/admin/challenges/${editId}`, payload);
        Alert.alert('Challenge updated', 'Changes and multilingual translations saved.', [
          {
            text: 'View challenges',
            onPress: () => navigation.navigate('AdminChallenges'),
          },
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        await apiService.post('/admin/challenges', payload);
        Alert.alert(
          'Challenge created',
          'Challenge created with 5-language translation support.',
          [
            {
              text: 'View challenges',
              onPress: () => navigation.navigate('AdminChallenges'),
            },
            {text: 'OK', onPress: () => navigation.goBack()},
          ],
        );
      }
    } catch (err) {
      Alert.alert(
        isEdit ? 'Update failed' : 'Create failed',
        getApiError(
          err,
          isEdit
            ? 'Could not update challenge.'
            : 'Could not create challenge.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const activeLangOption = ADMIN_LANGUAGES.find(l => l.code === activeLang);

  return (
    <AdminScreenLayout
      title={isEdit ? 'Edit Challenge' : 'Challenge Creation'}
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>
        {isEdit ? 'Edit Challenge' : 'Challenge Creation'}
      </Text>
      <Text style={styles.sub}>
        Configure challenge details in 5 languages. Devotees see the challenge in
        their chosen language.
      </Text>

      {loading ? (
        <Text style={styles.sub}>Loading challenge...</Text>
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
                : `Custom ${activeLangOption?.label} content for devotees using ${activeLangOption?.nativeName}.`}
            </Text>
          </View>

          <Field
            label={`Challenge Name (${activeLangOption?.nativeName || 'Name'})`}
            value={currentFields.title}
            onChangeText={v => updateField('title', v)}
            placeholder={
              activeLang === 'en'
                ? 'e.g. Navaratri 108 Challenge'
                : `Challenge name in ${activeLangOption?.nativeName}`
            }
          />
          <Field
            label="Description / Instructions"
            value={currentFields.description}
            onChangeText={v => updateField('description', v)}
            placeholder={
              activeLang === 'en'
                ? 'e.g. Complete 108 chants daily during Navaratri'
                : `Description in ${activeLangOption?.nativeName}`
            }
            multiline
          />
          <Field
            label="Mantra Hint / Focus"
            value={currentFields.mantra}
            onChangeText={v => updateField('mantra', v)}
            placeholder={
              activeLang === 'en'
                ? 'e.g. Durga Mantra / Gayatri Mantra'
                : `Mantra name in ${activeLangOption?.nativeName}`
            }
          />

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>Schedule & Targets</Text>

          <Field
            label="Target Count"
            value={target}
            onChangeText={setTarget}
            placeholder="10000"
          />

          <View style={styles.field}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setShowEndPicker(false);
                setShowStartPicker(true);
              }}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.dateText,
                  !startDate ? styles.placeholder : null,
                ]}>
                {formatDisplayDate(startDate)}
              </Text>
            </TouchableOpacity>
            <DatePickerModal
              visible={showStartPicker}
              value={startDate || new Date()}
              onCancel={() => setShowStartPicker(false)}
              onConfirm={onStartChange}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setShowStartPicker(false);
                setShowEndPicker(true);
              }}
              activeOpacity={0.8}>
              <Text
                style={[styles.dateText, !endDate ? styles.placeholder : null]}>
                {formatDisplayDate(endDate)}
              </Text>
            </TouchableOpacity>
            <DatePickerModal
              visible={showEndPicker}
              value={endDate || startDate || new Date()}
              minimumDate={startDate || undefined}
              onCancel={() => setShowEndPicker(false)}
              onConfirm={onEndChange}
            />
          </View>

          <PrimaryButton
            title={
              saving
                ? isEdit
                  ? 'SAVING...'
                  : 'CREATING...'
                : isEdit
                  ? 'SAVE CHANGES'
                  : 'CREATE CHALLENGE'
            }
            onPress={save}
            disabled={saving || loading}
          />
        </>
      )}
    </AdminScreenLayout>
  );
};

export default AdminChallengeCreateScreen;

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
    justifyContent: 'center',
  },
  inputMultiline: {
    minHeight: 80,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  placeholder: {
    color: Colors.placeholder,
  },
});
