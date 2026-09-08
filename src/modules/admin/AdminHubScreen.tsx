import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import {ADMIN_FRAMES} from './adminCatalog';
import {getAdminSession} from './adminSession';

const AdminHubScreen = () => {
  const navigation = useNavigation<any>();
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setChecking(true);
      getAdminSession().then(session => {
        if (!alive) {
          return;
        }
        setChecking(false);
        if (session) {
          navigation.replace('AdminDashboard');
        }
      });
      return () => {
        alive = false;
      };
    }, [navigation]),
  );

  if (checking) {
    return (
      <ScreenLayout title="Admin" showBack>
        <ActivityIndicator color={Colors.templeGold} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Admin" showBack>
      <Text style={styles.heading}>Admin panel</Text>
      <Text style={styles.sub}>
        Batches 1–6 are ready (Login through Export Reports). Open admin login
        to explore the new screens.
      </Text>

      <PrimaryButton
        title="OPEN ADMIN LOGIN"
        onPress={() => navigation.navigate('AdminLogin')}
      />

      <View style={styles.list}>
        {ADMIN_FRAMES.map(frame => (
          <View key={frame.id} style={styles.card}>
            <Text style={styles.cardTitle}>{frame.title}</Text>
            <Text style={styles.badge}>{frame.status.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
};

export default AdminHubScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  sub: {
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  list: {
    marginTop: 18,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  badge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
