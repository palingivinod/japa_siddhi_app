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
import AdminScreenLayout from './AdminScreenLayout';

type MeetingData = {
  enabled: boolean;
  title: string;
  link: string;
  time: string;
  updatedAt?: string;
};

const DEFAULT_MEETING: MeetingData = {
  enabled: true,
  title: 'Lalitha Sahasram Class',
  link: 'https://meet.google.com/ryz-hxyg-byc',
  time: '',
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
  const [enabled, setEnabled] = useState(true);

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
      setEnabled(Boolean(data.enabled));
    } catch {
      setCurrentMeeting(DEFAULT_MEETING);
      setTitle(DEFAULT_MEETING.title);
      setLink(DEFAULT_MEETING.link);
      setTime(DEFAULT_MEETING.time);
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
      });
      const updated: MeetingData = res.data?.data || {
        enabled,
        title: cleanTitle,
        link: cleanLink,
        time: cleanTime,
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

              {/* Time Field */}
              <FormField
                label={t('meetingTimeLabel') || 'Meeting Time / Schedule'}
                placeholder="e.g. Today at 7:00 PM or Daily at 6:30 AM"
                value={time}
                onChangeText={setTime}
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
});
