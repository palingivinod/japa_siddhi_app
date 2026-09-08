import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {
  ADMIN_FEEDBACK,
  AdminFeedback,
  AdminTicketStatus,
} from './adminData';

const nextStatus = (status: AdminTicketStatus): AdminTicketStatus =>
  status === 'Pending' ? 'Resolved' : 'Pending';

const AdminFeedbackScreen = () => {
  const [items, setItems] = useState<AdminFeedback[]>(ADMIN_FEEDBACK);

  const cycle = (id: string) => {
    setItems(current =>
      current.map(item =>
        item.id === id ? {...item, status: nextStatus(item.status)} : item,
      ),
    );
  };

  return (
    <AdminScreenLayout
      title="Feedback Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Feedback Management</Text>
      <Text style={styles.sub}>Review ratings and comments.</Text>

      {items.map(item => {
        const pending = item.status === 'Pending';
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.rating} • {item.comment}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.pill,
                pending ? styles.pillPending : styles.pillResolved,
              ]}
              onPress={() => cycle(item.id)}>
              <Text
                style={[
                  styles.pillText,
                  pending ? styles.pillTextPending : styles.pillTextResolved,
                ]}>
                {item.status}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
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
  pillPending: {borderColor: Colors.sacredBrown},
  pillResolved: {borderColor: Colors.leafGreen},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextPending: {color: Colors.sacredBrown},
  pillTextResolved: {color: Colors.leafGreen},
});
