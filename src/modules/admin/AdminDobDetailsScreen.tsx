import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import SelectField from '../common/SelectField';
import DatePickerModal from '../common/DatePickerModal';
import AdminScreenLayout from './AdminScreenLayout';

const PERIODS = [
  {label: 'January', value: '01'},
  {label: 'February', value: '02'},
  {label: 'March', value: '03'},
  {label: 'April', value: '04'},
  {label: 'May', value: '05'},
  {label: 'June', value: '06'},
  {label: 'July', value: '07'},
  {label: 'August', value: '08'},
  {label: 'September', value: '09'},
  {label: 'October', value: '10'},
  {label: 'November', value: '11'},
  {label: 'December', value: '12'},
  {label: 'Total year', value: 'year'},
];

const SECTIONS = [
  {type: 'birthdays', label: 'Birthdays'},
  {type: 'jayanthi', label: 'Jayanthi'},
  {type: 'vardhanti', label: 'Vardhanti'},
  {type: 'anniversary', label: 'Anniversary'},
] as const;

type SectionType = (typeof SECTIONS)[number]['type'];

type PersonRow = {
  id: string;
  userId: number | null;
  fullName: string;
  phone: string;
  date?: string;
  forWhom?: string;
  personName?: string;
};

const DEFAULT_TITLES: Record<SectionType, string> = {
  birthdays: 'Happy Birthday',
  jayanthi: 'Happy Jayanthi',
  vardhanti: 'Happy Vardhanti',
  anniversary: 'Happy Anniversary',
};

const digitsPhone = (value?: string) =>
  String(value || '')
    .replace(/[^\d]/g, '')
    .trim();

const handleCall = (mobile?: string) => {
  const clean = String(mobile || '').replace(/[^\d+]/g, '');
  if (!clean) {
    return;
  }
  Linking.openURL(`tel:${clean}`).catch(() => {
    Alert.alert('Call Error', 'Unable to open phone dialer.');
  });
};

const pad = (n: number) => String(n).padStart(2, '0');

const toYmd = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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

