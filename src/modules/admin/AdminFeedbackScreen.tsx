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
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminFeedback} from './adminData';

const AdminFeedbackScreen = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/feedback');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setItems(
        rows.map((row: any) => ({
          id: String(row.id),
          name: row.name || `Feedback #${row.id}`,
          userId: row.userId ? String(row.userId) : '',
          userCode: String(row.userCode || '').trim(),
          mobileNumber: row.mobileNumber || '',
          japaCount: Number(row.japaCount) || 0,
          rating: row.rating || '',
          comment: row.comment || '',
          videoUrl: row.videoUrl || null,
          status: 'Pending',
        })),
      );
    } catch (err) {
      setItems([]);
      Alert.alert('Feedback', getApiError(err, 'Could not load feedback.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <AdminScreenLayout
      title="Feedback Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Feedback Management</Text>
      <Text style={styles.sub}>
        Ratings, comments, and any attached videos. Details are also emailed to
        admin.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 20}} />
      ) : null}

      {!loading && items.length === 0 ? (
        <Text style={styles.empty}>No feedback yet.</Text>
      ) : null}

      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('AdminFeedbackDetails', {
                feedbackId: item.id,
                userId: item.userId,
                name: item.name,
                userCode: item.userCode,
                mobileNumber: item.mobileNumber,
                japaCount: item.japaCount,
                rating: item.rating,
                comment: item.comment,
                videoUrl: item.videoUrl,
              })
            }
            activeOpacity={0.7}>
            <Text style={styles.name}>{item.name}</Text>
          </TouchableOpacity>
          {item.mobileNumber ? (
            <Text style={styles.contact}>{item.mobileNumber}</Text>
          ) : null}
          <Text style={styles.meta}>
            {item.rating ? `${item.rating} • ` : ''}
            {item.comment}
          </Text>
          {item.videoUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(String(item.videoUrl))}>
              <Text style={styles.link}>Open feedback video</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noMedia}>No video attached</Text>
          )}
        </View>
      ))}
    </AdminScreenLayout>
  );
};

export default AdminFeedbackScreen;

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
  empty: {color: Colors.textSecondary, marginBottom: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  name: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
  },
  contact: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
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
