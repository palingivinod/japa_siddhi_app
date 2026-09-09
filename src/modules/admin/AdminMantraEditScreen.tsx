import React, {useCallback, useState} from 'react';
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

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Enter here"
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
  const [name, setName] = useState('');
  const [deity, setDeity] = useState('Community');
  const [sanskrit, setSanskrit] = useState('');
  const [transliteration, setTransliteration] = useState('');
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
      setName(String(data.name || ''));
      setDeity(String(data.deityName || data.subtitle || 'Community'));
      setSanskrit(String(data.sanskritText || ''));
      setTransliteration(String(data.transliteration || ''));
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

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter mantra name.');
      return;
    }
    const targetNum = Number(String(target).replace(/,/g, '')) || 108;
    setSaving(true);
    try {
      const payload = {
        mantraName: name.trim(),
        deityName: deity.trim() || 'Community',
        sanskritText: sanskrit.trim() || name.trim(),
        transliteration: transliteration.trim() || name.trim(),
        defaultJapaCount: targetNum,
        isActive: active,
      };
      if (isEdit) {
        await apiService.put(`/admin/mantras/${mantraId}`, payload);
      } else {
        await apiService.post('/admin/mantras', payload);
      }
      Alert.alert(
        'Saved',
        isEdit
          ? 'Mantra updated. Users will see the change.'
          : 'Mantra created. Users can select it now.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (err) {
      Alert.alert('Save failed', getApiError(err, 'Could not save mantra.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout
      title={isEdit ? 'Edit Mantra' : 'Create Mantra'}
      tab="AdminJapa"
      showBack>
      <Text style={styles.heading}>
        {isEdit ? 'Edit Mantra' : 'Create Mantra'}
      </Text>
      <Text style={styles.sub}>
        Changes are saved to the database and shown to users.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : (
        <>
          <Field label="Mantra name" value={name} onChangeText={setName} />
          <Field label="Deity / subtitle" value={deity} onChangeText={setDeity} />
          <Field
            label="Sanskrit text"
            value={sanskrit}
            onChangeText={setSanskrit}
          />
          <Field
            label="Transliteration"
            value={transliteration}
            onChangeText={setTransliteration}
          />
          <Field
            label="Target"
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
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
            title={saving ? 'SAVING...' : isEdit ? 'SAVE MANTRA' : 'CREATE MANTRA'}
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
  },
  centerBox: {
    paddingVertical: 24,
    alignItems: 'center',
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
