import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import DatePickerModal from '../common/DatePickerModal';
import apiService, {getApiError} from '../../services/apiService';
import {autoTranslateFields} from '../../services/translationService';
import {pickAudioFile, pickFeedbackVideo} from '../../services/mediaPick';
import {pickProfilePhoto, resolveMediaUrl} from '../../services/profilePhoto';
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
  description: string;
}

const emptyFields = (): BannerLangFields => ({
  title: '',
  subtitle: '',
  description: '',
});

/**
 * Default title of a new banner. `{date}` becomes the banner's upload date
 * (India time) when users see it. Written out per language so the date
 * placeholder is never garbled by machine translation.
 */
const DEFAULT_TITLES: Record<AdminSupportedLang, string> = {
  en: 'Click to see {date} Homam videos and photos',
  te: '{date} హోమం వీడియోలు మరియు ఫోటోలు చూడటానికి క్లిక్ చేయండి',
  hi: '{date} के होम के वीडियो और फोटो देखने के लिए क्लिक करें',
  ta: '{date} ஹோமம் வீடியோக்கள் மற்றும் புகைப்படங்களைக் காண கிளிக் செய்யவும்',
  kn: '{date} ಹೋಮದ ವೀಡಿಯೊಗಳು ಮತ್ತು ಫೋಟೋಗಳನ್ನು ನೋಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
};

const newBannerTranslations = (): Record<
  AdminSupportedLang,
  BannerLangFields
