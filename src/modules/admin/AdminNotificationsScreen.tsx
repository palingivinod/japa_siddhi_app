import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {dismissKeyboardThen} from '../../utils/keyboard';
import PrimaryButton from '../common/PrimaryButton';
import DatePickerModal from '../common/DatePickerModal';
import apiService, {getApiError} from '../../services/apiService';
import {pickFeedbackVideo} from '../../services/mediaPick';
import {
  pickProfilePhoto,
  resolveMediaUrl,
} from '../../services/profilePhoto';
import AdminScreenLayout from './AdminScreenLayout';
import AdminLanguageTabs, {
  ADMIN_LANGUAGES,
  AdminSupportedLang,
} from './components/AdminLanguageTabs';
import {
  autoTranslateNotification,
  translateText,
} from '../../services/translationService';

type SelectedNotifyUser = {
  id: string;
  name: string;
  userCode?: string;
  mobile?: string;
  email?: string;
};

interface NotificationLangFields {
  title: string;
  message: string;
}

const emptyFields = (): NotificationLangFields => ({
  title: '',
  message: '',
});

const defaultTranslations = (): Record<
  AdminSupportedLang,
  NotificationLangFields
> => ({
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

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.selectRow}>
      {options.map(option => {
        const active = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const pad = (n: number) => String(n).padStart(2, '0');

/** Local wall-clock string the backend stores on the schedule queue. */
const toScheduleStamp = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:00`;

const defaultLater = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
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

const AdminNotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activeLang, setActiveLang] = useState<AdminSupportedLang>('en');
  const [translations, setTranslations] = useState<
    Record<AdminSupportedLang, NotificationLangFields>
  >(defaultTranslations);

  const [selectedUsers, setSelectedUsers] = useState<SelectedNotifyUser[]>(
    () =>
      Array.isArray(route.params?.selectedUsers)
        ? route.params.selectedUsers
        : [],
  );
  const selectedMode = selectedUsers.length > 0;

  const [target, setTarget] = useState('All users');
  const [testQuery, setTestQuery] = useState('');
  const [schedule, setSchedule] = useState('Now');
  const [scheduledAt, setScheduledAt] = useState(defaultLater);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [lastAutoTranslatedAt, setLastAutoTranslatedAt] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [rewards, setRewards] = useState<
    Array<{id: string; name: string; imageUrl?: string | null}>
  >([]);

  useEffect(() => {
    const incoming = Array.isArray(route.params?.selectedUsers)
      ? route.params.selectedUsers
      : [];
    setSelectedUsers(incoming);
  }, [route.params?.selectedUsers]);

  const latestEnRef = useRef({title: '', message: ''});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiService.get('/admin/rewards');
        const rows = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        if (cancelled) {
          return;
        }
        setRewards(
          rows
            .map((row: any) => ({
              id: String(row.id),
              name: String(row.name || ''),
              imageUrl: row.imageUrl || null,
            }))
            .filter((row: {imageUrl?: string | null}) => Boolean(row.imageUrl)),
        );
      } catch {
        if (!cancelled) {
          setRewards([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pickAndUploadImage = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Notification media',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (!picked?.uri) {
        return;
      }
      setLocalPreview(picked.uri);
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', {
        uri: picked.uri,
        type: picked.type || 'image/jpeg',
        name: picked.fileName || 'notification.jpg',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-image',
        formData,
      );
      const uploaded =
        response.data?.data?.imageUrl || response.data?.data?.path || null;
      if (!uploaded) {
        throw new Error('No image URL returned');
      }
      setVideoUrl(null);
      setImageUrl(String(uploaded));
    } catch (err: any) {
      setLocalPreview(null);
      setImageUrl(null);
      if (String(err?.message || '') === 'native_module_missing') {
        Alert.alert(
          'Photo picker unavailable',
          'Rebuild the app so the image picker native module is linked.',
        );
        return;
      }
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload notification photo.'),
      );
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
        name: picked.fileName || 'notification.mp4',
      } as any);
      const response = await apiService.post(
        '/admin/notifications/upload-video',
        formData,
      );
      const uploaded =
        response.data?.data?.videoUrl || response.data?.data?.path || null;
      if (!uploaded) {
        throw new Error('No video URL returned');
      }
      setImageUrl(null);
      setLocalPreview(null);
      setVideoUrl(String(uploaded));
    } catch (err: any) {
      setVideoUrl(null);
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
          'Please allow camera or gallery access to attach a video.',
        );
        return;
      }
      Alert.alert(
        'Upload failed',
        getApiError(err, 'Could not upload notification video.'),
      );
    } finally {
      setUploadingVideo(false);
    }
  };

  const clearMedia = () => {
    setImageUrl(null);
    setLocalPreview(null);
    setVideoUrl(null);
  };

  const selectedUserIds = useMemo(
    () =>
      selectedUsers
        .map(user => Number(user.id))
        .filter(id => Number.isFinite(id) && id > 0),
    [selectedUsers],
  );

  const currentFields = translations[activeLang] || emptyFields();

  const updateField = (key: keyof NotificationLangFields, val: string) => {
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        ...(prev[activeLang] || emptyFields()),
        [key]: val,
      },
    }));
  };

  // Automatic translation effect when English title or message changes
  const enTitle = translations.en.title;
  const enMessage = translations.en.message;

  useEffect(() => {
    const trimmedTitle = enTitle.trim();
    const trimmedMsg = enMessage.trim();

    // Check if the English content has actually changed from what we last translated
    if (
      trimmedTitle === latestEnRef.current.title &&
      trimmedMsg === latestEnRef.current.message
    ) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmedTitle && !trimmedMsg) {
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      latestEnRef.current = {title: trimmedTitle, message: trimmedMsg};
      setTranslating(true);
      try {
        const targetCodes = ADMIN_LANGUAGES.filter(l => l.code !== 'en').map(
          l => l.code,
        );
        const translatedMap = await autoTranslateNotification(
          trimmedTitle,
          trimmedMsg,
          targetCodes,
        );
        setTranslations(prev => {
          const next = {...prev};
          targetCodes.forEach(code => {
            if (translatedMap[code]) {
              next[code as AdminSupportedLang] = {
                title: translatedMap[code].title,
                message: translatedMap[code].message,
              };
            }
          });
          return next;
        });
        setLastAutoTranslatedAt(Date.now());
      } catch {
        // Translation network failure handled gracefully in background
      } finally {
        setTranslating(false);
      }
    }, 700);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enTitle, enMessage]);

  const completedMap = useMemo(() => {
    const map: Partial<Record<AdminSupportedLang, boolean>> = {};
    ADMIN_LANGUAGES.forEach(item => {
      const f = translations[item.code];
      map[item.code] = Boolean(
        f && f.title.trim().length > 0 && f.message.trim().length > 0,
      );
    });
    return map;
  }, [translations]);

  const copyFromEnglish = () => {
    const en = translations.en;
    if (!en.title.trim() && !en.message.trim()) {
      Alert.alert('Notice', 'Enter English notification title and message first.');
      return;
    }
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        title: prev[activeLang].title || en.title,
        message: prev[activeLang].message || en.message,
      },
    }));
  };

  const send = async () => {
    const primaryTitle =
      translations.en.title.trim() || translations[activeLang].title.trim();
    const primaryMessage =
      translations.en.message.trim() || translations[activeLang].message.trim();

    if (!primaryTitle || !primaryMessage) {
      Alert.alert(
        'Required',
        'Enter at least an English or primary notification title and message.',
      );
      return;
    }
    if (schedule === 'Later' && scheduledAt.getTime() <= Date.now() + 60_000) {
      Alert.alert('Schedule', 'Pick a date and time at least one minute from now.');
      return;
    }
    if (selectedMode && !selectedUserIds.length) {
      Alert.alert(
        'No users selected',
        'Go back to User Management and select users again.',
      );
      return;
    }
    if (!selectedMode && target === 'Test' && !testQuery.trim()) {
      Alert.alert(
        'Test person required',
        'Enter a name, user id, phone, or email. The notification will only go to that person.',
      );
      return;
    }
    setSending(true);
    try {
      let extractedLink =
        linkUrl.trim() ||
        String(primaryMessage).match(/(?:https?:\/\/|www\.)[^\s]+/i)?.[0] ||
        undefined;
      if (extractedLink) {
        while (/[.,!?);:\]\>]$/.test(extractedLink)) {
          extractedLink = extractedLink.slice(0, -1);
        }
        if (/^www\./i.test(extractedLink)) {
          extractedLink = `https://${extractedLink}`;
        }
      }

      const response = await apiService.post('/admin/notifications/send', {
        title: primaryTitle,
        message: primaryMessage,
        translations,
        target: selectedMode ? 'Selected users' : target,
        userIds: selectedMode ? selectedUserIds : undefined,
        testQuery:
          !selectedMode && target === 'Test' ? testQuery.trim() : undefined,
        schedule,
        scheduledAt:
          schedule === 'Later' ? toScheduleStamp(scheduledAt) : undefined,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        url: extractedLink || undefined,
        link: extractedLink || undefined,
        linkUrl: extractedLink || undefined,
        extraData: extractedLink
          ? {url: extractedLink, link: extractedLink}
          : undefined,
      });
      const data = response.data?.data || {};
      const detail =
        response.data?.message ||
        (data.mode === 'scheduled'
          ? `Scheduled for ${data.sendAt}`
          : `Delivered to ${data.recipientCount || 0} users`);
      const pushLine =
        data.mode === 'scheduled'
          ? ''
          : `\nPush popups: ${Number(data.pushSent || 0)}` +
            (data.pushSkipped ? `\nPush note: ${data.pushSkipped}` : '');
      const toLine = selectedMode
        ? `${selectedUserIds.length} selected user(s)`
        : target === 'Test'
          ? `Test → ${data.testUser || testQuery.trim()}`
          : target;
      const mediaLine = imageUrl
        ? '\nPhoto: included in popup'
        : videoUrl
          ? '\nVideo: included in popup'
          : '';
      Alert.alert(
        data.mode === 'scheduled' ? 'Notification scheduled' : 'Notification sent',
        `${detail}${pushLine}\n\nTo: ${toLine}\nWhen: ${
          schedule === 'Later'
            ? `${formatDateLabel(scheduledAt)} ${formatTimeLabel(scheduledAt)} (IST)`
            : 'Now'
        }${mediaLine}\n\nDevotees will receive this in their preferred language.`,
      );
      setTranslations(defaultTranslations());
      latestEnRef.current = {title: '', message: ''};
      setLastAutoTranslatedAt(null);
      setTestQuery('');
      setSchedule('Now');
      setScheduledAt(defaultLater());
      setLinkUrl('');
      clearMedia();
      if (selectedMode) {
        setSelectedUsers([]);
        navigation.setParams?.({selectedUsers: undefined});
        navigation.navigate('AdminUsers');
      }
    } catch (err) {
      Alert.alert(
        'Send failed',
        getApiError(err, 'Could not send notification.'),
      );
    } finally {
      setSending(false);
    }
  };

  const activeLangOption = ADMIN_LANGUAGES.find(l => l.code === activeLang);

  return (
    <AdminScreenLayout
      title="Notification Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Notification Management</Text>
      <Text style={styles.sub}>
        Type in English, and it automatically translates into Telugu, Hindi, Tamil, and Kannada. You can switch tabs to review or edit anytime.
      </Text>

      {selectedMode ? (
        <View style={styles.selectedUsersCard}>
          <Text style={styles.selectedUsersTitle}>
            Sending to {selectedUsers.length} selected user
            {selectedUsers.length === 1 ? '' : 's'}
          </Text>
          <Text style={styles.selectedUsersHint}>
            From User Management — only these people will receive this
            notification (not All / Active / Blocked).
          </Text>
          {selectedUsers.map(user => (
            <View key={user.id} style={styles.selectedUserRow}>
              <Text style={styles.selectedUserName}>{user.name}</Text>
              <Text style={styles.selectedUserMeta}>
                {[
                  user.userCode || `ID ${user.id}`,
                  user.mobile && user.mobile !== '—' ? user.mobile : '',
                  user.email || '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.analyticsNavRow}>
        <TouchableOpacity
          style={styles.analyticsNavBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AdminNotificationAnalytics')}>
          <View style={styles.analyticsNavLeft}>
            <Text style={styles.analyticsNavIcon}>📊</Text>
            <Text style={styles.analyticsNavText}>
              Notification Analytics & Delivery Stats
            </Text>
          </View>
          <Text style={styles.analyticsNavArrow}>View Stats →</Text>
        </TouchableOpacity>
      </View>

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
                : `Auto-translated from English. You can edit any words here before sending.`}
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
        label={`Title (${activeLangOption?.nativeName || 'Title'})`}
        value={currentFields.title}
        onChangeText={v => updateField('title', v)}
        placeholder={
          activeLang === 'en'
            ? 'e.g. Daily Japa Reminder'
            : `Title in ${activeLangOption?.nativeName}`
        }
      />
      <Field
        label={`Message (${activeLangOption?.nativeName || 'Message'})`}
        value={currentFields.message}
        onChangeText={v => updateField('message', v)}
        placeholder={
          activeLang === 'en'
            ? 'e.g. Complete your daily 108 chants today.'
            : `Message in ${activeLangOption?.nativeName}`
        }
        multiline
      />

      <Field
        label="Link / Website URL (optional)"
        value={linkUrl}
        onChangeText={setLinkUrl}
        placeholder="e.g. https://japasiddhi.com/payments/ or https://..."
      />
      <Text style={styles.linkFieldHint}>
        Devotees will see this clickable link clearly with an "🔗 Open Link" button.
      </Text>

      <View style={styles.divider} />

      <Text style={styles.sectionHeading}>Upload media (optional)</Text>
      <Text style={styles.imageHint}>
        Add a photo or video for the notification popup. You can also pick a
        reward photo below.
      </Text>
      {localPreview || imageUrl ? (
        <Image
          source={{uri: localPreview || resolveMediaUrl(imageUrl) || undefined}}
          style={styles.imagePreview}
          resizeMode="cover"
        />
      ) : null}
      {videoUrl ? (
        <Text style={styles.videoAttached}>Video attached ✓</Text>
      ) : null}
      <View style={styles.imageActions}>
        <TouchableOpacity
          style={styles.imageBtn}
          onPress={pickAndUploadImage}
          disabled={uploadingImage || uploadingVideo || sending}>
          <Text style={styles.imageBtnText}>
            {uploadingImage
              ? 'UPLOADING...'
              : imageUrl
                ? 'CHANGE PHOTO'
                : 'UPLOAD PHOTO'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.imageBtn}
          onPress={() => void pickAndUploadVideo()}
          disabled={uploadingImage || uploadingVideo || sending}>
          <Text style={styles.imageBtnText}>
            {uploadingVideo
              ? 'UPLOADING...'
              : videoUrl
                ? 'CHANGE VIDEO'
                : 'UPLOAD VIDEO'}
          </Text>
        </TouchableOpacity>
      </View>
      {imageUrl || localPreview || videoUrl ? (
        <TouchableOpacity
          style={styles.imageBtnClear}
          onPress={clearMedia}
          disabled={uploadingImage || uploadingVideo || sending}>
          <Text style={styles.imageBtnClearText}>REMOVE MEDIA</Text>
        </TouchableOpacity>
      ) : null}
      {rewards.length ? (
        <View style={styles.rewardPickBox}>
          <Text style={styles.rewardPickLabel}>Or use a reward photo</Text>
          {rewards.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.rewardPickRow}
              onPress={() => {
                setVideoUrl(null);
                setImageUrl(item.imageUrl || null);
                setLocalPreview(null);
              }}>
              {item.imageUrl ? (
                <Image
                  source={{uri: resolveMediaUrl(item.imageUrl) || undefined}}
                  style={styles.rewardThumb}
                />
              ) : null}
              <Text style={styles.rewardPickName}>{item.name}</Text>
              {imageUrl && item.imageUrl && imageUrl === item.imageUrl ? (
                <Text style={styles.rewardPickActive}>Selected</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.sectionHeading}>Delivery Settings</Text>

      {selectedMode ? (
        <View style={styles.lockedTargetBox}>
          <Text style={styles.label}>Target Group</Text>
          <Text style={styles.lockedTargetValue}>
            Selected users only ({selectedUsers.length})
          </Text>
          <Text style={styles.hint}>
            Audience is locked to the users shown above from User Management.
          </Text>
        </View>
      ) : (
        <>
          <SelectField
            label="Target Group"
            value={target}
            options={['All users', 'Active japa', 'Blocked', 'Test']}
            onChange={setTarget}
          />
          {target === 'Test' ? (
            <Field
              label="Test person"
              value={testQuery}
              onChangeText={setTestQuery}
              placeholder="Name, user id, phone, or email"
            />
          ) : null}
          {target === 'Test' ? (
            <Text style={styles.hint}>
              Sends only to this one person — use this to verify the notification
              before broadcasting.
            </Text>
          ) : null}
        </>
      )}
      <SelectField
        label="Schedule"
        value={schedule}
        options={['Now', 'Later']}
        onChange={value => {
          setSchedule(value);
          if (value === 'Later') {
            setScheduledAt(prev =>
              prev.getTime() > Date.now() + 60_000 ? prev : defaultLater(),
            );
          }
        }}
      />
      {schedule === 'Later' ? (
        <View style={styles.scheduleBox}>
          <Text style={styles.hint}>
            Choose the date and time to send. Delivery runs automatically after
            that moment.
          </Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() =>
                dismissKeyboardThen(() => setShowDatePicker(true))
              }>
              <Text style={styles.pickerLabel}>Date</Text>
              <Text style={styles.pickerValue}>
                {formatDateLabel(scheduledAt)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() =>
                dismissKeyboardThen(() => setShowTimePicker(true))
              }>
              <Text style={styles.pickerLabel}>Time</Text>
              <Text style={styles.pickerValue}>
                {formatTimeLabel(scheduledAt)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <DatePickerModal
        visible={showDatePicker}
        value={scheduledAt}
        mode="date"
        minimumDate={minDate}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={date => {
          setScheduledAt(prev => {
            const next = new Date(prev);
            next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
            return next;
          });
          setShowDatePicker(false);
        }}
      />
      <DatePickerModal
        visible={showTimePicker}
        value={scheduledAt}
        mode="time"
        onCancel={() => setShowTimePicker(false)}
        onConfirm={date => {
          setScheduledAt(prev => {
            const next = new Date(prev);
            next.setHours(date.getHours(), date.getMinutes(), 0, 0);
            return next;
          });
          setShowTimePicker(false);
        }}
      />

      {sending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      <PrimaryButton
        title={
          sending
            ? 'SENDING...'
            : selectedMode
              ? `SEND TO ${selectedUsers.length} USER${
                  selectedUsers.length === 1 ? '' : 'S'
                }`
              : 'SEND NOTIFICATION'
        }
        onPress={send}
        disabled={sending}
      />
    </AdminScreenLayout>
  );
};

export default AdminNotificationsScreen;

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
  selectedUsersCard: {
    backgroundColor: '#FFF8EE',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    padding: 14,
    marginBottom: 16,
  },
  selectedUsersTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
  },
  selectedUsersHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  selectedUserRow: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardBorder,
  },
  selectedUserName: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 14,
  },
  selectedUserMeta: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  lockedTargetBox: {
    marginBottom: 12,
  },
  lockedTargetValue: {
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: '#FFF8EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  videoAttached: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 10,
  },
  imageHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  linkFieldHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -8,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: Colors.background,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  imageBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingVertical: 12,
    alignItems: 'center',
  },
  imageBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  imageBtnClear: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  imageBtnClearText: {
    color: Colors.error,
    fontWeight: '800',
  },
  rewardPickBox: {
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 10,
  },
  rewardPickLabel: {
    fontWeight: '800',
    color: Colors.leafGreen,
    marginBottom: 8,
  },
  rewardPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardBorder,
  },
  rewardThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: Colors.background,
  },
  rewardPickName: {
    flex: 1,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  rewardPickActive: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
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
  scheduleBox: {marginBottom: 14},
  hint: {
    marginBottom: 10,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  pickerRow: {flexDirection: 'row'},
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
    fontSize: 15,
  },
  analyticsNavRow: {
    marginTop: 10,
    marginBottom: 16,
  },
  analyticsNavBtn: {
    backgroundColor: '#FFF8EE',
    borderWidth: 1.2,
    borderColor: Colors.templeGold,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analyticsNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  analyticsNavIcon: {
    fontSize: 16,
  },
  analyticsNavText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  analyticsNavArrow: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  loading: {alignItems: 'center', marginBottom: 10},
  field: {marginBottom: 14},
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
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
  inputMultiline: {
    minHeight: 80,
    paddingVertical: 12,
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#E4EFDF',
  },
  chipText: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: Colors.leafGreen,
  },
});
