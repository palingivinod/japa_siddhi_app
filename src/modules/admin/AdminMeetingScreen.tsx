import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import DatePickerModal from '../common/DatePickerModal';
import AdminScreenLayout from './AdminScreenLayout';

type MeetingData = {
  enabled: boolean;
  title: string;
  link: string;
  time: string;
  scheduledAt?: string | null;
  updatedAt?: string;
};

const DEFAULT_MEETING: MeetingData = {
  enabled: true,
  title: 'Lalitha Sahasram Class',
  link: 'https://meet.google.com/ryz-hxyg-byc',
  time: '',
  scheduledAt: null,
};

const AdminMeetingScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [time, setTime] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);

  // Picker states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(3);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [previewCountdown, setPreviewCountdown] = useState<string>('');

  const [currentMeeting, setCurrentMeeting] = useState<MeetingData | null>(null);

  const loadMeeting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/meeting');
      const data: MeetingData = res.data?.data || DEFAULT_MEETING;
      setCurrentMeeting(data);
      setTitle(data.title || 'Lalitha Sahasram Class');
      setLink(data.link || '');
      setTime(data.time || '');
      setScheduledAt(data.scheduledAt || null);
      setEnabled(Boolean(data.enabled));

      if (data.scheduledAt) {
        const d = new Date(data.scheduledAt);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          let h = d.getHours();
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          setSelectedHour(h);
          setSelectedMinute(d.getMinutes());
          setSelectedAmPm(ampm);
        }
      }
    } catch {
      setCurrentMeeting(DEFAULT_MEETING);
      setTitle(DEFAULT_MEETING.title);
      setLink(DEFAULT_MEETING.link);
      setTime(DEFAULT_MEETING.time);
      setScheduledAt(DEFAULT_MEETING.scheduledAt || null);
      setEnabled(DEFAULT_MEETING.enabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  const onTestLink = async () => {
    const trimmed = link.trim();
    if (!trimmed) {
      Alert.alert(
        t('testLink') || 'Test Link',
        'Please enter a meeting link first.',
      );
      return;
    }
    const targetUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch {
      Alert.alert(
        'Unable to open link',
        'Please make sure the link is a valid URL (e.g. https://meet.google.com/...)',
      );
    }
  };

  const applyDateTime = (
    date: Date,
    hour12: number,
    minute: number,
    ampm: 'AM' | 'PM',
  ) => {
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;
    const target = new Date(date);
    target.setHours(h24, minute, 0, 0);

    const now = new Date();
    const todayStr = now.toDateString();
    const targetDateStr = target.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    const padMin = String(minute).padStart(2, '0');
    let display = '';
    if (targetDateStr === todayStr) {
      display = `Today at ${hour12}:${padMin} ${ampm}`;
    } else if (targetDateStr === tomorrowStr) {
      display = `Tomorrow at ${hour12}:${padMin} ${ampm}`;
    } else {
      const datePart = target.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      display = `${datePart} at ${hour12}:${padMin} ${ampm}`;
    }

    setSelectedDate(date);
    setSelectedHour(hour12);
    setSelectedMinute(minute);
    setSelectedAmPm(ampm);
    setTime(display);
    setScheduledAt(target.toISOString());
  };

  const setQuickPreset = (preset: 'today3pm' | 'today7pm' | 'tomorrow630am' | 'now') => {
    const now = new Date();
    if (preset === 'today3pm') {
      applyDateTime(now, 3, 0, 'PM');
    } else if (preset === 'today7pm') {
      applyDateTime(now, 7, 0, 'PM');
    } else if (preset === 'tomorrow630am') {
      const tom = new Date(now);
      tom.setDate(tom.getDate() + 1);
      applyDateTime(tom, 6, 30, 'AM');
    } else if (preset === 'now') {
      const liveTarget = new Date(now.getTime() - 60000);
      setSelectedDate(now);
      let curH = now.getHours();
      const curAmPm = curH >= 12 ? 'PM' : 'AM';
      curH = curH % 12 || 12;
      setSelectedHour(curH);
      setSelectedMinute(now.getMinutes());
      setSelectedAmPm(curAmPm);
      setTime('LIVE NOW');
      setScheduledAt(liveTarget.toISOString());
    }
  };

  useEffect(() => {
    const updatePreview = () => {
      let targetMs: number | null = null;
      if (scheduledAt) {
        const t = new Date(scheduledAt).getTime();
        if (!isNaN(t)) targetMs = t;
      }
      if (!targetMs) {
        setPreviewCountdown('');
        return;
      }
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setPreviewCountdown('🟢 LIVE NOW (Join button is unlocked!)');
      } else {
        const totalSec = Math.floor(diff / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        setPreviewCountdown(
          `⏳ Starts in ${h > 0 ? pad(h) + 'h ' : ''}${pad(m)}m ${pad(s)}s (Locked for devotees until countdown reaches zero)`,
        );
      }
    };
    updatePreview();
    const interval = setInterval(updatePreview, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt]);

  const onSaveMeeting = async () => {
    const cleanTitle = title.trim() || 'Lalitha Sahasram Class';
    const cleanLink = link.trim();
    const cleanTime = time.trim();

    if (enabled && !cleanLink) {
      Alert.alert(
        'Missing Link',
        'Please provide a meeting link (e.g. Google Meet or Zoom URL) before enabling it on the home screen.',
      );
      return;
    }

    setSaving(true);
    try {
      const res = await apiService.put('/admin/meeting', {
        enabled,
        title: cleanTitle,
        link: cleanLink,
        time: cleanTime,
        scheduledAt: scheduledAt || null,
      });
      const updated: MeetingData = res.data?.data || {
        enabled,
        title: cleanTitle,
        link: cleanLink,
        time: cleanTime,
        scheduledAt: scheduledAt || null,
      };
      setCurrentMeeting(updated);
      Alert.alert(
        'Success',
        t('meetingSavedSuccess') ||
          'Meeting details saved and published successfully.',
      );
    } catch (err) {
      Alert.alert(
        'Save Failed',
        getApiError(err, 'Unable to save meeting configuration.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const onRemoveMeeting = () => {
    Alert.alert(
      t('removeMeeting') || 'Remove Meeting',
      t('removeMeetingConfirm') ||
        'Are you sure you want to remove this meeting? It will be hidden from all devotees on the home screen.',
      [
        {text: t('cancel') || 'Cancel', style: 'cancel'},
        {
          text: t('removeMeeting') || 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await apiService.delete('/admin/meeting');
              setEnabled(false);
              setLink('');
              setTime('');
              setTitle('');
              setCurrentMeeting({
                enabled: false,
                title: '',
                link: '',
                time: '',
              });
              Alert.alert(
                'Success',
                t('meetingRemovedSuccess') || 'Meeting removed successfully.',
              );
            } catch (err) {
              Alert.alert(
                'Error',
                getApiError(err, 'Unable to remove meeting configuration.'),
              );
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  };

  const isLive = Boolean(currentMeeting?.enabled && currentMeeting?.link);

  return (
    <AdminScreenLayout
      title={t('meetingManagement') || 'Meeting Management'}
      tab="AdminDashboard"
      showBack={true}>
      <View style={styles.container}>
        {/* Header Title */}
        <Text style={styles.heading}>
          {t('meetingManagement') || 'Meeting Management'}
        </Text>
        <Text style={styles.sub}>
          {t('meetingManagementSub') ||
            'Configure Google Meet or live class details. When enabled, this appears directly below Panchangam on the user home screen.'}
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.templeGold} />
            <Text style={styles.loadingText}>Loading meeting details...</Text>
          </View>
        ) : (
          <>
            {/* Live Status Card */}
            <View
              style={[
                styles.statusCard,
                isLive ? styles.statusCardLive : styles.statusCardInactive,
              ]}>
              <View style={styles.statusHeaderRow}>
                <View style={styles.statusBadgeRow}>
                  <View
                    style={[
                      styles.statusDot,
                      isLive ? styles.statusDotLive : styles.statusDotInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isLive
                        ? styles.statusBadgeTextLive
                        : styles.statusBadgeTextInactive,
                    ]}>
                    {isLive ? 'LIVE ON USER HOME' : 'HIDDEN FROM USERS'}
                  </Text>
                </View>
                {isLive && (
                  <TouchableOpacity
                    style={styles.testLinkPill}
                    onPress={onTestLink}
                    activeOpacity={0.8}>
                    <Text style={styles.testLinkText}>
                      ↗ {t('testLink') || 'Test Link'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isLive ? (
                <View style={styles.statusDetails}>
                  <Text style={styles.statusTitle} numberOfLines={2}>
                    🪔 {currentMeeting?.title || 'Lalitha Sahasram Class'}
                  </Text>
                  {currentMeeting?.time ? (
                    <Text style={styles.statusTime}>
                      ⏰ {currentMeeting.time}
                    </Text>
                  ) : null}
                  <Text style={styles.statusUrl} numberOfLines={1}>
                    🔗 {currentMeeting?.link}
                  </Text>
                </View>
              ) : (
                <Text style={styles.statusEmpty}>
                  {t('noActiveMeeting') ||
                    'No meeting is currently live. Fill the details below and enable to display for devotees.'}
                </Text>
              )}
            </View>

            {/* Edit / Configuration Form */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>
                ✏️ {t('editMeeting') || 'Edit Meeting Details'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Edit link or time anytime. Changes take effect immediately after
                saving.
              </Text>

              {/* Title Field */}
              <FormField
                label={t('meetingTitleLabel') || 'Meeting Title / Topic'}
                placeholder="e.g. Lalitha Sahasram Class"
                value={title}
                onChangeText={setTitle}
              />

              {/* Link Field */}
              <FormField
                label={t('meetingLinkLabel') || 'Meeting Link (Google Meet / Zoom)'}
                placeholder="https://meet.google.com/ryz-hxyg-byc"
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                keyboardType="url"
              />

              {/* Quick Test Link Button */}
              {link.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.inlineTestBtn}
                  onPress={onTestLink}
                  activeOpacity={0.7}>
                  <Text style={styles.inlineTestBtnText}>
                    ↗ Test Link in Google Meet / Browser
                  </Text>
                </TouchableOpacity>
              )}

              {/* Meeting Schedule Box with Calendar, Time & AM/PM Pickers */}
              <View style={styles.schedulerSection}>
                <Text style={styles.schedulerSectionTitle}>
                  📅 Meeting Schedule & Countdown Settings
                </Text>
                <Text style={styles.schedulerSectionSubtitle}>
                  Choose date & time using the pickers below, or type manually. Devotees will see a live ticking countdown until the meeting starts.
                </Text>

                {/* Date Selection */}
                <Text style={styles.pickerSubLabel}>1. Select Date:</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}>
                    <Text style={styles.datePickerBtnIcon}>📅</Text>
                    <Text style={styles.datePickerBtnText}>
                      {selectedDate.toDateString() === new Date().toDateString()
                        ? `Today (${selectedDate.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})})`
                        : selectedDate.toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                    </Text>
                    <Text style={styles.datePickerChangeText}>Change ▾</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickDatePill,
                      selectedDate.toDateString() === new Date().toDateString() &&
                        styles.quickDatePillActive,
                    ]}
                    onPress={() => {
                      const now = new Date();
                      applyDateTime(now, selectedHour, selectedMinute, selectedAmPm);
                    }}>
                    <Text
                      style={[
                        styles.quickDatePillText,
                        selectedDate.toDateString() === new Date().toDateString() &&
                          styles.quickDatePillTextActive,
                      ]}>
                      Today
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickDatePill,
                      (() => {
                        const tom = new Date();
                        tom.setDate(tom.getDate() + 1);
                        return selectedDate.toDateString() === tom.toDateString();
                      })() && styles.quickDatePillActive,
                    ]}
                    onPress={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      applyDateTime(tom, selectedHour, selectedMinute, selectedAmPm);
                    }}>
                    <Text
                      style={[
                        styles.quickDatePillText,
                        (() => {
                          const tom = new Date();
                          tom.setDate(tom.getDate() + 1);
                          return selectedDate.toDateString() === tom.toDateString();
                        })() && styles.quickDatePillTextActive,
                      ]}>
                      Tomorrow
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Time Selection */}
                <Text style={styles.pickerSubLabel}>2. Select Hour & AM/PM:</Text>
                
                {/* Hours Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hoursScroll}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.hourPill,
                        selectedHour === h && styles.hourPillActive,
                      ]}
                      onPress={() => applyDateTime(selectedDate, h, selectedMinute, selectedAmPm)}>
                      <Text
                        style={[
                          styles.hourPillText,
                          selectedHour === h && styles.hourPillTextActive,
                        ]}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Minutes & AM/PM Row */}
                <View style={styles.timeControlRow}>
                  <View style={styles.minutesBlock}>
                    <Text style={styles.smallSubLabel}>Minute:</Text>
                    <View style={styles.minutesRow}>
                      {[0, 15, 30, 45].map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.minutePill,
                            selectedMinute === m && styles.minutePillActive,
                          ]}
                          onPress={() => applyDateTime(selectedDate, selectedHour, m, selectedAmPm)}>
                          <Text
                            style={[
                              styles.minutePillText,
                              selectedMinute === m && styles.minutePillTextActive,
                            ]}>
                            :{String(m).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* AM / PM Segmented Control */}
                  <View style={styles.ampmBlock}>
                    <Text style={styles.smallSubLabel}>AM / PM:</Text>
                    <View style={styles.ampmRow}>
                      <TouchableOpacity
                        style={[
                          styles.ampmPill,
                          selectedAmPm === 'AM' && styles.ampmPillActive,
                        ]}
                        onPress={() => applyDateTime(selectedDate, selectedHour, selectedMinute, 'AM')}>
                        <Text
                          style={[
                            styles.ampmPillText,
                            selectedAmPm === 'AM' && styles.ampmPillTextActive,
                          ]}>
                          AM
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.ampmPill,
                          selectedAmPm === 'PM' && styles.ampmPillActive,
                        ]}
                        onPress={() => applyDateTime(selectedDate, selectedHour, selectedMinute, 'PM')}>
                        <Text
                          style={[
                            styles.ampmPillText,
                            selectedAmPm === 'PM' && styles.ampmPillTextActive,
                          ]}>
                          PM
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Clock Dialog Button */}
                  <TouchableOpacity
                    style={styles.clockDialogBtn}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.8}>
                    <Text style={styles.clockDialogIcon}>⏰</Text>
                    <Text style={styles.clockDialogText}>Clock</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Presets */}
                <Text style={styles.pickerSubLabel}>Quick Presets:</Text>
                <View style={styles.presetsRow}>
                  <TouchableOpacity
                    style={styles.presetPill}
                    onPress={() => setQuickPreset('today3pm')}>
                    <Text style={styles.presetPillText}>Today 3:00 PM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetPill}
                    onPress={() => setQuickPreset('today7pm')}>
                    <Text style={styles.presetPillText}>Today 7:00 PM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetPill}
                    onPress={() => setQuickPreset('tomorrow630am')}>
                    <Text style={styles.presetPillText}>Tomorrow 6:30 AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.presetPill, styles.presetPillNow]}
                    onPress={() => setQuickPreset('now')}>
                    <Text style={styles.presetPillNowText}>Live Now 🟢</Text>
                  </TouchableOpacity>
                </View>

                {/* Manual Text Input Field */}
                <View style={{marginTop: 10}}>
                  <FormField
                    label={t('meetingTimeLabel') || 'Display Time (Or Manual Edit)'}
                    placeholder="e.g. Today at 3:00 PM or Daily at 6:30 AM"
                    value={time}
                    onChangeText={txt => {
                      setTime(txt);
                      // If manual text matches 3pm / 3:00 pm, update scheduledAt
                      const lower = txt.toLowerCase();
                      const match = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
                      if (match) {
                        let h = parseInt(match[1], 10);
                        const m = match[2] ? parseInt(match[2], 10) : 0;
                        const ap = match[3] ? match[3].toUpperCase() : selectedAmPm;
                        if (ap === 'PM' && h < 12) h += 12;
                        if (ap === 'AM' && h === 12) h = 0;
                        const d = new Date(selectedDate);
                        d.setHours(h, m, 0, 0);
                        setScheduledAt(d.toISOString());
                      }
                    }}
                  />
                </View>

                {/* Live Countdown Preview Card */}
                {previewCountdown ? (
                  <View style={styles.countdownPreviewCard}>
                    <Text style={styles.countdownPreviewLabel}>
                      📱 Devotee Screen Preview:
                    </Text>
                    <Text style={styles.countdownPreviewText}>
                      {previewCountdown}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Native Date Picker Modal */}
              <DatePickerModal
                visible={showDatePicker}
                value={selectedDate}
                mode="date"
                minimumDate={new Date()}
                onCancel={() => setShowDatePicker(false)}
                onConfirm={date => {
                  setShowDatePicker(false);
                  applyDateTime(date, selectedHour, selectedMinute, selectedAmPm);
                }}
              />

              {/* Native Time Picker Modal */}
              <DatePickerModal
                visible={showTimePicker}
                value={(() => {
                  let h = selectedHour % 12;
                  if (selectedAmPm === 'PM') h += 12;
                  const d = new Date(selectedDate);
                  d.setHours(h, selectedMinute, 0, 0);
                  return d;
                })()}
                mode="time"
                onCancel={() => setShowTimePicker(false)}
                onConfirm={date => {
                  setShowTimePicker(false);
                  let h = date.getHours();
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  h = h % 12 || 12;
                  applyDateTime(date, h, date.getMinutes(), ampm);
                }}
              />

              {/* Active Toggle Switch */}
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchLabel}>
                    {t('meetingActiveLabel') || 'Show on User Home Screen'}
                  </Text>
                  <Text style={styles.switchSub}>
                    {enabled
                      ? 'Devotees will see this meeting on their home screen.'
                      : 'Meeting is hidden from all devotees.'}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={setEnabled}
                  trackColor={{false: '#D1D5DB', true: '#86EFAC'}}
                  thumbColor={enabled ? Colors.leafGreen : '#9CA3AF'}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <PrimaryButton
                  title={
                    saving
                      ? 'Saving...'
                      : t('saveMeeting') || 'Save & Publish Meeting'
                  }
                  onPress={onSaveMeeting}
                  disabled={saving || removing}
                />
              </View>

              {/* Remove Meeting Button */}
              {(isLive || link.length > 0 || title.length > 0) && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={onRemoveMeeting}
                  disabled={saving || removing}
                  activeOpacity={0.8}>
                  <Text style={styles.removeBtnText}>
                    {removing
                      ? 'Removing...'
                      : `🗑️ ${t('removeMeeting') || 'Remove Meeting'}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </AdminScreenLayout>
  );
};

export default AdminMeetingScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.sacredBrown,
    fontSize: 14,
    fontWeight: '600',
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
  },
  statusCardLive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusCardInactive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotLive: {
    backgroundColor: '#16A34A',
  },
  statusDotInactive: {
    backgroundColor: '#9CA3AF',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextLive: {
    color: '#15803D',
  },
  statusBadgeTextInactive: {
    color: '#6B7280',
  },
  testLinkPill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  testLinkText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  statusDetails: {
    marginTop: 4,
    gap: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  statusTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  statusUrl: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  statusEmpty: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  inlineTestBtn: {
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineTestBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3EBE0',
    marginTop: 4,
    marginBottom: 16,
  },
  switchCopy: {
    flex: 1,
    paddingRight: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  switchSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    marginTop: 4,
  },
  removeBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
  schedulerSection: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#E8D2A6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  schedulerSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  schedulerSectionSubtitle: {
    fontSize: 11,
    color: '#8C6C42',
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 16,
  },
  pickerSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginTop: 6,
    marginBottom: 6,
  },
  smallSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5B45',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  datePickerBtnIcon: {
    fontSize: 14,
  },
  datePickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  datePickerChangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.templeGold,
    marginLeft: 4,
  },
  quickDatePill: {
    backgroundColor: '#F3EBE0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickDatePillActive: {
    backgroundColor: Colors.templeGold,
  },
  quickDatePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  quickDatePillTextActive: {
    color: Colors.white,
  },
  hoursScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  hourPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3EBE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  hourPillActive: {
    backgroundColor: Colors.templeGold,
  },
  hourPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  hourPillTextActive: {
    color: Colors.white,
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  minutesBlock: {
    flexShrink: 1,
  },
  minutesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  minutePill: {
    backgroundColor: '#F3EBE0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  minutePillActive: {
    backgroundColor: Colors.templeGold,
  },
  minutePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  minutePillTextActive: {
    color: Colors.white,
  },
  ampmBlock: {
    flexShrink: 0,
  },
  ampmRow: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#E8DFD5',
    overflow: 'hidden',
  },
  ampmPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  ampmPillActive: {
    backgroundColor: Colors.sacredBrown,
  },
  ampmPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B5B45',
  },
  ampmPillTextActive: {
    color: Colors.white,
  },
  clockDialogBtn: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockDialogIcon: {
    fontSize: 14,
  },
  clockDialogText: {
    color: '#0369A1',
    fontWeight: '700',
    fontSize: 11,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  presetPill: {
    backgroundColor: '#F3EBE0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  presetPillNow: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  presetPillNowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  countdownPreviewCard: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
  },
  countdownPreviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  countdownPreviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
    lineHeight: 18,
  },
});
