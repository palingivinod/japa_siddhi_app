import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

type FeedbackDetail = {
  name: string;
  userId: string;
  userCode: string;
  mobile: string;
  japaCount: number;
  rating: string;
  comment: string;
  videoUrl: string;
};

const handleCall = (mobile?: string) => {
  if (!mobile) {
    return;
  }
  const clean = mobile.replace(/[^\d+]/g, '');
  Linking.openURL(`tel:${clean}`).catch(() => {
    Alert.alert('Call Error', 'Unable to open phone dialer.');
  });
};

const handleWhatsApp = (mobile?: string) => {
  if (!mobile) {
    return;
  }
  let clean = mobile.replace(/[^\d]/g, '');
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  Linking.openURL(`https://wa.me/${clean}`).catch(() => {
    Alert.alert('WhatsApp Error', 'Unable to open WhatsApp.');
  });
};

const AdminFeedbackDetailsScreen = () => {
  const route = useRoute<any>();
  const params = route.params || {};
  const userId = String(params.userId || '');
  const [detail, setDetail] = useState<FeedbackDetail>({
    name: String(params.name || 'Devotee'),
    userId,
    userCode:
      String(params.userCode || '').trim() ||
      (userId ? `BPJS${userId.padStart(2, '0')}` : ''),
    mobile: String(params.mobileNumber || ''),
    japaCount: Number(params.japaCount) || 0,
    rating: String(params.rating || ''),
    comment: String(params.comment || ''),
    videoUrl: String(params.videoUrl || ''),
  });
  const [loading, setLoading] = useState(Boolean(userId));

  const loadUser = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.get(`/admin/users/${userId}`);
      const data = response.data?.data;
      if (!data) {
        return;
      }
      const id = String(data.id || userId);
      setDetail(current => ({
        ...current,
        name: data.name || current.name,
        userId: id,
        userCode:
          String(data.userCode || '').trim() ||
          `BPJS${id.padStart(2, '0')}`,
        mobile: data.mobile && data.mobile !== '—' ? data.mobile : current.mobile,
        japaCount: Number(data.japaCount) || 0,
      }));
    } catch {
      // Keep the values passed from the feedback list.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  const digits = detail.mobile.replace(/[^\d]/g, '');
  const canContact = digits.length >= 5;

  return (
    <AdminScreenLayout title="Feedback Details" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Feedback Details</Text>
      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={styles.loader} />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Devotee</Text>
        <Text style={styles.row}>Name: {detail.name}</Text>
        <Text style={styles.row}>
          User ID: {detail.userCode || detail.userId || '—'}
        </Text>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileText}>Mobile: {detail.mobile || '—'}</Text>
          {canContact ? (
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={[styles.contactBtn, styles.phoneBtn]}
                onPress={() => handleCall(detail.mobile)}
                activeOpacity={0.7}>
                <Text style={styles.contactBtnIcon}>📞</Text>
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, styles.whatsappBtn]}
                onPress={() => handleWhatsApp(detail.mobile)}
                activeOpacity={0.7}>
                <Text style={styles.contactBtnIcon}>💬</Text>
                <Text style={styles.contactBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <Text style={styles.row}>
          Japa count: {detail.japaCount.toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Feedback</Text>
        {detail.rating ? <Text style={styles.row}>{detail.rating}</Text> : null}
        <Text style={styles.comment}>{detail.comment || '—'}</Text>
        {detail.videoUrl ? (
          <TouchableOpacity onPress={() => Linking.openURL(detail.videoUrl)}>
            <Text style={styles.link}>Open feedback video</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noMedia}>No video attached</Text>
        )}
      </View>
    </AdminScreenLayout>
  );
};

export default AdminFeedbackDetailsScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 16,
  },
  loader: {marginBottom: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 15,
  },
  mobileRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobileText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 15,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  phoneBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  contactBtnIcon: {fontSize: 13},
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  comment: {
    marginTop: 8,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  link: {
    marginTop: 10,
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  noMedia: {
    marginTop: 10,
    color: Colors.textLight,
  },
});
