import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import {useLanguage} from '../../i18n/LanguageContext';

type TicketItem = {
  id: number;
  subject: string;
  message: string;
  adminReply: string | null;
  status: string;
  createdAt?: string;
};

const statusLabel = (status: string, t: (key: string) => string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'RESOLVED' || value === 'CLOSED') {
    return t('ticketSolved');
  }
  if (value === 'IN_PROGRESS') {
    return t('ticketInProgress');
  }
  return t('ticketOpen');
};

const MyTicketsScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/customer-care');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setTickets(
        rows.map((row: any) => ({
          id: Number(row.id),
          subject: String(row.subject || ''),
          message: String(row.message || ''),
          adminReply: row.adminReply ? String(row.adminReply) : null,
          status: String(row.status || 'OPEN').toUpperCase(),
          createdAt: row.createdAt,
        })),
      );
    } catch (error) {
      setTickets([]);
      Alert.alert(
        t('myTickets'),
        getApiError(error, 'Could not load your tickets.'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScreenLayout title={t('myTickets')} showBack tab="Profile">
      <Text style={styles.sub}>{t('myTicketsSub')}</Text>

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 20}} />
      ) : null}

      {!loading && tickets.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>{t('noTicketsYet')}</Text>
          <PrimaryButton
            title={t('raiseTicket')}
            onPress={() => navigation.navigate('RaiseTicket')}
          />
        </View>
      ) : null}

      {tickets.map(item => {
        const solved =
          item.status === 'RESOLVED' || item.status === 'CLOSED';
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.code}>TK{item.id}</Text>
              <Text
                style={[
                  styles.badge,
                  solved ? styles.badgeSolved : styles.badgeOpen,
                ]}>
                {statusLabel(item.status, t)}
              </Text>
            </View>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={styles.message} numberOfLines={4}>
              {item.message}
            </Text>
            {item.adminReply ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>{t('supportReply')}</Text>
                <Text style={styles.replyText}>{item.adminReply}</Text>
              </View>
            ) : (
              <Text style={styles.waiting}>{t('waitingForSupport')}</Text>
            )}
          </View>
        );
      })}
    </ScreenLayout>
  );
};

export default MyTicketsScreen;

const styles = StyleSheet.create({
  sub: {
    marginBottom: 16,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  emptyWrap: {gap: 16, marginTop: 8},
  empty: {color: Colors.textSecondary, marginBottom: 4},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  code: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
  },
  badge: {
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeOpen: {
    backgroundColor: '#FFF4E5',
    color: Colors.sacredBrown,
  },
  badgeSolved: {
    backgroundColor: '#E8F5E9',
    color: Colors.leafGreen,
  },
  subject: {
    marginTop: 8,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  message: {
    marginTop: 6,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  replyBox: {
    marginTop: 12,
    backgroundColor: '#F7F3EA',
    borderRadius: 12,
    padding: 12,
  },
  replyLabel: {
    fontWeight: '800',
    color: Colors.leafGreen,
    marginBottom: 4,
  },
  replyText: {
    color: Colors.sacredBrown,
    lineHeight: 20,
  },
  waiting: {
    marginTop: 12,
    color: Colors.textLight,
    fontWeight: '600',
  },
});
