import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {
  alertExcelError,
  downloadAdminExcel,
} from './adminExcelDownload';

const AdminJapaScreen = () => {
  const navigation = useNavigation<any>();
  const [exporting, setExporting] = useState(false);

  const onDownloadJapaExcel = async () => {
    setExporting(true);
    try {
      await downloadAdminExcel(
        'japa',
        'Users japa sheet (date, mantra, counts & totals)',
      );
    } catch (err) {
      alertExcelError(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminScreenLayout title="Japa Management" tab="AdminJapa" showBack={false}>
      <Text style={styles.heading}>Japa Management</Text>
      <Text style={styles.sub}>
        Samuhika and Antharanga can each have their own categories and mantras.
        Use Both for items that should appear in both lists.
      </Text>

      <TouchableOpacity
        style={[styles.exportBtn, exporting && styles.exportBusy]}
        disabled={exporting}
        onPress={onDownloadJapaExcel}>
        {exporting ? (
          <ActivityIndicator color={Colors.sacredBrown} />
        ) : (
          <Text style={styles.exportText}>DOWNLOAD USERS JAPA EXCEL</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.listBtn}
        onPress={() => navigation.navigate('AdminMantras', {list: 'SAMUHIKA'})}>
        <Text style={styles.listTitle}>Samuhika Japa</Text>
        <Text style={styles.listMeta}>
          Categories and mantras only for Samuhika Japa (plus shared Both items).
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.listBtn}
        onPress={() =>
          navigation.navigate('AdminMantras', {list: 'ANTHARANGA'})
        }>
        <Text style={styles.listTitle}>Antharanga Japa</Text>
        <Text style={styles.listMeta}>
          Categories and mantras only for Antharanga Japa (plus shared Both
          items).
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.listBtn}
        onPress={() => navigation.navigate('AdminMantras', {list: 'BOTH'})}>
        <Text style={styles.listTitle}>Both</Text>
        <Text style={styles.listMeta}>
          Create categories and mantras that appear in Samuhika and Antharanga.
        </Text>
      </TouchableOpacity>
    </AdminScreenLayout>
  );
};

export default AdminJapaScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 12,
    color: Colors.textSecondary,
  },
  exportBtn: {
    marginBottom: 14,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  exportBusy: {opacity: 0.6},
  exportText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: 13,
  },
  listBtn: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  listMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
