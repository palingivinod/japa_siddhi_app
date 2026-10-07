import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import {autoTranslateFields} from '../../services/translationService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminBanner, AdminBannerStatus} from './adminData';
import AdminLanguageTabs, {
  ADMIN_LANGUAGES,
  AdminSupportedLang,
} from './components/AdminLanguageTabs';

const MODULES = ['Home', 'Challenges', 'Annadanam', 'Japa', 'Donate'];

interface BannerLangFields {
  title: string;
  subtitle: string;
}

const emptyFields = (): BannerLangFields => ({
  title: '',
  subtitle: '',
});

const defaultTranslations = (): Record<
  AdminSupportedLang,
  BannerLangFields
> => ({
  en: emptyFields(),
  te: emptyFields(),
  hi: emptyFields(),
  ta: emptyFields(),
  kn: emptyFields(),
});

const nextStatus = (status: AdminBannerStatus): AdminBannerStatus => {
  if (status === 'Active') {
    return 'Scheduled';
  }
  if (status === 'Scheduled') {
    return 'Blocked';
  }
  return 'Active';
};

const statusStyle = (status: AdminBannerStatus) => {
  if (status === 'Active') {
    return {border: Colors.leafGreen, text: Colors.leafGreen};
  }
  if (status === 'Scheduled') {
    return {border: Colors.templeGold, text: Colors.templeGold};
  }
  return {border: Colors.error, text: Colors.error};
};

