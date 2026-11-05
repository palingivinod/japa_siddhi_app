import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import AppIcon, {AppIconName} from '../../components/icons/AppIcon';
import {useLanguage} from '../../i18n/LanguageContext';
import {useTabSwipe} from '../../navigation/useTabSwipe';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import BottomTabs from '../common/BottomTabs';

const JapaHubScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [today, setToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [annadanamPrompt, setAnnadanamPrompt] = useState<{
    showCard: boolean;
    milestoneTarget: number;
    userTotal: number;
    isCustomTarget: boolean;
  } | null>(null);
  const [showLaterModal, setShowLaterModal] = useState(false);
  const [customCountInput, setCustomCountInput] = useState('');
  const [savingCustomCount, setSavingCustomCount] = useState(false);
  const tabSwipe = useTabSwipe('JapaHub');

  const items = useMemo(
    () => [
      {
        key: 'yourJapas',
        icon: 'prayer' as AppIconName,
        title: t('yourJapas') || 'Your Japas',
        sub: t('ongoingJapasSub') || 'View ongoing mantras & dynamic goals',
        route: 'YourJapas',
        tone: 'gold' as const,
      },
      {
        key: 'community',
        icon: 'om' as AppIconName,
        title: t('communityJapa'),
        sub: t('communityJapaSub'),
        route: 'CommunityJapa',
        tone: 'green' as const,
      },
      {
        key: 'private',
        icon: 'mala' as AppIconName,
        title: t('myJapa'),
        sub: t('myJapaSub'),
        route: 'PrivateJapa',
        tone: 'green' as const,
      },
      {
        key: 'challenge',
        icon: 'trophy' as AppIconName,
        title: t('challengeJapa'),
        sub: t('challengeJapaSub'),
        route: 'Challenges',
        tone: 'green' as const,
      },
      {
        key: 'analytics',
        icon: 'chart' as AppIconName,
        title: t('japaAnalytics'),
        sub: t('japaAnalyticsSub'),
        route: 'AnalyticsHub',
        tone: 'gold' as const,
      },
    ],
    [t],
  );

  useFocusEffect(
    useCallback(() => {
            apiService
        .get('/japa/summary')
        .then(response => {
          const data = response.data.data ?? {};
          setToday(Number(data.todayJapaCount ?? data.todayCount ?? 0));
          setStreak(Number(data.streakDays ?? data.currentStreak ?? 0));
        })
        .catch(() => undefined);

      apiService
        .get('/japa/annadanam-prompt')
        .then(response => {
          const data = response.data?.data;
          if (data) {
            setAnnadanamPrompt(data);
          }
        })
        .catch(() => undefined);
    }, []),
  );


  const handleSaveCustomTarget = async () => {
    const rawVal = customCountInput.replace(/\D/g, '');
    const count = parseInt(rawVal, 10);
    const currentTotal = Number(annadanamPrompt?.userTotal || 0);

    if (!count || count <= currentTotal) {
      Alert.alert(
        t('validationTitle') || 'Invalid Count',
        `Please enter a count greater than your current total of ${currentTotal.toLocaleString()} Japas.`,
      );
      return;
    }

    setSavingCustomCount(true);
    try {
      await apiService.post('/japa/annadanam-prompt/custom-target', {
        customTarget: count,
      });
      setShowLaterModal(false);
      setCustomCountInput('');
      setAnnadanamPrompt(prev =>
        prev
          ? {
              ...prev,
              showCard: false,
              milestoneTarget: count,
              isCustomTarget: true,
            }
          : null,
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Could not save target count.',
      );
    } finally {
      setSavingCustomCount(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
      {...tabSwipe.panHandlers}>
      <View style={styles.body}>
        <AppHeader title="Japa Chanting" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled">
                    {annadanamPrompt?.showCard ? (
            <View style={styles.annadanamCard}>
              <View style={styles.annadanamCardHeader}>
                <View style={styles.annadanamBadge}>
                  <Text style={styles.annadanamBadgeText}>🍲 ANNA SANTHARPANA</Text>
                </View>
                <Text style={styles.annadanamOm}>🕉️</Text>
              </View>

              <Text style={styles.annadanamCardTitle}>
                {'Sacred Milestone Reached! 🙏'}
              </Text>

              <Text style={styles.annadanamCardBody}>
                {annadanamPrompt.userTotal === annadanamPrompt.milestoneTarget
                  ? `Congratulations! You have completed ${annadanamPrompt.userTotal.toLocaleString()} sacred Japas. Would you like to dedicate your sadhana by offering Anna Santharpana (Food Donation) for devotees and seekers?`
                  : `You have completed ${annadanamPrompt.userTotal.toLocaleString()} sacred Japas! On this blessed occasion, dedicate your sadhana by offering Anna Santharpana for devotees.`}
              </Text>

              <View style={styles.annadanamActions}>
                <TouchableOpacity
                  style={styles.annadanamPerformBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('JapaAnnadanam')}>
                  <Text style={styles.annadanamPerformBtnText}>
                    {'Perform Annadanam'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.annadanamLaterBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    const currentTotal = annadanamPrompt.userTotal || 5000;
                    const suggest = (Math.ceil((currentTotal + 1) / 1000) * 1000).toString();
                    setCustomCountInput(suggest);
                    setShowLaterModal(true);
                  }}>
                  <Text style={styles.annadanamLaterBtnText}>
                    {t('later') || 'Later'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <Text style={styles.heading}>{t('chooseYourJapa')}</Text>
          {items.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(item.route)}>
              <View
                style={[
                  styles.iconWrap,
                  item.tone === 'green' ? styles.iconGreen : styles.iconGold,
                ]}>
                <AppIcon name={item.icon} size={44} color={Colors.sacredBrown} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.sub}>{item.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.recent}>{t('recentProgress')}</Text>
          <View style={styles.stats}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('JapaProgress')}>
              <AppIcon name="prayer" size={22} color={Colors.sacredBrown} />
              <Text style={styles.statLabel}>{t('todayJapaCountLabel')}</Text>
              <Text style={styles.statValue}>{today.toLocaleString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('StreakAnalytics')}>
              <AppIcon name="flame" size={22} color={Colors.sacredBrown} />
              <Text style={styles.statLabel}>{t('continuousDaysLabel')}</Text>
              <Text style={styles.statValue}>
                {streak} {t('days')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <BottomTabs active="JapaHub" />
      <Modal
        visible={showLaterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLaterModal(false)}>
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalCard}>
            <View style={styles.customModalIconCircle}>
              <Text style={styles.customModalIcon}>🍲</Text>
            </View>
            <Text style={styles.customModalTitle}>
              {'Choose Next Target Count'}
            </Text>
            <Text style={styles.customModalSub}>
              {`Current Count: ${(annadanamPrompt?.userTotal || 0).toLocaleString()} Japas`}
            </Text>
            <Text style={styles.customModalInstruction}>
              {t('enterTargetCountInstruction') ||
                'Please enter at which japa count you wish to offer Anna Santharpana:'}
            </Text>

            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customCountTextInput}
                keyboardType="numeric"
                placeholder={`e.g. ${((annadanamPrompt?.userTotal || 5000) + 2000).toLocaleString()}`}
                placeholderTextColor={Colors.placeholder}
                value={customCountInput}
                onChangeText={setCustomCountInput}
                maxLength={9}
                autoFocus
              />
            </View>

            <View style={styles.customModalBtnRow}>
              <TouchableOpacity
                style={styles.customModalCancelBtn}
                activeOpacity={0.8}
                disabled={savingCustomCount}
                onPress={() => setShowLaterModal(false)}>
                <Text style={styles.customModalCancelBtnText}>
                  {t('cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.customModalSaveBtn}
                activeOpacity={0.85}
                disabled={savingCustomCount}
                onPress={handleSaveCustomTarget}>
                <Text style={styles.customModalSaveBtnText}>
                  {savingCustomCount
                    ? 'Saving...'
                    : 'Set Target'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default JapaHubScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 12},
  scrollContent: {paddingBottom: 36},
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 10,
    includeFontPadding: true,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  iconGold: {
    backgroundColor: '#F3E2C6',
  },
  iconGreen: {
    backgroundColor: '#E4EFDF',
  },
  copy: {flex: 1, paddingVertical: 1},
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  sub: {
    marginTop: 2,
    color: '#4A3B2C',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: true,
  },
  chevron: {
    fontSize: 24,
    color: Colors.lightGold,
    fontWeight: '300',
    marginLeft: 4,
  },
  recent: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.leafGreen,
    includeFontPadding: true,
  },
  stats: {flexDirection: 'row', gap: 10},
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
    alignItems: 'center',
  },
  statLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: true,
  },
  statValue: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    includeFontPadding: true,
  },

  annadanamCard: {
    backgroundColor: '#FFFDF6',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#B8860B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  annadanamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  annadanamBadge: {
    backgroundColor: '#FEF3D6',
    borderWidth: 1,
    borderColor: '#E6C665',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  annadanamBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A6208',
    letterSpacing: 0.5,
  },
  annadanamOm: {
    fontSize: 20,
  },
  annadanamCardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
    includeFontPadding: true,
  },
  annadanamCardBody: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '600',
    color: '#5C4A38',
    marginBottom: 14,
    includeFontPadding: true,
  },
  annadanamActions: {
    flexDirection: 'row',
    gap: 10,
  },
  annadanamPerformBtn: {
    flex: 2,
    backgroundColor: '#0F5132',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F5132',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  annadanamPerformBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    includeFontPadding: true,
  },
  annadanamLaterBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annadanamLaterBtnText: {
    color: Colors.sacredBrown,
    fontSize: 14,
    fontWeight: '700',
    includeFontPadding: true,
  },
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  customModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFDF8',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  customModalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3D6',
    borderWidth: 1,
    borderColor: '#E6C665',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  customModalIcon: {
    fontSize: 28,
  },
  customModalTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    marginBottom: 4,
    includeFontPadding: true,
  },
  customModalSub: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#0F5132',
    textAlign: 'center',
    marginBottom: 12,
  },
  customModalInstruction: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '600',
    color: '#5C4A38',
    textAlign: 'center',
    marginBottom: 16,
    includeFontPadding: true,
  },
  customInputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  customCountTextInput: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  customModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  customModalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customModalCancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  customModalSaveBtn: {
    flex: 1.4,
    backgroundColor: '#0F5132',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F5132',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  customModalSaveBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

});
