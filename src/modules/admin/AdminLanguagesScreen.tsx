import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import {APP_LANGUAGES} from '../../services/language';
import apiService, {getApiError} from '../../services/apiService';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';

type LangItem = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  active: boolean;
};

const AdminLanguagesScreen = () => {
  const {language, setAppLanguage} = useLanguage();
  const [languages, setLanguages] = useState<LangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/languages');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setLanguages(
        rows.map((row: any) => ({
          id: String(row.id),
          code: String(row.code || ''),
          name: String(row.name || ''),
          nativeName: String(row.nativeName || row.name || ''),
          active: Boolean(row.active),
        })),
      );
    } catch (err) {
      setLanguages([]);
      Alert.alert('Error', getApiError(err, 'Could not load languages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async (item: LangItem) => {
    setBusyId(item.id);
    try {
      const response = await apiService.put(`/admin/languages/${item.id}/status`, {
        active: !item.active,
      });
      const updated = response.data?.data;
      setLanguages(current =>
        current.map(row =>
          row.id === item.id
            ? {
                ...row,
                active: updated ? Boolean(updated.active) : !item.active,
              }
            : row,
        ),
      );
    } catch (err) {
      Alert.alert('Update failed', getApiError(err, 'Could not update language.'));
    } finally {
      setBusyId('');
    }
  };

  const selectLanguage = async (item: LangItem) => {
    if (!item.active) {
      Alert.alert(
        'Inactive language',
        'Activate this language first, then select it for the app.',
      );
      return;
    }
    try {
      await setAppLanguage(item.code);
      try {
        await apiService.put('/profile/settings', {languageCode: item.code});
      } catch {
        // local language still applied
      }
      Alert.alert('Language changed', `App language set to ${item.name}.`);
    } catch (err) {
      Alert.alert(
        'Language failed',
        getApiError(err, 'Could not change app language.'),
      );
    }
  };

  const addLanguage = () => {
    const existing = new Set(languages.map(item => item.code));
    const options = APP_LANGUAGES.filter(item => !existing.has(item.code)).slice(
      0,
      5,
    );
    if (!options.length) {
      // Re-enable inactive ones from list picker of inactive
      const inactive = languages.filter(item => !item.active);
      if (!inactive.length) {
        Alert.alert('Add language', 'All supported languages are already added.');
        return;
      }
      Alert.alert(
        'Enable language',
        'Choose a language to activate.',
        [
          ...inactive.slice(0, 5).map(item => ({
            text: item.name,
            onPress: () => toggle({...item, active: false}),
          })),
          {text: 'Cancel', style: 'cancel' as const},
        ],
      );
      return;
    }

    Alert.alert(
      'Add language',
      'Choose a language to add.',
      [
        ...options.map(item => ({
          text: item.name,
          onPress: async () => {
            try {
              await apiService.post('/admin/languages', {
                code: item.code,
                name: item.name,
                nativeName: item.nativeName,
              });
              await load();
            } catch (err) {
              Alert.alert(
                'Add failed',
                getApiError(err, 'Could not add language.'),
              );
            }
          },
        })),
        {text: 'Cancel', style: 'cancel' as const},
      ],
    );
  };

  return (
    <AdminScreenLayout
      title="Language Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Language Management</Text>
      <Text style={styles.sub}>
        Tap a language to change the app language. Use Active/Inactive to control
        what users can choose.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {languages.map(item => {
        const selected = item.code === language;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => selectLanguage(item)}
            activeOpacity={0.85}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.nativeName !== item.name ? `${item.nativeName} · ` : ''}
                {selected ? 'Selected' : item.active ? 'Available' : 'Hidden'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, item.active ? styles.pillOn : styles.pillOff]}
              disabled={busyId === item.id}
              onPress={() => toggle(item)}>
              <Text
                style={[
                  styles.pillText,
                  item.active ? styles.pillTextOn : styles.pillTextOff,
                ]}>
                {busyId === item.id
                  ? '...'
                  : item.active
                    ? 'Active'
                    : 'Inactive'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}

      <PrimaryButton title="ADD LANGUAGE" onPress={addLanguage} />
    </AdminScreenLayout>
  );
};

export default AdminLanguagesScreen;

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
  center: {paddingVertical: 20, alignItems: 'center'},
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
  cardSelected: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#F3F7EF',
  },
  copy: {flex: 1},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillOn: {borderColor: Colors.leafGreen},
  pillOff: {borderColor: Colors.error},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.error},
});
