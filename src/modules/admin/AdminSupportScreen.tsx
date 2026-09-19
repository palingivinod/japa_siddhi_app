import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

type TicketRow = {
  id: string;
  code: string;
  userId?: string | number | null;
  userName?: string;
  subject: string;
  message?: string;
  screenshotUrl?: string | null;
  adminReply?: string | null;
  status: string;
};

const statusLabel = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'RESOLVED' || value === 'CLOSED') {
    return 'Solved';
  }
  if (value === 'IN_PROGRESS') {
    return 'In progress';
  }
  return 'Open';
};

const AdminSupportScreen = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/support-tickets');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setTickets(
        rows.map((row: any) => ({
          id: String(row.id),
          code: row.code || `TK${row.id}`,
          userId: row.userId ?? null,
          userName: String(row.userName || '').trim(),
          subject: row.subject || '',
          message: row.message || '',
          screenshotUrl: row.screenshotUrl || null,
          adminReply: row.adminReply || null,
          status: String(row.status || 'OPEN').toUpperCase(),
        })),
      );
      setDrafts(prev => {
        const next = {...prev};
        rows.forEach((row: any) => {
          const id = String(row.id);
          if (next[id] == null) {
            next[id] = String(row.adminReply || '');
          }
        });
        return next;
      });
    } catch (err) {
      setTickets([]);
      Alert.alert(
        'Support',
        getApiError(err, 'Could not load support tickets.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const sendReply = async (item: TicketRow, status: 'IN_PROGRESS' | 'RESOLVED') => {
    const reply = String(drafts[item.id] || '').trim();
    if (!reply) {
      Alert.alert('Reply', 'Write a reply for the devotee first.');
      return;
    }
    setSavingId(item.id);
    try {
      await apiService.put(`/admin/support-tickets/${item.id}/reply`, {
        reply,
        status,
      });
      Alert.alert(
        'Support',
        status === 'RESOLVED'
          ? 'Reply sent and ticket marked solved.'
          : 'Reply sent. Ticket stays in progress.',
      );
      await load();
    } catch (err) {
      Alert.alert('Support', getApiError(err, 'Could not send reply.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminScreenLayout
      title="Customer Support Ticket Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Customer Support Ticket Management</Text>
      <Text style={styles.sub}>
        Reply to the devotee and mark the ticket solved when done. They get an
        in-app note and a phone popup.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 20}} />
      ) : null}

      {!loading && tickets.length === 0 ? (
        <Text style={styles.empty}>No support tickets yet.</Text>
      ) : null}

      {tickets.map(item => {
        const busy = savingId === item.id;
        const solved =
          item.status === 'RESOLVED' || item.status === 'CLOSED';
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.code}</Text>
              <Text
                style={[
                  styles.badge,
                  solved ? styles.badgeSolved : styles.badgeOpen,
                ]}>
                {statusLabel(item.status)}
              </Text>
            </View>
            <Text style={styles.meta}>
              User ID: {item.userId != null ? String(item.userId) : '—'}
            </Text>
            <Text style={styles.meta}>
              User Name:{' '}
              {item.userName ||
                (item.userId != null ? `User #${item.userId}` : '—')}
            </Text>
            <Text style={styles.meta}>{item.subject}</Text>
            {item.message ? (
              <Text style={styles.message}>{item.message}</Text>
            ) : null}
            {item.screenshotUrl ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(String(item.screenshotUrl))}>
                <Text style={styles.link}>Open screenshot</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noMedia}>No screenshot attached</Text>
            )}

            <Text style={styles.replyLabel}>Admin reply</Text>
            <TextInput
              style={styles.replyInput}
              value={drafts[item.id] || ''}
              onChangeText={text =>
                setDrafts(prev => ({...prev, [item.id]: text}))
              }
              placeholder="Write your response to the devotee"
              placeholderTextColor={Colors.placeholder}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionSecondary]}
                disabled={busy}
                onPress={() => sendReply(item, 'IN_PROGRESS')}>
                <Text style={styles.actionSecondaryText}>
                  {busy ? '...' : 'Reply (keep open)'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionPrimary]}
                disabled={busy}
                onPress={() => sendReply(item, 'RESOLVED')}>
                <Text style={styles.actionPrimaryText}>
                  {busy ? '...' : 'Reply & mark solved'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminSupportScreen;

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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
    flex: 1,
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
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  message: {
    marginTop: 8,
    color: Colors.sacredBrown,
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
  replyLabel: {
    marginTop: 14,
    marginBottom: 6,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  replyInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.sacredBrown,
    backgroundColor: Colors.white,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionSecondary: {
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    backgroundColor: Colors.white,
  },
  actionPrimary: {
    backgroundColor: Colors.templeGold,
  },
  actionSecondaryText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  actionPrimaryText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
});
