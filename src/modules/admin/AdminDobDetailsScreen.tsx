import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import SelectField from '../common/SelectField';
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
  fullName: string;
  phone: string;
  date?: string;
  forWhom?: string;
  personName?: string;
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

const handleWhatsApp = (mobile?: string, text?: string) => {
  let clean = digitsPhone(mobile);
  if (!clean) {
    return;
  }
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  const url = text
    ? `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${clean}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('WhatsApp Error', 'Unable to open WhatsApp.');
  });
};

const AdminDobDetailsScreen = () => {
  const [period, setPeriod] = useState('');
  const [openType, setOpenType] = useState<SectionType | ''>('');
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<PersonRow[]>([]);

  useEffect(() => {
    setOpenType('');
    setPeople([]);
  }, [period]);

  const loadSection = async (type: SectionType) => {
    if (!period) {
      Alert.alert(
        'Select a period',
        'Choose a month or Total year, then open a list.',
      );
      return;
    }
    if (openType === type) {
      setOpenType('');
      setPeople([]);
      return;
    }
    setOpenType(type);
    setLoading(true);
    setPeople([]);
    try {
      const response = await apiService.get('/admin/dob-details', {
        params: {type, month: period},
      });
      const rows = Array.isArray(response.data?.data?.people)
        ? response.data.data.people
        : [];
      setPeople(
        rows.map((row: any) => ({
          id: String(row.id || ''),
          fullName: String(row.fullName || 'Devotee'),
          phone: String(row.phone || ''),
          date: String(row.date || ''),
          forWhom: String(row.forWhom || ''),
          personName: String(row.personName || ''),
        })),
      );
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

  return (
    <AdminScreenLayout title="DOB / other details" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>DOB / other details</Text>
      <Text style={styles.sub}>
        Choose a month or Total year, then open a list. Call or WhatsApp each
        devotee from the row.
      </Text>
      <Text style={styles.monthLabel}>Date of birth / prefer date</Text>
      <SelectField
        value={period}
        onChange={setPeriod}
        placeholder="Select month or Total year"
        title="Select month or Total year"
        options={PERIODS}
      />
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
                  people.map(person => {
                    const hasPhone = digitsPhone(person.phone).length >= 5;
                    const meta = [
                      person.date,
                      person.forWhom,
                      person.personName,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <View key={person.id} style={styles.personCard}>
                        <View style={styles.copy}>
                          <Text style={styles.name}>{person.fullName}</Text>
                          <Text style={styles.phone}>
                            {person.phone || 'No phone'}
                          </Text>
                          {meta ? (
                            <Text style={styles.meta}>{meta}</Text>
                          ) : null}
                        </View>
                        {hasPhone ? (
                          <View style={styles.contactActions}>
                            <TouchableOpacity
                              style={[styles.contactBtn, styles.phoneBtn]}
                              onPress={() => handleCall(person.phone)}
                              activeOpacity={0.7}>
                              <Text style={styles.contactIcon}>📞</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.contactBtn, styles.whatsappBtn]}
                              onPress={() =>
                                handleWhatsApp(
                                  person.phone,
                                  item.type === 'birthdays'
                                    ? 'Happy birthday'
                                    : undefined,
                                )
                              }
                              activeOpacity={0.7}>
                              <Text style={styles.contactIcon}>💬</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}
          </View>
        );
      })}
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
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  whatsappBtn: {
    backgroundColor: '#E7F8ED',
  },
  contactIcon: {
    fontSize: 18,
  },
});
