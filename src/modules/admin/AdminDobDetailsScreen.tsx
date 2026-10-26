import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import Colors from '../../theme/colors';
import SelectField from '../common/SelectField';
import AdminScreenLayout from './AdminScreenLayout';
import {alertExcelError, downloadAdminExcel} from './adminExcelDownload';

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

const SHEETS = [
  {type: 'birthdays', label: 'Birthdays XL'},
  {type: 'jayanthi', label: 'Jayanthi XL'},
  {type: 'vardhanti', label: 'Vardhanti XL'},
  {type: 'anniversary', label: 'Anniversary XL'},
];

const AdminDobDetailsScreen = () => {
  const [exporting, setExporting] = useState('');
  const [period, setPeriod] = useState('');

  const downloadExcel = async (type: string, label: string) => {
    if (!period) {
      Alert.alert(
        'Select a period',
        'Choose a month or Total year, then download the sheet.',
      );
      return;
    }
    setExporting(type);
    try {
      await downloadAdminExcel(type, label, {month: period});
    } catch (err) {
      alertExcelError(err);
    } finally {
      setExporting('');
    }
  };

  return (
    <AdminScreenLayout title="DOB / other details" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>DOB / other details</Text>
      <Text style={styles.sub}>
        Choose a month for that month only. Total year downloads every month in one sheet.
      </Text>
      <Text style={styles.monthLabel}>Date of birth / prefer date</Text>
      <SelectField
        value={period}
        onChange={setPeriod}
        placeholder="Select month or Total year"
        title="Select month or Total year"
        options={PERIODS}
      />
      {SHEETS.map(item => (
        <TouchableOpacity
          key={item.type}
          style={[styles.outlineBtn, exporting === item.type && styles.pillBusy]}
          disabled={Boolean(exporting)}
          onPress={() => downloadExcel(item.type, item.label)}>
          {exporting === item.type ? (
            <ActivityIndicator size="small" color={Colors.sacredBrown} />
          ) : (
            <Text style={styles.outlineText}>{item.label.toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      ))}
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
  pillBusy: {opacity: 0.6},
  outlineText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