const AdminBannersScreen = () => {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeLang, setActiveLang] = useState<AdminSupportedLang>('en');
  const [translations, setTranslations] = useState(defaultTranslations);
  const [moduleName, setModuleName] = useState('Home');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [lastAutoTranslatedAt, setLastAutoTranslatedAt] = useState<number | null>(
    null,
  );

  const latestEnRef = useRef({title: '', subtitle: ''});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/banners');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setBanners(
        rows.map((row: any) => ({
          id: String(row.id),
          title: row.title || '',
          module: row.module || 'Home',
          status:
            row.status === 'Scheduled' || row.status === 'Blocked'
              ? row.status
              : 'Active',
        })),
      );
    } catch (err) {
      setBanners([]);
      Alert.alert('Error', getApiError(err, 'Could not load banners.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const currentFields = translations[activeLang] || emptyFields();
  const enTitle = translations.en.title;
  const enSubtitle = translations.en.subtitle;

  useEffect(() => {
    const trimmedTitle = enTitle.trim();
    const trimmedSubtitle = enSubtitle.trim();
    if (
      trimmedTitle === latestEnRef.current.title &&
      trimmedSubtitle === latestEnRef.current.subtitle
    ) {
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!trimmedTitle && !trimmedSubtitle) {
      return;
    }
    debounceTimerRef.current = setTimeout(async () => {
      latestEnRef.current = {title: trimmedTitle, subtitle: trimmedSubtitle};
      setTranslating(true);
      try {
        const targetCodes = ADMIN_LANGUAGES.filter(l => l.code !== 'en').map(
          l => l.code,
        );
        const translatedMap = await autoTranslateFields(
          {title: trimmedTitle, subtitle: trimmedSubtitle},
          targetCodes,
        );
        setTranslations(prev => {
          const next = {...prev};
          targetCodes.forEach(code => {
            if (translatedMap[code]) {
              next[code as AdminSupportedLang] = {
                title: translatedMap[code].title || '',
                subtitle: translatedMap[code].subtitle || '',
              };
            }
          });
          return next;
        });
        setLastAutoTranslatedAt(Date.now());
      } catch {
        // ignore
      } finally {
        setTranslating(false);
      }
    }, 700);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enTitle, enSubtitle]);

  const completedMap = useMemo(() => {
    const map: Partial<Record<AdminSupportedLang, boolean>> = {};
    ADMIN_LANGUAGES.forEach(item => {
      const f = translations[item.code];
      map[item.code] = Boolean(f && f.title.trim().length > 0);
    });
    return map;
  }, [translations]);

  const updateField = (key: keyof BannerLangFields, val: string) => {
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        ...(prev[activeLang] || emptyFields()),
        [key]: val,
      },
    }));
  };

  const copyFromEnglish = () => {
    const en = translations.en;
    if (!en.title.trim()) {
      Alert.alert('Notice', 'Enter English banner title first.');
      return;
    }
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        title: prev[activeLang].title || en.title,
        subtitle: prev[activeLang].subtitle || en.subtitle,
      },
    }));
  };

  const resetForm = () => {
    setTranslations(defaultTranslations());
    latestEnRef.current = {title: '', subtitle: ''};
    setLastAutoTranslatedAt(null);
    setModuleName('Home');
    setActiveLang('en');
    setShowForm(false);
  };

  const cycle = async (item: AdminBanner) => {
    const status = nextStatus(item.status);
    setBusyId(item.id);
    try {
      await apiService.put(`/admin/banners/${item.id}`, {status});
      setBanners(prev =>
        prev.map(row => (row.id === item.id ? {...row, status} : row)),
      );
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update banner status.'),
      );
    } finally {
      setBusyId('');
    }
  };

  const remove = (item: AdminBanner) => {
    Alert.alert('Delete banner', `Remove "${item.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id);
          try {
            await apiService.delete(`/admin/banners/${item.id}`);
            setBanners(prev => prev.filter(row => row.id !== item.id));
          } catch (err) {
            Alert.alert(
              'Delete failed',
              getApiError(err, 'Could not delete banner.'),
            );
          } finally {
            setBusyId('');
          }
        },
      },
    ]);
  };

  const create = async () => {
    const primaryTitle =
      translations.en.title.trim() || translations[activeLang].title.trim();
    if (!primaryTitle) {
      Alert.alert('Required', 'Enter at least an English banner title.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/admin/banners', {
        title: primaryTitle,
        subtitle:
          translations.en.subtitle.trim() ||
          translations[activeLang].subtitle.trim(),
        module: moduleName,
        status: 'Active',
        translations,
      });
      resetForm();
      await load();
    } catch (err) {
      Alert.alert(
        'Create failed',
        getApiError(err, 'Could not create banner.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const activeLangOption = ADMIN_LANGUAGES.find(l => l.code === activeLang);

  return (
    <AdminScreenLayout title="Banner Management" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Banner Management</Text>
      <Text style={styles.sub}>
        Type in English, and it automatically translates into Telugu, Hindi,
        Tamil, and Kannada. Active Home banners appear on the user home screen.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && banners.length === 0 ? (
        <Text style={styles.empty}>No banners yet. Add one below.</Text>
      ) : null}

      {banners.map(item => {
        const tone = statusStyle(item.status);
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.module}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.pill, {borderColor: tone.border}]}
                onPress={() => cycle(item)}
                disabled={busy}>
                <Text style={[styles.pillText, {color: tone.text}]}>
                  {busy ? '...' : item.status}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => remove(item)}
                disabled={busy}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New banner</Text>

          <AdminLanguageTabs
            activeLang={activeLang}
            onSelectLang={setActiveLang}
            completedMap={completedMap}
            onCopyFromEnglish={copyFromEnglish}
          />

          <View style={styles.langHeaderCard}>
            <View style={styles.langHeaderTop}>
              <View style={styles.langHeaderCopy}>
                <Text style={styles.langHeaderTitle}>
                  {activeLang === 'en'
                    ? 'English (Primary)'
                    : `${activeLangOption?.nativeName} (${activeLangOption?.label})`}
                </Text>
                <Text style={styles.langHeaderHint}>
                  {activeLang === 'en'
                    ? 'Type here — automatically translates into all 4 other languages.'
                    : `Auto-translated from English. You can edit any words here before saving.`}
                </Text>
              </View>
              {translating ? (
                <View style={styles.translatingBadge}>
                  <ActivityIndicator size="small" color={Colors.leafGreen} />
                  <Text style={styles.translatingText}>Translating...</Text>
                </View>
              ) : lastAutoTranslatedAt ? (
                <View style={styles.translatedBadge}>
                  <Text style={styles.translatedText}>✓ Auto-translated</Text>
                </View>
              ) : null}
            </View>
          </View>

          <Text style={styles.label}>
            Title ({activeLangOption?.nativeName || 'Title'})
          </Text>
          <TextInput
            style={styles.input}
            value={currentFields.title}
            onChangeText={v => updateField('title', v)}
            placeholder={
              activeLang === 'en'
                ? 'Title'
                : `Title in ${activeLangOption?.nativeName}`
            }
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.label}>
            Subtitle ({activeLangOption?.nativeName || 'Subtitle'})
          </Text>
          <TextInput
            style={styles.input}
            value={currentFields.subtitle}
            onChangeText={v => updateField('subtitle', v)}
            placeholder={
              activeLang === 'en'
                ? 'Subtitle (optional)'
                : `Subtitle in ${activeLangOption?.nativeName}`
            }
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.label}>Module</Text>
          <View style={styles.moduleRow}>
            {MODULES.map(option => {
              const active = option === moduleName;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setModuleName(option)}>
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <PrimaryButton
            title={saving ? 'SAVING...' : 'SAVE BANNER'}
            onPress={create}
            disabled={saving || translating}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PrimaryButton title="ADD BANNER" onPress={() => setShowForm(true)} />
      )}
    </AdminScreenLayout>
  );
};

export default AdminBannersScreen;

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
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  empty: {color: Colors.textSecondary, marginBottom: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1, paddingRight: 8},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  actions: {alignItems: 'flex-end'},
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 92,
    alignItems: 'center',
  },
  pillText: {fontWeight: '800', fontSize: 13},
  deleteBtn: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 92,
    alignItems: 'center',
  },
  deleteText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.error,
  },
  form: {
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  formTitle: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 10,
    fontSize: 16,
  },
  langHeaderCard: {
    backgroundColor: '#F7FAF4',
    borderWidth: 1,
    borderColor: '#E2EBDC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  langHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langHeaderCopy: {
    flex: 1,
    marginRight: 8,
  },
  translatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F3E4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  translatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
    marginLeft: 6,
  },
  translatedBadge: {
    backgroundColor: '#EDF7E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  translatedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
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
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  moduleRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8},
  chip: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#E4EFDF',
  },
  chipText: {color: Colors.textSecondary, fontWeight: '700'},
  chipTextActive: {color: Colors.leafGreen},
  cancelBtn: {alignItems: 'center', marginTop: 10},
  cancelText: {color: Colors.textSecondary, fontWeight: '700'},
});
