import React, {useEffect, useState} from 'react';
import {StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const MilestoneNotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const [enabled, setEnabled] = useState(true);
  const [total, setTotal] = useState(0);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    apiService
      .get('/japa/milestones')
      .then(response => {
        const data = response.data.data || {};
        setTotal(Number(data.total || 0));
        setUpcoming(data.upcoming || []);
      })
      .catch(() => undefined);
  }, []);

  return (
    <ScreenLayout title="Notifications" showBack tab="SevaHub">
      <View style={styles.head}>
        <View style={styles.copy}>
          <Text style={styles.title}>Japa Milestones</Text>
          <Text style={styles.sub}>
            Celebrate your spiritual progress and seva milestones.
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>1 New</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.meta}>JAPA MILESTONE  ·  Just now</Text>
        <Text style={styles.headline}>
          {Math.max(total, 10000).toLocaleString()} Japas Completed!
        </Text>
        <Text style={styles.body}>
          You have completed {Math.max(total, 10000).toLocaleString()} Japas.
          Consider sponsoring Annadanam for greater spiritual benefit.
        </Text>
        <View style={styles.actions}>
          <View style={styles.ghost}>
            <Text style={styles.ghostText}>1,000 / 1,000</Text>
          </View>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('JapaAnnadanam')}>
            <Text style={styles.ctaText}>PERFORM ANNADHANAM</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.foot}>Milestone notification</Text>
      </View>
      <Text style={styles.title}>Upcoming Milestones</Text>
      {(upcoming.length
        ? upcoming
        : [
            {target: 500, title: '500 Japas', subtitle: 'Keep going — you are halfway there.'},
            {target: 2000, title: '2,000 Japas', subtitle: 'A new spiritual milestone awaits you.'},
          ]
      ).map(item => (
        <View key={item.target} style={styles.row}>
          <View style={styles.circle}>
            <Text style={styles.circleText}>
              {item.target >= 1000 ? `${item.target / 1000}K` : item.target}
            </Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.sub}>{item.subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      ))}
      <View style={styles.toggle}>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>Milestone Notifications</Text>
          <Text style={styles.sub}>
            Get notified when you reach important Japa counts.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{true: Colors.leafGreen}}
        />
      </View>
    </ScreenLayout>
  );
};

export default MilestoneNotificationsScreen;

const styles = StyleSheet.create({
  head: {flexDirection: 'row', marginBottom: 14},
  copy: {flex: 1},
  title: {fontSize: 20, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 4, color: Colors.textSecondary},
  badge: {
    backgroundColor: Colors.templeGold,
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 28,
    justifyContent: 'center',
  },
  badgeText: {color: Colors.white, fontWeight: '800', fontSize: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 18,
  },
  meta: {color: Colors.leafGreen, fontWeight: '800', fontSize: 12},
  headline: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  body: {marginTop: 8, color: Colors.sacredBrown, lineHeight: 20},
  actions: {flexDirection: 'row', gap: 8, marginTop: 14},
  ghost: {
    flex: 1,
    backgroundColor: Colors.cream,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  ghostText: {color: Colors.leafGreen, fontWeight: '800'},
  cta: {
    flex: 1.4,
    backgroundColor: Colors.templeGold,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  ctaText: {color: Colors.white, fontWeight: '800', fontSize: 11},
  foot: {marginTop: 10, color: Colors.textLight},
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleText: {fontWeight: '800', color: Colors.templeGold},
  rowTitle: {fontWeight: '800', color: Colors.sacredBrown},
  chevron: {fontSize: 22, color: Colors.textLight},
  toggle: {
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
