import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import ProfileApi from '../auth/services/profileApi';
import {hydrateSession, saveSession} from '../../services/session';

const Row = ({label, value}: {label: string; value?: string}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || 'Not added'}</Text>
  </View>
);

const SpiritualDetailsScreen = () => {
  const route = useRoute<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'Bachelor' | 'Married'>(
    'Bachelor',
  );
  const [snapshot, setSnapshot] = useState({
    gothram: '',
    nakshatram: '',
    maritalStatus: 'Bachelor' as 'Bachelor' | 'Married',
  });

  const applyProfile = (data: any) => {
    if (!data) {
      return;
    }
    const next = {
      gothram: data.gothram || '',
      nakshatram: data.nakshatram || '',
      maritalStatus: (data.maritalStatus === 'Married'
        ? 'Married'
        : 'Bachelor') as 'Bachelor' | 'Married',
    };
    setGothram(next.gothram);
    setNakshatram(next.nakshatram);
    setMaritalStatus(next.maritalStatus);
    setSnapshot(next);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (route.params?.profile) {
        applyProfile(route.params.profile);
      }
      const data = await ProfileApi.getProfile();
      applyProfile(data);
    } catch {
      if (!route.params?.profile) {
        Alert.alert('Profile', 'Could not load spiritual details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setEditing(false);
      loadProfile();
    }, []),
  );

  const cancelEdit = () => {
    setGothram(snapshot.gothram);
    setNakshatram(snapshot.nakshatram);
    setMaritalStatus(snapshot.maritalStatus);
    setEditing(false);
  };

  const saveSpiritual = async () => {
    setSaving(true);
    try {
      const updated = await ProfileApi.updateProfile({
        gothram: gothram.trim(),
        nakshatram: nakshatram.trim(),
        maritalStatus,
      });

      if (updated) {
        applyProfile(updated);
        const session = await hydrateSession();
        if (session.token) {
          await saveSession(session.token, {
            ...(session.user || {}),
            ...updated,
          });
        }
      }

      setEditing(false);
      Alert.alert('Saved', 'Spiritual details updated.');
    } catch (error: any) {
      Alert.alert(
        'Update failed',
        error?.response?.data?.message ||
          'Could not save spiritual details. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title="Spiritual Details" showBack tab="Profile">
        <ActivityIndicator color={Colors.leafGreen} style={{marginTop: 40}} />
      </ScreenLayout>
    );
  }

  if (!editing) {
    return (
      <ScreenLayout title="Spiritual Details" showBack tab="Profile">
        <Row label="Gothram" value={gothram} />
        <Row label="Nakshatram" value={nakshatram} />
        <Row label="Marital status" value={maritalStatus} />
        <PrimaryButton title="EDIT DETAILS" onPress={() => setEditing(true)} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Edit Spiritual Details" showBack tab="Profile">
      <Text style={styles.label}>Gothram</Text>
      <TextInput
        style={styles.input}
        value={gothram}
        onChangeText={setGothram}
        placeholder="Enter Gothram"
      />

      <Text style={styles.label}>Nakshatram</Text>
      <TextInput
        style={styles.input}
        value={nakshatram}
        onChangeText={setNakshatram}
        placeholder="Enter Nakshatram"
      />

      <Text style={styles.label}>Marital status</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={maritalStatus}
          onValueChange={value =>
            setMaritalStatus(value as 'Bachelor' | 'Married')
          }>
          <Picker.Item label="Bachelor" value="Bachelor" />
          <Picker.Item label="Married" value="Married" />
        </Picker>
      </View>

      {saving ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 16}} />
      ) : (
        <>
          <PrimaryButton title="SAVE" onPress={saveSpiritual} />
          <View style={styles.gap} />
          <PrimaryButton title="CANCEL" onPress={cancelEdit} />
        </>
      )}
    </ScreenLayout>
  );
};

export default SpiritualDetailsScreen;

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  rowLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 4,
  },
  rowValue: {
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gap: {
    height: 12,
  },
});
