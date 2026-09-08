import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_BANNERS, AdminBanner, AdminBannerStatus} from './adminData';

const nextStatus = (status: AdminBannerStatus): AdminBannerStatus => {
  if (status === 'Active') {
    return 'Scheduled';
  }
  if (status === 'Scheduled') {
    return 'Blocked';
  }
  return 'Active';
};

const statusStyle = (status: AdminBannerStatus) => {
  if (status === 'Active') {
    return {border: Colors.leafGreen, text: Colors.leafGreen};
  }
  if (status === 'Scheduled') {
    return {border: Colors.templeGold, text: Colors.templeGold};
  }
  return {border: Colors.error, text: Colors.error};
};

const AdminBannersScreen = () => {
  const [banners, setBanners] = useState<AdminBanner[]>(ADMIN_BANNERS);

  const cycle = (id: string) => {
    setBanners(current =>
      current.map(item =>
        item.id === id ? {...item, status: nextStatus(item.status)} : item,
      ),
    );
  };

  return (
    <AdminScreenLayout title="Banner Management" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Banner Management</Text>
      <Text style={styles.sub}>Manage banners across app modules.</Text>

      {banners.map(item => {
        const tone = statusStyle(item.status);
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.module}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, {borderColor: tone.border}]}
              onPress={() => cycle(item.id)}>
              <Text style={[styles.pillText, {color: tone.text}]}>
                {item.status}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <PrimaryButton
        title="ADD BANNER"
        onPress={() =>
          Alert.alert('Add banner', 'Banner editor will be wired next.')
        }
      />
    </AdminScreenLayout>
  );
};

export default AdminBannersScreen;

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
  pillText: {fontWeight: '800', fontSize: 13},
});
