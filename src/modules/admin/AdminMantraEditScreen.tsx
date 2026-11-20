import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import Colors from '../../theme/colors';
import {dismissKeyboardThen} from '../../utils/keyboard';
import PrimaryButton from '../common/PrimaryButton';
import DatePickerModal from '../common/DatePickerModal';
import apiService, {getApiError} from '../../services/apiService';
import {pickAudioFile, pickFeedbackVideo} from '../../services/mediaPick';
import {pickProfilePhoto} from '../../services/profilePhoto';
import {autoTranslateFields} from '../../services/translationService';
import AdminScreenLayout from './AdminScreenLayout';
import AdminLanguageTabs, {
  ADMIN_LANGUAGES,
  AdminSupportedLang,
} from './components/AdminLanguageTabs';
import {parseTranslationsMap} from '../../utils/localizedContent';
import {buildSamuhikaMantraWebLink} from '../../utils/samuhikaDeepLink';
import {
  MANTRA_CATEGORIES,
  isSamuhikaStyleList,
  mantraListLabel,
  normalizeMantraListParam,
} from '../japa/mantraCategories';

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

const pad = (n: number) => String(n).padStart(2, '0');

/** Store wall-clock as Asia/Kolkata so Render (UTC) compares correctly. */
const toStamp = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:00+05:30`;

const parseStamp = (value?: string | null): Date | null => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }
  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`;
  }
  const parsed = Date.parse(`${normalized}+05:30`);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatTimeLabel = (date: Date) =>
  date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