const AdminDobDetailsScreen = () => {
  const [period, setPeriod] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [dayPickerValue, setDayPickerValue] = useState(new Date());

  const [openType, setOpenType] = useState<SectionType | ''>('');
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<'Now' | 'Later'>('Now');
  const [scheduledAt, setScheduledAt] = useState(defaultLater);
  const [showScheduleDate, setShowScheduleDate] = useState(false);
  const [showScheduleTime, setShowScheduleTime] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setOpenType('');
    setPeople([]);
    setSelectedIds({});
    setMessage('');
    setTitle('');
    setSchedule('Now');
  }, [period, specificDate]);

  const notifyablePeople = useMemo(
    () => people.filter(p => p.userId && p.userId > 0),
    [people],
  );

  const selectedPeople = useMemo(
    () => notifyablePeople.filter(p => selectedIds[p.id]),
    [notifyablePeople, selectedIds],
  );

  const allSelected =
    notifyablePeople.length > 0 &&
    notifyablePeople.every(p => selectedIds[p.id]);

  const openDayPicker = () => {
    if (specificDate) {
      const parsed = new Date(specificDate);
      setDayPickerValue(isNaN(parsed.getTime()) ? new Date() : parsed);
    } else {
      setDayPickerValue(new Date());
    }
    setShowDayPicker(true);
  };

  const loadSection = async (type: SectionType) => {
    if (!period && !specificDate) {
      Alert.alert(
        'Select a period',
        'Choose a month, Total year, or a specific date, then open a list.',
      );
      return;
    }
    if (openType === type) {
      setOpenType('');
      setPeople([]);
      setSelectedIds({});
      return;
    }
    setOpenType(type);
    setLoading(true);
    setPeople([]);
    setSelectedIds({});
    setTitle(DEFAULT_TITLES[type]);
    try {
      const params: Record<string, string> = {type};
      if (specificDate) {
        params.date = specificDate;
        if (period && period !== 'year') {
          params.month = period;
        }
      } else if (period) {
        params.month = period;
      }
      const response = await apiService.get('/admin/dob-details', {params});
      const rows = Array.isArray(response.data?.data?.people)
        ? response.data.data.people
        : [];
      const mapped: PersonRow[] = rows.map((row: any) => ({
        id: String(row.id || ''),
        userId: Number(row.userId || 0) || null,
        fullName: String(row.fullName || 'Devotee'),
        phone: String(row.phone || ''),
        date: String(row.date || ''),
        forWhom: String(row.forWhom || ''),
        personName: String(row.personName || ''),
      }));
      setPeople(mapped);
      const next: Record<string, boolean> = {};
      mapped.forEach(p => {
        if (p.userId) {
          next[p.id] = false;
        }
      });
      setSelectedIds(next);
    } catch (err) {
      setOpenType('');
      Alert.alert(
        'DOB / other details',
        getApiError(err, 'Could not load devotees.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (!notifyablePeople.length) {
      return;
    }
    const next: Record<string, boolean> = {...selectedIds};
    const value = !allSelected;
    notifyablePeople.forEach(p => {
      next[p.id] = value;
    });
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => ({...prev, [id]: !prev[id]}));
  };

  const sendWishes = async () => {
    if (!openType) {
      return;
    }
    const userIds = selectedPeople
      .map(p => p.userId)
      .filter((id): id is number => Boolean(id && id > 0));
    if (!userIds.length) {
      Alert.alert('Select devotees', 'Select at least one person to notify.');
      return;
    }
    const text = message.trim();
    if (!text) {
      Alert.alert('Message required', 'Enter a wish or message to send.');
      return;
    }
    if (schedule === 'Later' && scheduledAt.getTime() <= Date.now() + 60_000) {
      Alert.alert(
        'Schedule',
        'Pick a date and time at least one minute from now.',
      );
      return;
    }

    setSending(true);
    try {
      const response = await apiService.post('/admin/dob-details/notify', {
        type: openType,
        userIds,
        title: (title.trim() || DEFAULT_TITLES[openType]).trim(),
        message: text,
        schedule,
        scheduledAt:
          schedule === 'Later' ? toScheduleStamp(scheduledAt) : undefined,
      });
      const data = response.data?.data || {};
      const detail =
        response.data?.message ||
        (data.mode === 'scheduled'
          ? `Scheduled for ${data.sendAt}`
          : `Sent to ${data.recipientCount || userIds.length}`);
      Alert.alert(
        data.mode === 'scheduled' ? 'Wishes scheduled' : 'Wishes sent',
        `${detail}\n\nSelected: ${userIds.length} of ${notifyablePeople.length}\nWhen: ${
          schedule === 'Later'
            ? `${formatDateLabel(scheduledAt)} ${formatTimeLabel(scheduledAt)} (IST)`
            : 'Now'
        }`,
      );
      setMessage('');
      setSchedule('Now');
      setScheduledAt(defaultLater());
    } catch (err) {
      Alert.alert(
        'Send failed',
        getApiError(err, 'Could not send notification.'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminScreenLayout title="DOB / other details" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>DOB / other details</Text>
      <Text style={styles.sub}>
        Choose a month / year or a specific date, open a list, select devotees,
        then send or schedule a push wish. No quiet-hours limit on these.
      </Text>

      <Text style={styles.monthLabel}>Month / Total year</Text>
      <SelectField
        value={period}
        onChange={setPeriod}
        placeholder="Select month or Total year"
        title="Select month or Total year"
        options={PERIODS}
      />

      <Text style={[styles.monthLabel, styles.dateLabel]}>
        Specific date (optional)
      </Text>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={openDayPicker}>
          <Text style={styles.dateValue}>
            {specificDate || 'All days in month / year'}
          </Text>
        </TouchableOpacity>
        {specificDate ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setSpecificDate('')}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.hint}>
        Pick a date to show only that day. Clear it to show the full month or
        year.
      </Text>

      {SECTIONS.map(item => {
        const open = openType === item.type;
        return (
          <View key={item.type}>
            <TouchableOpacity
              style={[styles.outlineBtn, open && styles.outlineBtnOpen]}
              disabled={loading && open}
              onPress={() => loadSection(item.type)}>
              <Text style={styles.outlineText}>{item.label.toUpperCase()}</Text>
            </TouchableOpacity>
            {open ? (
              <View style={styles.listBox}>
                {loading ? (
                  <ActivityIndicator color={Colors.sacredBrown} />
                ) : people.length === 0 ? (
                  <Text style={styles.empty}>No devotees for this period.</Text>
                ) : (
                  <>
                    <View style={styles.selectBar}>
                      <TouchableOpacity
                        style={styles.selectAllBtn}
                        onPress={toggleSelectAll}
                        disabled={!notifyablePeople.length}>
                        <View
                          style={[
                            styles.checkbox,
                            allSelected && styles.checkboxOn,
                          ]}>
                          {allSelected ? (
                            <Text style={styles.checkMark}>✓</Text>
                          ) : null}
                        </View>
                        <Text style={styles.selectAllText}>Select all</Text>
                      </TouchableOpacity>
                      <Text style={styles.countText}>
                        {selectedPeople.length} selected of{' '}
                        {notifyablePeople.length}
                        {people.length !== notifyablePeople.length
                          ? ` (${people.length - notifyablePeople.length} no app account)`
                          : ''}
                      </Text>
                    </View>

                    {people.map(person => {
                      const hasPhone = digitsPhone(person.phone).length >= 5;
                      const canNotify = Boolean(person.userId);
                      const checked = Boolean(selectedIds[person.id]);
                      const meta = [
                        person.date,
                        person.forWhom,
                        person.personName,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <View key={person.id} style={styles.personCard}>
                          <TouchableOpacity
                            style={styles.checkHit}
                            onPress={() =>
                              canNotify ? toggleOne(person.id) : undefined
                            }
                            disabled={!canNotify}
                            activeOpacity={0.7}>
                            <View
                              style={[
                                styles.checkbox,
                                checked && styles.checkboxOn,
                                !canNotify && styles.checkboxDisabled,
                              ]}>
                              {checked ? (
                                <Text style={styles.checkMark}>✓</Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                          <View style={styles.copy}>
                            <Text style={styles.name}>{person.fullName}</Text>
                            <Text style={styles.phone}>
                              {person.phone || 'No phone'}
                              {!canNotify ? ' · no app account' : ''}
                            </Text>
                            {meta ? (
                              <Text style={styles.meta}>{meta}</Text>
                            ) : null}
                          </View>
                          {hasPhone ? (
                            <TouchableOpacity
                              style={[styles.contactBtn, styles.phoneBtn]}
                              onPress={() => handleCall(person.phone)}
                              activeOpacity={0.7}>
                              <Text style={styles.contactIcon}>📞</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      );
                    })}

                    <View style={styles.messageBox}>
                      <Text style={styles.monthLabel}>Notification title</Text>
                      <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={DEFAULT_TITLES[item.type]}
                        placeholderTextColor={Colors.placeholder}
                      />
                      <Text style={[styles.monthLabel, styles.dateLabel]}>
                        Message
                      </Text>
                      <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Write birthday / occasion wishes…"
                        placeholderTextColor={Colors.placeholder}
                        multiline
                        textAlignVertical="top"
                      />

                      <Text style={[styles.monthLabel, styles.dateLabel]}>
                        When to send
                      </Text>
                      <View style={styles.chipRow}>
                        {(['Now', 'Later'] as const).map(option => {
                          const active = schedule === option;
                          return (
                            <TouchableOpacity
                              key={option}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => setSchedule(option)}>
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
                      {schedule === 'Later' ? (
                        <View style={styles.scheduleRow}>
                          <TouchableOpacity
                            style={styles.scheduleBtn}
                            onPress={() => setShowScheduleDate(true)}>
                            <Text style={styles.scheduleText}>
                              {formatDateLabel(scheduledAt)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.scheduleBtn}
                            onPress={() => setShowScheduleTime(true)}>
                            <Text style={styles.scheduleText}>
                              {formatTimeLabel(scheduledAt)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      <Text style={styles.countText}>
                        Ready to send to {selectedPeople.length} of{' '}
                        {notifyablePeople.length}
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          (sending || !selectedPeople.length) &&
                            styles.sendBtnDisabled,
                        ]}
                        disabled={sending || !selectedPeople.length}
                        onPress={sendWishes}>
                        <Text style={styles.sendText}>
                          {sending
                            ? 'SENDING…'
                            : schedule === 'Later'
                              ? 'SCHEDULE MESSAGE'
                              : 'SEND MESSAGE'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      <DatePickerModal
        visible={showDayPicker}
        value={dayPickerValue}
        mode="date"
        onCancel={() => setShowDayPicker(false)}
        onConfirm={selected => {
          setShowDayPicker(false);
          const ymd = toYmd(selected);
          setSpecificDate(ymd);
          const mm = ymd.slice(5, 7);
          if (!period || period === 'year') {
            setPeriod(mm);
          }
        }}
      />
      <DatePickerModal
        visible={showScheduleDate}
        value={scheduledAt}
        mode="date"
        onCancel={() => setShowScheduleDate(false)}
        onConfirm={selected => {
          setShowScheduleDate(false);
          setScheduledAt(prev => {
            const next = new Date(prev);
            next.setFullYear(
              selected.getFullYear(),
              selected.getMonth(),
              selected.getDate(),
            );
            return next;
          });
        }}
      />
      <DatePickerModal
        visible={showScheduleTime}
        value={scheduledAt}
        mode="time"
        onCancel={() => setShowScheduleTime(false)}
        onConfirm={selected => {
          setShowScheduleTime(false);
          setScheduledAt(prev => {
            const next = new Date(prev);
            next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            return next;
          });
        }}
      />
    </AdminScreenLayout>
  );
};

export default AdminDobDetailsScreen;

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
  monthLabel: {
    marginBottom: 8,
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  dateLabel: {marginTop: 12},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateValue: {
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  clearBtn: {paddingHorizontal: 8, paddingVertical: 10},
  clearText: {color: Colors.leafGreen, fontWeight: '800'},
  hint: {
    marginTop: 6,
    marginBottom: 4,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  outlineBtn: {
    marginTop: 10,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineBtnOpen: {
    backgroundColor: Colors.white,
  },
  outlineText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  listBox: {
    marginTop: 8,
    marginBottom: 4,
  },
  empty: {
    color: Colors.textSecondary,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  selectBar: {
    marginBottom: 10,
    gap: 6,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  countText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxOn: {
    backgroundColor: Colors.sacredBrown,
  },
  checkboxDisabled: {
    opacity: 0.35,
  },
  checkMark: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 16,
  },
  checkHit: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  personCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1, paddingRight: 8},
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  phone: {
    marginTop: 3,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  meta: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  phoneBtn: {
    backgroundColor: '#E8F1FF',
  },
  contactIcon: {
    fontSize: 18,
  },
  messageBox: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.sacredBrown,
    fontWeight: '600',
    backgroundColor: Colors.background,
  },
  inputMultiline: {
    minHeight: 90,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  chipActive: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
  },
  chipText: {
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  chipTextActive: {color: Colors.white},
  scheduleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  scheduleBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  scheduleText: {
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  sendBtn: {
    marginTop: 12,
    borderRadius: 28,
    backgroundColor: Colors.sacredBrown,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendBtnDisabled: {opacity: 0.5},
  sendText: {
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
