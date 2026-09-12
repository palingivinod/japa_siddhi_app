import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {
  PrivateJapaGoal,
  chantParamsFromPrivateGoal,
  findOpenPrivateGoalByMantra,
  formatGoalDate,
  hasDateGoal,
  isOpenPrivateGoal,
  privateMantraLabel,
} from './privateJapa';

const PrivateJapaScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const addAnother = Boolean(route.params?.addAnother);
  const [mantra, setMantra] = useState('');
  const [openGoals, setOpenGoals] = useState<PrivateJapaGoal[]>([]);
  const [hadClosed, setHadClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(addAnother);

  const openChant = (goal: PrivateJapaGoal, replace = true) => {
    const params = chantParamsFromPrivateGoal(goal);
    if (replace) {
      navigation.replace('Chant', params);
      return;
    }
    navigation.navigate('Chant', params);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        let redirecting = false;
        try {
          const response = await apiService.get('/japa-goals');
          const rows: PrivateJapaGoal[] = response.data?.data ?? [];
          const open = rows.filter(isOpenPrivateGoal);
          if (!active) {
            return;
          }
          setOpenGoals(open);
          setHadClosed(
            rows.some(
              item =>
                String(item.mantraType || '').toUpperCase() === 'PERSONAL' &&
                !isOpenPrivateGoal(item) &&
                String(item.status || '').toUpperCase() !== 'CANCELLED',
            ),
          );
          if (addAnother) {
            setCreating(true);
            return;
          }
          if (open.length === 1) {
            redirecting = true;
            openChant(open[0], true);
            return;
          }
          setCreating(open.length === 0);
        } catch {
          if (active) {
            setCreating(true);
          }
        } finally {
          if (active && !redirecting) {
            setLoading(false);
          }
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [addAnother]),
  );

  const startNew = () => {
    const text = mantra.trim();
    if (!text) {
      return;
    }
    const existing = findOpenPrivateGoalByMantra(openGoals, text);
    if (existing) {
      openChant(existing);
      return;
    }
    navigation.replace('GoalSelect', {
      mode: 'private',
      privateMantra: text,
      addAnother: openGoals.length > 0 || addAnother,
    });
  };

  if (loading) {
    return (
      <ScreenLayout title="My Japa" showBack tab="JapaHub">
        <ActivityIndicator color={Colors.templeGold} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="My Japa" showBack tab="JapaHub">
      <Text style={styles.heading}>{t('privateJapaHeading')}</Text>
      {openGoals.length > 0 && !creating ? (
        <>
          <Text style={styles.label}>{t('activePrivateJapas')}</Text>
          {openGoals.map(item => {
            const target = Number(item.targetCount || 0);
            const done = Number(item.completedCount || 0);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.goalCard}
                activeOpacity={0.85}
                onPress={() => openChant(item, false)}>
                <Text style={styles.goalTitle}>{privateMantraLabel(item)}</Text>
                <Text style={styles.goalMeta}>
                  {t('privateJapaProgress', {
                    count: done.toLocaleString(),
                    goal: target.toLocaleString(),
                  })}
                </Text>
                {hasDateGoal(item) ? (
                  <Text style={styles.goalMeta}>
                    {t('privateJapaDeadline')}: {formatGoalDate(item.endDate)}
                  </Text>
                ) : null}
                <Text style={styles.continue}>{t('continuePrivateJapa')}</Text>
              </TouchableOpacity>
            );
          })}
          <OutlineButton
            title="ADD ANOTHER PRIVATE JAPA"
            onPress={() => setCreating(true)}
          />
          <Text style={styles.note}>{t('addAnotherPrivateJapaHint')}</Text>
        </>
      ) : (
        <>
          {openGoals.length > 0 ? (
            <Text style={styles.note}>{t('addAnotherPrivateJapaHint')}</Text>
          ) : hadClosed ? (
            <Text style={styles.note}>{t('privateGoalExpiredHint')}</Text>
          ) : null}
          <View style={styles.card}>
            <View style={styles.dot}>
              <Text style={styles.emoji}>📿</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{t('privateMantra')}</Text>
              <Text style={styles.meta}>{t('mantraHiddenSecure')}</Text>
            </View>
          </View>
          <Text style={styles.label}>{t('enterYourMantra')}</Text>
          <TextInput
            style={styles.input}
            value={mantra}
            onChangeText={setMantra}
            placeholder={t('keptPrivateReports')}
            placeholderTextColor={Colors.placeholder}
            secureTextEntry
          />
          <PrimaryButton
            title={
              openGoals.length > 0
                ? 'ADD ANOTHER PRIVATE JAPA'
                : 'START PRIVATE JAPA'
            }
            onPress={startNew}
            disabled={!mantra.trim()}
          />
          {openGoals.length > 0 ? (
            <View style={styles.gap}>
              <OutlineButton
                title="CONTINUE JAPA"
                onPress={() => {
                  setCreating(false);
                  if (openGoals.length === 1) {
                    openChant(openGoals[0], false);
                  }
                }}
              />
            </View>
          ) : null}
          <Text style={styles.note}>{t('reportsPrivateJapaOnly')}</Text>
        </>
      )}
    </ScreenLayout>
  );
};

export default PrivateJapaScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  goalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  goalTitle: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
  },
  goalMeta: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  continue: {
    marginTop: 10,
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4EFDF',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
  copy: {flex: 1},
  title: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  meta: {marginTop: 4, color: Colors.textSecondary},
  label: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 8},
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 18,
  },
  note: {
    marginTop: 14,
    textAlign: 'center',
    color: Colors.leafGreen,
    fontWeight: '600',
  },
  gap: {marginTop: 12},
});