const defaultScheduleDate = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

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
  const routeMantraId = route.params?.mantraId
    ? String(route.params.mantraId)
    : '';
  const [savedMantraId, setSavedMantraId] = useState(routeMantraId);
  const mantraId = savedMantraId || routeMantraId;
  const isEdit = Boolean(routeMantraId);
  const japaList = normalizeMantraListParam(route.params?.japaList);
  const categoryCode = String(route.params?.categoryCode || '');
  const [shownList, setShownList] = useState(japaList);
  const samuhikaStyle = isSamuhikaStyleList(shownList);
  const [shownCategory, setShownCategory] = useState(categoryCode);
  const [shownCategoryName, setShownCategoryName] = useState(
    String(route.params?.categoryName || ''),
  );
  const categoryLabel =
    MANTRA_CATEGORIES.find(item => item.code === shownCategory)?.label ||
    shownCategoryName ||
    'Not in a category yet';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<AdminSupportedLang>('en');
  const [translations, setTranslations] = useState<
    Record<AdminSupportedLang, MantraLangFields>
  >(defaultTranslations);
  const [target, setTarget] = useState('');
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] = useState<
    null | 'start-date' | 'start-time' | 'deadline-date' | 'deadline-time'
  >(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<
    null | 'image' | 'video' | 'audio'
  >(null);
  const [active, setActive] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [lastAutoTranslatedAt, setLastAutoTranslatedAt] = useState<number | null>(
    null,
  );
  const latestEnRef = useRef({
    name: '',
    deity: '',
    sanskrit: '',
    transliteration: '',
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoTranslateRef = useRef(isEdit);

  const load = useCallback(async () => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.get(`/admin/mantras/${routeMantraId}`);
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
      latestEnRef.current = {
        name: nextTrans.en.name,
        deity: nextTrans.en.deity,
        sanskrit: nextTrans.en.sanskrit,
        transliteration: nextTrans.en.transliteration,
      };
      skipAutoTranslateRef.current = true;
      setTarget(Number(data.target) > 0 ? String(data.target) : '');
      setStartsAt(parseStamp(data.startsAt || data.startAt));
      setDeadlineAt(parseStamp(data.deadlineAt));
      setImageUrl(String(data.imageUrl || ''));
      setVideoUrl(String(data.videoUrl || ''));
      setAudioUrl(String(data.audioUrl || ''));
      setActive(Boolean(data.active));
      if (data.japaList) {
        setShownList(normalizeMantraListParam(data.japaList));
      }
      if (data.categoryCode) {
        setShownCategory(String(data.categoryCode));
      }
    } catch (err) {
      Alert.alert('Error', getApiError(err, 'Could not load mantra.'));
    } finally {
      setLoading(false);
    }
  }, [isEdit, routeMantraId]);

  useEffect(() => {
    if (routeMantraId) {
      setSavedMantraId(routeMantraId);
    }
  }, [routeMantraId]);

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

  const enName = translations.en.name;
  const enDeity = translations.en.deity;
  const enSanskrit = translations.en.sanskrit;
  const enTransliteration = translations.en.transliteration;

  useEffect(() => {
    const trimmed = {
      name: enName.trim(),
      deity: enDeity.trim(),
      sanskrit: enSanskrit.trim(),
      transliteration: enTransliteration.trim(),
    };
    if (
      trimmed.name === latestEnRef.current.name &&
      trimmed.deity === latestEnRef.current.deity &&
      trimmed.sanskrit === latestEnRef.current.sanskrit &&
      trimmed.transliteration === latestEnRef.current.transliteration
    ) {
      return;
    }
    if (skipAutoTranslateRef.current) {
      skipAutoTranslateRef.current = false;
      latestEnRef.current = trimmed;
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (
      !trimmed.name &&
      !trimmed.deity &&
      !trimmed.sanskrit &&
      !trimmed.transliteration
    ) {
      return;
    }
    debounceTimerRef.current = setTimeout(async () => {
      latestEnRef.current = trimmed;
      setTranslating(true);
      try {
        const targetCodes = ADMIN_LANGUAGES.filter(l => l.code !== 'en').map(
          l => l.code,
        );
        // Keep Sanskrit script identical across languages; translate the rest.
        const translatedMap = await autoTranslateFields(trimmed, targetCodes, {
          copyKeys: ['sanskrit'],
        });
        setTranslations(prev => {
          const next = {...prev};
          targetCodes.forEach(code => {
            if (translatedMap[code]) {
              next[code as AdminSupportedLang] = {
                name: translatedMap[code].name || '',
                deity: translatedMap[code].deity || '',
                sanskrit: translatedMap[code].sanskrit || trimmed.sanskrit,
                transliteration: translatedMap[code].transliteration || '',
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
  }, [enName, enDeity, enSanskrit, enTransliteration]);

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

  const uploadImage = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Mantra image',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (!picked?.uri) {
        return;
      }
      setUploadingKind('image');
      const formData = new FormData();
      formData.append('image', {
        uri: picked.uri,
        type: picked.type || 'image/jpeg',
        name: picked.fileName || 'mantra.jpg',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-image',
        formData,
      );
      const uploaded =
        response.data?.data?.imageUrl || response.data?.data?.path || '';
      if (!uploaded) {
        throw new Error('No image URL returned');
      }
      setImageUrl(String(uploaded));
    } catch (err: any) {
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload image.'),
      );
    } finally {
      setUploadingKind(null);
    }
  };

  const uploadVideo = async () => {
    try {
      const picked = await pickFeedbackVideo();
      if (!picked?.uri) {
        return;
      }
      setUploadingKind('video');
      const formData = new FormData();
      formData.append('video', {
        uri: picked.uri,
        type: picked.type || 'video/mp4',
        name: picked.fileName || 'mantra.mp4',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-video',
        formData,
      );
      const uploaded =
        response.data?.data?.videoUrl || response.data?.data?.path || '';
      if (!uploaded) {
        throw new Error('No video URL returned');
      }
      setVideoUrl(String(uploaded));
    } catch (err: any) {
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload video.'),
      );
    } finally {
      setUploadingKind(null);
    }
  };

  const uploadAudio = async () => {
    try {
      setUploadingKind('audio');
      const picked = await pickAudioFile();
      if (!picked?.uri) {
        return;
      }
      const formData = new FormData();
      formData.append('audio', {
        uri: picked.uri,
        type: picked.type || 'audio/mpeg',
        name: picked.fileName || 'mantra.mp3',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-audio',
        formData,
      );
      const uploaded =
        response.data?.data?.audioUrl || response.data?.data?.path || '';
      if (!uploaded) {
        throw new Error('No audio URL returned');
      }
      setAudioUrl(String(uploaded));
    } catch (err: any) {
      if (String(err?.message || '') === 'not_audio') {
        Alert.alert('Audio only', 'Please select an audio file (MP3, M4A, WAV).');
        return;
      }
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload audio.'),
      );
    } finally {
      setUploadingKind(null);
    }
  };

  const save = async () => {
    const primaryName =
      translations.en.name.trim() || translations[activeLang].name.trim();
    if (!primaryName) {
      Alert.alert('Required', 'Enter at least an English or primary Mantra Name.');
      return;
    }

    const parsedTarget = Number(String(target).replace(/,/g, ''));
    const targetNum = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 0;
    setSaving(true);
    try {
      if (!isEdit && !categoryCode) {
        Alert.alert('Required', 'Choose a category before adding the mantra.');
        setSaving(false);
        return;
      }
      if (startsAt && deadlineAt && deadlineAt.getTime() <= startsAt.getTime()) {
        Alert.alert(
          'Invalid schedule',
          'Deadline must be after the start schedule time.',
        );
        return;
      }
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
        imageUrl: imageUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        audioUrl: audioUrl.trim() || null,
        startsAt: startsAt ? toStamp(startsAt) : null,
        deadlineAt: deadlineAt ? toStamp(deadlineAt) : null,
        notifyUsers,
        ...(!isEdit ? {japaList, categoryCode} : {}),
      };
      let createdId = Number(mantraId) || 0;
      if (isEdit) {
        await apiService.put(`/admin/mantras/${mantraId}`, payload);
        createdId = Number(mantraId) || 0;
      } else {
        const created = await apiService.post('/admin/mantras', payload);
        createdId =
          Number(
            created.data?.data?.id ||
              created.data?.data?.mantraId ||
              created.data?.id ||
              0,
          ) || 0;
        if (createdId) {
          setSavedMantraId(String(createdId));
        }
      }
      const shareLink =
        isSamuhikaStyleList(shownList) && createdId
          ? buildSamuhikaMantraWebLink(createdId)
          : '';
      if (shareLink) {
        Alert.alert(
          'Saved',
          isEdit
            ? 'Mantra updated. Copy the share link to send to devotees.'
            : 'Mantra created. Copy the share link to send to devotees.',
          [
            {
              text: 'Copy link',
              onPress: () => {
                Clipboard.setString(shareLink);
                Alert.alert('Copied', shareLink, [
                  {text: 'OK', onPress: () => navigation.goBack()},
                ]);
              },
            },
            {text: 'OK', onPress: () => navigation.goBack()},
          ],
        );
      } else {
        Alert.alert(
          'Saved',
          isEdit
            ? 'Mantra and multilingual translations updated.'
            : 'Mantra created with multilingual translations.',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      }
    } catch (err) {
      Alert.alert('Save failed', getApiError(err, 'Could not save mantra.'));
    } finally {
      setSaving(false);
    }
  };

  const activeLangOption = ADMIN_LANGUAGES.find(l => l.code === activeLang);
  const samuhikaShareLink =
    samuhikaStyle && Number(mantraId) > 0
      ? buildSamuhikaMantraWebLink(mantraId)
      : '';

  const copySamuhikaLink = () => {
    if (!samuhikaShareLink) {
      return;
    }
    Clipboard.setString(samuhikaShareLink);
    Alert.alert(
      'Link copied',
      'Send this link to devotees. It opens Samuhika Japa with this mantra selected.',
    );
  };

  return (
    <AdminScreenLayout
      title={isEdit ? 'Edit Mantra' : 'Create Mantra'}
      tab="AdminJapa"
      showBack>
      <Text style={styles.placeLine}>
        {mantraListLabel(shownList)} · {categoryLabel}
      </Text>
      <Text style={styles.heading}>
        {isEdit ? 'Edit Mantra' : 'Create Mantra'}
      </Text>
      <Text style={styles.sub}>
        Type in English, and it automatically translates into Telugu, Hindi, Tamil,
        and Kannada. Sanskrit script is kept the same across languages.
      </Text>
      {samuhikaShareLink ? (
        <View style={styles.shareBox}>
          <Text style={styles.shareLabel}>Devotee share link</Text>
          <Text style={styles.shareLink} selectable>
            {samuhikaShareLink}
          </Text>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={copySamuhikaLink}
            activeOpacity={0.85}>
            <Text style={styles.shareBtnText}>COPY LINK</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
            placeholder="Optional — leave blank to hide on user screen"
          />

          <Text style={styles.label}>Start schedule (optional)</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() =>
                dismissKeyboardThen(() => {
                  if (!startsAt) {
                    setStartsAt(defaultScheduleDate());
                  }
                  setPickerTarget('start-date');
                })
              }>
              <Text style={styles.pickerLabel}>Date</Text>
              <Text style={styles.pickerValue}>
                {startsAt ? formatDateLabel(startsAt) : 'Pick date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() =>
                dismissKeyboardThen(() => {
                  if (!startsAt) {
                    setStartsAt(defaultScheduleDate());
                  }
                  setPickerTarget('start-time');
                })
              }>
              <Text style={styles.pickerLabel}>Time</Text>
              <Text style={styles.pickerValue}>
                {startsAt ? formatTimeLabel(startsAt) : 'Pick time'}
              </Text>
            </TouchableOpacity>
          </View>
          {startsAt ? (
            <TouchableOpacity onPress={() => setStartsAt(null)}>
              <Text style={styles.mediaHint}>Clear start schedule</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.label}>Deadline (optional)</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() =>
                dismissKeyboardThen(() => {
                  if (!deadlineAt) {
                    setDeadlineAt(defaultScheduleDate());
                  }
                  setPickerTarget('deadline-date');
                })
              }>
              <Text style={styles.pickerLabel}>Date</Text>
              <Text style={styles.pickerValue}>
                {deadlineAt ? formatDateLabel(deadlineAt) : 'Pick date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() =>
                dismissKeyboardThen(() => {
                  if (!deadlineAt) {
                    setDeadlineAt(defaultScheduleDate());
                  }
                  setPickerTarget('deadline-time');
                })
              }>
              <Text style={styles.pickerLabel}>Time</Text>
              <Text style={styles.pickerValue}>
                {deadlineAt ? formatTimeLabel(deadlineAt) : 'Pick time'}
              </Text>
            </TouchableOpacity>
          </View>
          {deadlineAt ? (
            <TouchableOpacity onPress={() => setDeadlineAt(null)}>
              <Text style={styles.mediaHint}>Clear deadline</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.label}>Media (optional)</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={styles.statusChip}
              disabled={Boolean(uploadingKind) || saving}
              onPress={() => void uploadImage()}>
              <Text style={styles.statusText}>
                {uploadingKind === 'image'
                  ? 'Uploading…'
                  : imageUrl
                    ? 'Photo ✓'
                    : 'Upload photo'}
              </Text>
            </TouchableOpacity>
            {imageUrl ? (
              <TouchableOpacity onPress={() => setImageUrl('')}>
                <Text style={styles.mediaHint}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={styles.statusChip}
              disabled={Boolean(uploadingKind) || saving}
              onPress={() => void uploadVideo()}>
              <Text style={styles.statusText}>
                {uploadingKind === 'video'
                  ? 'Uploading…'
                  : videoUrl
                    ? 'Video ✓'
                    : 'Upload video'}
              </Text>
            </TouchableOpacity>
            {videoUrl ? (
              <TouchableOpacity onPress={() => setVideoUrl('')}>
                <Text style={styles.mediaHint}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={styles.statusChip}
              disabled={Boolean(uploadingKind) || saving}
              onPress={() => void uploadAudio()}>
              <Text style={styles.statusText}>
                {uploadingKind === 'audio'
                  ? 'Uploading…'
                  : audioUrl
                    ? 'Audio ✓'
                    : 'Upload audio'}
              </Text>
            </TouchableOpacity>
            {audioUrl ? (
              <TouchableOpacity onPress={() => setAudioUrl('')}>
                <Text style={styles.mediaHint}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.label}>Notify users</Text>
          <View style={styles.statusRow}>
            {[true, false].map(option => {
              const on = option === notifyUsers;
              return (
                <TouchableOpacity
                  key={`notify-${String(option)}`}
                  style={[styles.statusChip, on && styles.statusChipOn]}
                  onPress={() => setNotifyUsers(option)}>
                  <Text style={[styles.statusText, on && styles.statusTextOn]}>
                    {on ? '✓ ' : ''}
                    {option ? 'Yes' : 'No (testing)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
                    {on ? '✓ ' : ''}
                    {option ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isEdit && samuhikaStyle ? (
            <View style={styles.actionBtnWrap}>
              <PrimaryButton
                title={
                  uploadingMedia
                    ? 'UPDATING DEADLINE...'
                    : 'EXTEND DEADLINE + NOTIFY'
                }
                onPress={async () => {
                  if (!deadlineAt) {
                    Alert.alert(
                      'Required',
                      'Pick a deadline date and time first.',
                    );
                    return;
                  }
                  setUploadingMedia(true);
                  try {
                    await apiService.put(`/admin/mantras/${mantraId}/deadline`, {
                      deadlineAt: toStamp(deadlineAt),
                      notifyUsers: true,
                    });
                    Alert.alert(
                      'Updated',
                      'Deadline extended and users notified.',
                    );
                  } catch (err) {
                    Alert.alert(
                      'Update failed',
                      getApiError(err, 'Could not extend deadline.'),
                    );
                  } finally {
                    setUploadingMedia(false);
                  }
                }}
                disabled={saving || uploadingMedia}
              />
            </View>
          ) : null}

          <View style={styles.actionBtnWrap}>
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
          </View>

          <DatePickerModal
            visible={
              pickerTarget === 'start-date' || pickerTarget === 'deadline-date'
            }
            value={
              (pickerTarget?.startsWith('start')
                ? startsAt
                : deadlineAt) || defaultScheduleDate()
            }
            mode="date"
            onCancel={() => setPickerTarget(null)}
            onConfirm={date => {
              if (pickerTarget?.startsWith('start')) {
                setStartsAt(prev => {
                  const next = new Date(prev || defaultScheduleDate());
                  next.setFullYear(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                  );
                  return next;
                });
              } else {
                setDeadlineAt(prev => {
                  const next = new Date(prev || defaultScheduleDate());
                  next.setFullYear(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                  );
                  return next;
                });
              }
              setPickerTarget(null);
            }}
          />
          <DatePickerModal
            visible={
              pickerTarget === 'start-time' || pickerTarget === 'deadline-time'
            }
            value={
              (pickerTarget?.startsWith('start')
                ? startsAt
                : deadlineAt) || defaultScheduleDate()
            }
            mode="time"
            onCancel={() => setPickerTarget(null)}
            onConfirm={date => {
              if (pickerTarget?.startsWith('start')) {
                setStartsAt(prev => {
                  const next = new Date(prev || defaultScheduleDate());
                  next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                  return next;
                });
              } else {
                setDeadlineAt(prev => {
                  const next = new Date(prev || defaultScheduleDate());
                  next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                  return next;
                });
              }
              setPickerTarget(null);
            }}
          />
        </>
      )}
    </AdminScreenLayout>
  );
};

export default AdminMantraEditScreen;

const styles = StyleSheet.create({
  placeLine: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 6,
  },
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
  shareBox: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  shareLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 6,
  },
  shareLink: {
    color: Colors.sacredBrown,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 10,
  },
  shareBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.templeGold,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shareBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
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
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 16,
  },
  mediaHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  actionBtnWrap: {
    marginTop: 14,
  },
  pickerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 8,
  },
  pickerLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
  },
  pickerValue: {
    color: Colors.sacredBrown,
    fontWeight: '800',
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
    borderWidth: 2,
    borderColor: '#D6C4A8',
    borderRadius: 22,
    minHeight: 48,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusChipOn: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
  },
  statusText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
  },
  statusTextOn: {
    color: Colors.white,
  },
});
