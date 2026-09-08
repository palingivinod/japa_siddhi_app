import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_CHALLENGES, AdminChallenge} from './adminData';

const StatusPill = ({status}: {status: AdminChallenge['status']}) => {
  const completed = status === 'Completed';
  return (
    <View
      style={[
        styles.pill,
        completed ? styles.pillCompleted : styles.pillActive,
      ]}>
      <Text
        style={[
          styles.pillText,
          completed ? styles.pillTextCompleted : styles.pillTextActive,
        ]}>
        {status}
      </Text>
    </View>
  );
};

const AdminChallengesScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <AdminScreenLayout title="Challenge Management" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Challenge Management</Text>
      <Text style={styles.sub}>Track active and completed challenges.</Text>

      {ADMIN_CHALLENGES.map(item => (
        <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.9}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.detail}</Text>
          </View>
          <StatusPill status={item.status} />
        </TouchableOpacity>
      ))}

      <PrimaryButton
        title="CREATE CHALLENGE"
        onPress={() => navigation.navigate('AdminChallengeCreate')}
      />
    </AdminScreenLayout>
  );
};

export default AdminChallengesScreen;

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
  pillActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: Colors.white,
  },
  pillCompleted: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#E4EFDF',
  },
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextActive: {color: Colors.leafGreen},
  pillTextCompleted: {color: Colors.leafGreen},
});
