import React, {useEffect, useState} from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

const Field = ({
  label,
  value,
  onChangeText,
  placeholder = 'Enter here',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.placeholder}
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

  const [name, setName] = useState(String(route.params?.title || ''));
  const [description, setDescription] = useState(
    String(route.params?.description || route.params?.detail || ''),
  );
  const [mantra, setMantra] = useState(
    String(route.params?.mantra || mantraFromReward(route.params?.rewardName)),
  );
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
        setName(String(match.title || ''));
        setDescription(String(match.description || match.detail || ''));
        setMantra(mantraFromReward(match.rewardName));
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

  const onStartChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (event.type === 'dismissed') {
      setShowStartPicker(false);
      return;
    }
    if (selected) {
      setStartDate(selected);
      if (endDate && selected > endDate) {
        setEndDate(selected);
      }
    }
  };

  const onEndChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (event.type === 'dismissed') {
      setShowEndPicker(false);
      return;
    }
    if (selected) {
      setEndDate(selected);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter a challenge name.');
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
        title: name.trim(),
        description: description.trim(),
        mantra: mantra.trim(),
        target,
        startDate: toYmd(startDate),
        endDate: toYmd(endDate),
      };
      if (isEdit) {
        await apiService.put(`/admin/challenges/${editId}`, payload);
        Alert.alert('Challenge updated', 'Changes saved for users.', [
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
          'Saved to the database. Users will see it in Challenges.',
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

  return (
    <AdminScreenLayout
      title={isEdit ? 'Edit Challenge' : 'Challenge Creation'}
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>
        {isEdit ? 'Edit Challenge' : 'Challenge Creation'}
      </Text>
      <Text style={styles.sub}>
        {isEdit
          ? 'Update challenge details shown to users.'
          : 'Configure challenge details.'}
      </Text>

      {loading ? (
        <Text style={styles.sub}>Loading challenge...</Text>
      ) : (
        <>
          <Field label="Challenge Name" value={name} onChangeText={setName} />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
          />
          <Field label="Mantra" value={mantra} onChangeText={setMantra} />
          <Field label="Target Count" value={target} onChangeText={setTarget} />

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
            {showStartPicker ? (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onStartChange}
              />
            ) : null}
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
            {showEndPicker ? (
              <DateTimePicker
                value={endDate || startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate || undefined}
                onChange={onEndChange}
              />
            ) : null}
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
  },
  field: {marginBottom: 14},
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  placeholder: {
    color: Colors.placeholder,
  },
});