> => ({
  en: {...emptyFields(), title: DEFAULT_TITLES.en},
  te: {...emptyFields(), title: DEFAULT_TITLES.te},
  hi: {...emptyFields(), title: DEFAULT_TITLES.hi},
  ta: {...emptyFields(), title: DEFAULT_TITLES.ta},
  kn: {...emptyFields(), title: DEFAULT_TITLES.kn},
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

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** The numbers on the picker are saved as India Standard Time. */
const toIstIso = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}T${hour}:${minute}:00+05:30`;
};

const formatIstLabel = (iso?: string) => {
  const match = String(iso || '').match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );
  if (!match) {
    return '';
  }
  const hour = Number(match[4]);
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}, ${hour12}:${match[5]} ${ampm} IST`;
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
  const insets = useSafeAreaInsets();
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [activeLang, setActiveLang] = useState<AdminSupportedLang>('en');
  const [translations, setTranslations] = useState(defaultTranslations);
  const [moduleName, setModuleName] = useState('Home');
  const [saving, setSaving] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => new Date());
  const [expireOn, setExpireOn] = useState(false);
  const [expireAt, setExpireAt] = useState(() => new Date());
  const [fieldPicker, setFieldPicker] = useState<
    'schedule-date' | 'schedule-time' | 'expire-date' | 'expire-time' | null
  >(null);
  const [translating, setTranslating] = useState(false);
  const [lastAutoTranslatedAt, setLastAutoTranslatedAt] = useState<number | null>(
    null,
  );

  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const uploading = uploadingImage || uploadingVideo || uploadingAudio;

  const latestEnRef = useRef({title: '', subtitle: '', description: ''});
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
          subtitle: row.subtitle || '',
          module: row.module || 'Home',
          status:
            row.status === 'Scheduled' || row.status === 'Blocked'
              ? row.status
              : 'Active',
          startsAt: String(row.startsAt || ''),
          expiresAt: String(row.expiresAt || ''),
          description: String(row.description || ''),
          imageUrl: String(row.imageUrl || ''),
          videoUrl: String(row.videoUrl || ''),
          audioUrl: String(row.audioUrl || ''),
          linkUrl: String(row.linkUrl || ''),
          translations:
            row.translations && typeof row.translations === 'object'
              ? row.translations
              : undefined,
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
  const enDescription = translations.en.description;

  useEffect(() => {
    const trimmedTitle = enTitle.trim();
    const trimmedSubtitle = enSubtitle.trim();
    const trimmedDescription = enDescription.trim();
    if (
      trimmedTitle === latestEnRef.current.title &&
      trimmedSubtitle === latestEnRef.current.subtitle &&
      trimmedDescription === latestEnRef.current.description
    ) {
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!trimmedTitle && !trimmedSubtitle && !trimmedDescription) {
      return;
    }
    debounceTimerRef.current = setTimeout(async () => {
      latestEnRef.current = {
        title: trimmedTitle,
        subtitle: trimmedSubtitle,
        description: trimmedDescription,
      };
      setTranslating(true);
      try {
        const targetCodes = ADMIN_LANGUAGES.filter(l => l.code !== 'en').map(
          l => l.code,
        );
        // The default title already has hand-written translations. For any
        // other title, translate the text around `{date}` piece by piece so
        // the placeholder itself is never translated.
        const isDefaultTitle = trimmedTitle === DEFAULT_TITLES.en;
        const titleParts = trimmedTitle.split(/\{date\}/i);
        const fields: Record<string, string> = {
          subtitle: trimmedSubtitle,
          description: trimmedDescription,
        };
        if (!isDefaultTitle) {
          titleParts.forEach((part, index) => {
            fields[`title_${index}`] = part.trim();
          });
        }
        const translatedMap = await autoTranslateFields(fields, targetCodes);
        const buildTitle = (code: string) => {
          if (isDefaultTitle) {
            return DEFAULT_TITLES[code as AdminSupportedLang] || trimmedTitle;
          }
          const pieces: string[] = [];
          titleParts.forEach((_part, index) => {
            const piece = translatedMap[code]?.[`title_${index}`] || '';
            if (piece) {
              pieces.push(piece);
            }
            if (index < titleParts.length - 1) {
              pieces.push('{date}');
            }
          });
          return pieces.join(' ');
        };
        setTranslations(prev => {
          const next = {...prev};
          targetCodes.forEach(code => {
            if (translatedMap[code]) {
              next[code as AdminSupportedLang] = {
                title: buildTitle(code),
                subtitle: translatedMap[code].subtitle || '',
                description: translatedMap[code].description || '',
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
  }, [enTitle, enSubtitle, enDescription]);

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
        description: prev[activeLang].description || en.description,
      },
    }));
  };

  const clearMedia = () => {
    setImageUrl('');
    setVideoUrl('');
    setAudioUrl('');
    setLinkUrl('');
  };

  const pickAndUploadImage = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Banner photo',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (!picked?.uri) {
        return;
      }
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', {
        uri: picked.uri,
        type: picked.type || 'image/jpeg',
        name: picked.fileName || 'banner.jpg',
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
      if (String(err?.message || '') === 'native_module_missing') {
        Alert.alert(
          'Photo picker unavailable',
          'Rebuild the app so the image picker native module is linked.',
        );
        return;
      }
      Alert.alert('Upload failed', getApiError(err, 'Could not upload photo.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const pickAndUploadVideo = async () => {
    try {
      const picked = await pickFeedbackVideo();
      if (!picked?.uri) {
        return;
      }
      setUploadingVideo(true);
      const formData = new FormData();
      formData.append('video', {
        uri: picked.uri,
        type: picked.type || 'video/mp4',
        name: picked.fileName || 'banner.mp4',
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
      if (String(err?.message || '') === 'native_module_missing') {
        Alert.alert(
          'Video picker unavailable',
          'Rebuild the app so the media picker native module is linked.',
        );
        return;
      }
      if (String(err?.message || '') === 'permission') {
        Alert.alert(
          'Permission needed',
          'Please allow gallery access to attach a video.',
        );
        return;
      }
      Alert.alert('Upload failed', getApiError(err, 'Could not upload video.'));
    } finally {
      setUploadingVideo(false);
    }
  };

  const pickAndUploadAudio = async () => {
    try {
      const picked = await pickAudioFile();
      if (!picked?.uri) {
        return;
      }
      setUploadingAudio(true);
      const formData = new FormData();
      formData.append('audio', {
        uri: picked.uri,
        type: picked.type || 'audio/mpeg',
        name: picked.fileName || 'banner.mp3',
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
      Alert.alert('Upload failed', getApiError(err, 'Could not upload audio.'));
    } finally {
      setUploadingAudio(false);
    }
  };

  const resetForm = () => {
    setTranslations(defaultTranslations());
    latestEnRef.current = {title: '', subtitle: '', description: ''};
    clearMedia();
    setLastAutoTranslatedAt(null);
    setModuleName('Home');
    setScheduleOn(false);
    setScheduleAt(new Date());
    setExpireOn(false);
    setExpireAt(new Date());
    setFieldPicker(null);
    setActiveLang('en');
    setEditingId('');
    setShowForm(false);
  };

  const parseStartsAt = (raw?: string) => {
    const match = String(raw || '').match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
    );
    if (!match) {
      return new Date();
    }
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      0,
      0,
    );
  };

  const startEdit = (item: AdminBanner) => {
    const next = defaultTranslations();
    const pack = item.translations || {};
    ADMIN_LANGUAGES.forEach(lang => {
      const fields = pack[lang.code] || {};
      next[lang.code] = {
        title:
          String(fields.title || (lang.code === 'en' ? item.title : '') || '').trim(),
        subtitle: String(
          fields.subtitle || (lang.code === 'en' ? item.subtitle : '') || '',
        ).trim(),
        description: String(
          fields.description ||
            (lang.code === 'en' ? item.description : '') ||
            '',
        ).trim(),
      };
    });
    if (!next.en.title.trim()) {
      next.en.title = item.title || '';
    }
    if (!next.en.subtitle.trim()) {
      next.en.subtitle = item.subtitle || '';
    }
    setTranslations(next);
    latestEnRef.current = {
      title: next.en.title.trim(),
      subtitle: next.en.subtitle.trim(),
      description: next.en.description.trim(),
    };
    setImageUrl(item.imageUrl || '');
    setVideoUrl(item.videoUrl || '');
    setAudioUrl(item.audioUrl || '');
    setLinkUrl(item.linkUrl || '');
    setModuleName(item.module || 'Home');
    const scheduled = item.status === 'Scheduled' || Boolean(item.startsAt);
    setScheduleOn(scheduled);
    setScheduleAt(parseStartsAt(item.startsAt));
    const hasExpiry = Boolean(String(item.expiresAt || '').trim());
    setExpireOn(hasExpiry);
    setExpireAt(hasExpiry ? parseStartsAt(item.expiresAt) : new Date());
    setFieldPicker(null);
    setActiveLang('en');
    setLastAutoTranslatedAt(null);
    setEditingId(item.id);
    setShowForm(true);
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

  const saveBanner = async () => {
    const primaryTitle =
      translations.en.title.trim() || translations[activeLang].title.trim();
    if (!primaryTitle) {
      Alert.alert('Required', 'Enter at least an English banner title.');
      return;
    }
    if (expireOn && scheduleOn && expireAt.getTime() <= scheduleAt.getTime()) {
      Alert.alert(
        'Invalid expiry',
        'Expire time must be after the schedule start time.',
      );
      return;
    }
    if (expireOn && !scheduleOn && expireAt.getTime() <= Date.now()) {
      Alert.alert(
        'Invalid expiry',
        'Expire time must be in the future.',
      );
      return;
    }
    const existing = banners.find(row => row.id === editingId);
    let link = linkUrl.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      link = `https://${link}`;
    }
    const payload = {
      title: primaryTitle,
      subtitle:
        translations.en.subtitle.trim() ||
        translations[activeLang].subtitle.trim(),
      description:
        translations.en.description.trim() ||
        translations[activeLang].description.trim(),
      imageUrl,
      videoUrl,
      audioUrl,
      linkUrl: link,
      module: moduleName,
      status: scheduleOn
        ? 'Scheduled'
        : existing?.status === 'Blocked'
          ? 'Blocked'
          : 'Active',
      startsAt: scheduleOn ? toIstIso(scheduleAt) : '',
      expiresAt: expireOn ? toIstIso(expireAt) : '',
      translations,
    };
    setSaving(true);
    try {
      if (editingId) {
        await apiService.put(`/admin/banners/${editingId}`, payload);
      } else {
        await apiService.post('/admin/banners', payload);
      }
      resetForm();
      await load();
    } catch (err) {
      Alert.alert(
        editingId ? 'Update failed' : 'Create failed',
        getApiError(
          err,
          editingId ? 'Could not update banner.' : 'Could not create banner.',
        ),
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
              <Text style={styles.meta}>
                {item.module}
                {item.startsAt ? ` · starts ${formatIstLabel(item.startsAt)}` : ''}
                {item.expiresAt
                  ? ` · ends ${formatIstLabel(item.expiresAt)}`
                  : ''}
              </Text>
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
                style={styles.editBtn}
                onPress={() => startEdit(item)}
                disabled={busy || saving}>
                <Text style={styles.editText}>Edit</Text>
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

      <PrimaryButton
        title="ADD BANNER"
        onPress={() => {
          setEditingId('');
          // New banners start with the default "{date}" title.
          setTranslations(newBannerTranslations());
          latestEnRef.current = {
            title: DEFAULT_TITLES.en,
            subtitle: '',
            description: '',
          };
          clearMedia();
          setShowForm(true);
        }}
      />

      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={resetForm}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                paddingTop: Math.max(insets.top, 12),
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit banner' : 'New banner'}
              </Text>

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
              <Text style={styles.hint}>
                {'{date}'} becomes the date this banner was uploaded (for
                example 28 Nov 2026). Change the title any time; keep {'{date}'}
                if you want the date shown.
              </Text>
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

              <Text style={styles.sectionHeading}>
                Details (shown when users tap the banner)
              </Text>
              <Text style={styles.hint}>
                Everything below is optional. Users see only what you add.
              </Text>
              <Text style={styles.label}>
                Description ({activeLangOption?.nativeName || 'Description'})
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={currentFields.description}
                onChangeText={v => updateField('description', v)}
                multiline
                textAlignVertical="top"
                placeholder={
                  activeLang === 'en'
                    ? 'Description (optional)'
                    : `Description in ${activeLangOption?.nativeName}`
                }
                placeholderTextColor={Colors.placeholder}
              />

              <Text style={styles.label}>Photo, video and audio</Text>
              {imageUrl ? (
                <Image
                  source={{uri: resolveMediaUrl(imageUrl) || undefined}}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : null}
              {imageUrl ? (
                <Text style={styles.attached}>Photo attached ✓</Text>
              ) : null}
              {videoUrl ? (
                <Text style={styles.attached}>Video attached ✓</Text>
              ) : null}
              {audioUrl ? (
                <Text style={styles.attached}>Audio attached ✓</Text>
              ) : null}
              <View style={styles.mediaRow}>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => void pickAndUploadImage()}
                  disabled={uploading || saving}>
                  <Text style={styles.mediaBtnText}>
                    {uploadingImage
                      ? 'UPLOADING...'
                      : imageUrl
                        ? 'CHANGE PHOTO'
                        : 'UPLOAD PHOTO'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => void pickAndUploadVideo()}
                  disabled={uploading || saving}>
                  <Text style={styles.mediaBtnText}>
                    {uploadingVideo
                      ? 'UPLOADING...'
                      : videoUrl
                        ? 'CHANGE VIDEO'
                        : 'UPLOAD VIDEO'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => void pickAndUploadAudio()}
                  disabled={uploading || saving}>
                  <Text style={styles.mediaBtnText}>
                    {uploadingAudio
                      ? 'UPLOADING...'
                      : audioUrl
                        ? 'CHANGE AUDIO'
                        : 'UPLOAD AUDIO'}
                  </Text>
                </TouchableOpacity>
              </View>
              {imageUrl || videoUrl || audioUrl ? (
                <View style={styles.mediaRow}>
                  {imageUrl ? (
                    <TouchableOpacity
                      style={styles.mediaClearBtn}
                      onPress={() => setImageUrl('')}
                      disabled={uploading || saving}>
                      <Text style={styles.mediaClearText}>REMOVE PHOTO</Text>
                    </TouchableOpacity>
                  ) : null}
                  {videoUrl ? (
                    <TouchableOpacity
                      style={styles.mediaClearBtn}
                      onPress={() => setVideoUrl('')}
                      disabled={uploading || saving}>
                      <Text style={styles.mediaClearText}>REMOVE VIDEO</Text>
                    </TouchableOpacity>
                  ) : null}
                  {audioUrl ? (
                    <TouchableOpacity
                      style={styles.mediaClearBtn}
                      onPress={() => setAudioUrl('')}
                      disabled={uploading || saving}>
                      <Text style={styles.mediaClearText}>REMOVE AUDIO</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.label}>Link</Text>
              <TextInput
                style={styles.input}
                value={linkUrl}
                onChangeText={setLinkUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://example.com (optional)"
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
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.label}>Schedule (IST)</Text>
              <TouchableOpacity
                style={[styles.chip, scheduleOn && styles.chipActive]}
                onPress={() => setScheduleOn(value => !value)}>
                <Text
                  style={[
                    styles.chipText,
                    scheduleOn && styles.chipTextActive,
                  ]}>
                  {scheduleOn ? 'Scheduled' : 'Show now'}
                </Text>
              </TouchableOpacity>
              {scheduleOn ? (
                <View style={styles.scheduleRow}>
                  <TouchableOpacity
                    style={styles.scheduleBtn}
                    onPress={() => setFieldPicker('schedule-date')}>
                    <Text style={styles.scheduleText}>
                      {scheduleAt.toLocaleDateString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.scheduleBtn}
                    onPress={() => setFieldPicker('schedule-time')}>
                    <Text style={styles.scheduleText}>
                      {scheduleAt.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {scheduleOn ? (
                <Text style={styles.scheduleHint}>
                  Users see this banner at {formatIstLabel(toIstIso(scheduleAt))}.
                </Text>
              ) : null}
              <Text style={styles.label}>Expire time (IST)</Text>
              <TouchableOpacity
                style={[styles.chip, expireOn && styles.chipActive]}
                onPress={() => setExpireOn(value => !value)}>
                <Text
                  style={[
                    styles.chipText,
                    expireOn && styles.chipTextActive,
                  ]}>
                  {expireOn ? 'Auto-remove on' : 'No expiry'}
                </Text>
              </TouchableOpacity>
              {expireOn ? (
                <View style={styles.scheduleRow}>
                  <TouchableOpacity
                    style={styles.scheduleBtn}
                    onPress={() => setFieldPicker('expire-date')}>
                    <Text style={styles.scheduleText}>
                      {expireAt.toLocaleDateString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.scheduleBtn}
                    onPress={() => setFieldPicker('expire-time')}>
                    <Text style={styles.scheduleText}>
                      {expireAt.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {expireOn ? (
                <Text style={styles.scheduleHint}>
                  Hidden from Home after {formatIstLabel(toIstIso(expireAt))}.
                </Text>
              ) : null}
              <PrimaryButton
                title={
                  saving
                    ? 'SAVING...'
                    : editingId
                      ? 'UPDATE BANNER'
                      : 'SAVE BANNER'
                }
                onPress={saveBanner}
                disabled={saving || translating || uploading}
              />
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        <DatePickerModal
          visible={fieldPicker != null}
          mode={
            fieldPicker === 'schedule-time' || fieldPicker === 'expire-time'
              ? 'time'
              : 'date'
          }
          value={
            fieldPicker === 'expire-date' || fieldPicker === 'expire-time'
              ? expireAt
              : scheduleAt
          }
          minimumDate={
            fieldPicker === 'schedule-date' || fieldPicker === 'expire-date'
              ? new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  new Date().getDate(),
                )
              : undefined
          }
          onCancel={() => setFieldPicker(null)}
          onConfirm={selected => {
            const apply = (prev: Date) => {
              const next = new Date(prev);
              if (
                fieldPicker === 'schedule-time' ||
                fieldPicker === 'expire-time'
              ) {
                next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
              } else {
                next.setFullYear(
                  selected.getFullYear(),
                  selected.getMonth(),
                  selected.getDate(),
                );
              }
              return next;
            };
            if (
              fieldPicker === 'expire-date' ||
              fieldPicker === 'expire-time'
            ) {
              setExpireAt(apply);
            } else {
              setScheduleAt(apply);
            }
            setFieldPicker(null);
          }}
        />
      </Modal>
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
  editBtn: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 92,
    alignItems: 'center',
  },
  editText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.sacredBrown,
  },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    minHeight: '70%',
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  scheduleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  scheduleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    backgroundColor: Colors.white,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  scheduleText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  scheduleHint: {
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
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
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 12,
  },
  sectionHeading: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
    marginTop: 6,
    marginBottom: 4,
  },
  inputMultiline: {
    height: 110,
    paddingTop: 12,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: Colors.background,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  attached: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 6,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  mediaBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingVertical: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  mediaBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  mediaClearBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  mediaClearText: {
    color: Colors.error,
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
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
