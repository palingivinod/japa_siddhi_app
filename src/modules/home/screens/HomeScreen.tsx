import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Clipboard,
  Linking,
  Modal,
  NativeModules,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../../i18n/LanguageContext';
import AppIcon, {AppIconName} from '../../../components/icons/AppIcon';
import apiService from '../../../services/apiService';
import {
  buildPanchangShareText,
  emptyPanchang,
  festivalDateLabel,
  festivalName,
  formatPanchangDisplayDate,
  PanchangPayload,
} from '../../../services/panchang';
import {useTabSwipe} from '../../../navigation/useTabSwipe';
import {getLastChantedJapa, getStoredUser, hydrateSession, saveSession} from '../../../services/session';
import ProfileApi from '../../auth/services/profileApi';
import {promptRegion, regionMissing} from '../../../navigation/goHomeAfterAuth';
import {getJapaDraft} from '../../../services/japaDraft';
import Colors from '../../../theme/colors';
import {PLAYSTORE_URL} from '../../../constants/app';
import AppHeader from '../../common/AppHeader';
import BottomTabs from '../../common/BottomTabs';
import MilestoneProgressCard from '../../common/MilestoneProgressCard';
import PanchangDetails from '../../common/PanchangDetails';
import HomeBanner from '../components/HomeBanner';
import {istIsoDate} from '../../../utils/dateUtils';
import {
  readDailyPlanSnaps,
  resolveMantraDailyTarget,
  writeDailyPlanSnap,
} from '../../../utils/mantraDailyPlan';
import {getAppVersionName} from '../../../utils/appVersion';

type ActiveGoal = {
  id: number;
  goalName: string;
  mantraId?: number | null;
  personalMantraId?: number | null;
  mantraType?: string;
  mantraName?: string;
  targetCount: number;
  completedCount: number;
  todayCompletedCount?: number;
  dailyTarget?: number;
  remainingCount: number;
  startDate?: string;
  endDate?: string;
  status: string;
};

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const {t, tt, language} = useLanguage();
  const [name, setName] = useState('Devotee');
  const [today, setToday] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [activeJapaGoal, setActiveJapaGoal] = useState<ActiveGoal | null>(null);
  const [allActiveGoals, setAllActiveGoals] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [challenge, setChallenge] = useState<any>(null);
  const [milestone, setMilestone] = useState<any>(null);
  const [panchang, setPanchang] = useState<PanchangPayload>(emptyPanchang());
  const [panchangModalVisible, setPanchangModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Slow border blink so Panchangam / Meeting cards are easy to notice
  const cardBorderAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(cardBorderAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: false,
        }),
        Animated.timing(cardBorderAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: false,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [cardBorderAnim]);

  const panchangBorderColor = cardBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E8D2A6', '#8C531B'],
  });
  const panchangBorderWidth = cardBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.5, 2.5],
  });

  // Active meeting configured by Admin
  const [activeMeeting, setActiveMeeting] = useState<{
    enabled: boolean;
    title: string;
    link: string;
    time: string;
    scheduledAt?: string | null;
  } | null>(null);

  const [meetingCountdown, setMeetingCountdown] = useState<string>('');
  const [isMeetingLive, setIsMeetingLive] = useState<boolean>(true);

  const meetingBorderColor = cardBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isMeetingLive
      ? ['#F5D0A9', '#C28B38']
      : ['#FDE68A', '#D97706'],
  });
  const meetingBorderWidth = cardBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.5, 2.5],
  });

  // Calculate live ticking countdown to scheduled meeting time
  useEffect(() => {
    if (!activeMeeting || !activeMeeting.enabled) {
      setMeetingCountdown('');
      setIsMeetingLive(true);
      return;
    }

    const parseTargetTimestamp = (): number | null => {
      if (activeMeeting.scheduledAt) {
        const ms = new Date(activeMeeting.scheduledAt).getTime();
        if (!isNaN(ms) && ms > 0) {
          return ms;
        }
      }
      const raw = String(activeMeeting.time || '').trim();
      if (!raw) {
        return null;
      }

      // Direct ISO or full date parse
      const direct = new Date(raw).getTime();
      if (!isNaN(direct) && direct > 1000000000000) {
        return direct;
      }

      const now = new Date();
      // Match "3pm", "3:00 PM", "11:30 am", etc.
      const match12 = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (match12) {
        let h = parseInt(match12[1], 10);
        const m = match12[2] ? parseInt(match12[2], 10) : 0;
        const ampm = match12[3].toLowerCase();
        if (ampm === 'pm' && h < 12) {
          h += 12;
        }
        if (ampm === 'am' && h === 12) {
          h = 0;
        }
        const t = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h,
          m,
          0,
          0,
        );
        if (/tomorrow/i.test(raw)) {
          t.setDate(t.getDate() + 1);
        }
        return t.getTime();
      }

      // Match 24-hr "15:00", "09:30"
      const match24 = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        const t = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h,
          m,
          0,
          0,
        );
        if (/tomorrow/i.test(raw)) {
          t.setDate(t.getDate() + 1);
        }
        return t.getTime();
      }
      return null;
    };

    const updateCountdown = () => {
      const targetMs = parseTargetTimestamp();
      if (!targetMs) {
        setMeetingCountdown('');
        setIsMeetingLive(true);
        return;
      }

      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setMeetingCountdown('');
        setIsMeetingLive(true);
      } else {
        setIsMeetingLive(false);
        const totalSec = Math.floor(diff / 1000);
        const days = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        if (days > 0) {
          setMeetingCountdown(`${days}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`);
        } else if (h > 0) {
          setMeetingCountdown(`${pad(h)}h ${pad(m)}m ${pad(s)}s`);
        } else {
          setMeetingCountdown(`${pad(m)}m ${pad(s)}s`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeMeeting]);

  const onOpenMeeting = async (meetingUrl: string, meetingTitle?: string) => {
    const trimmed = String(meetingUrl || '').trim();
    if (!trimmed) {
      return;
    }
    const targetUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    try {
      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert(
        meetingTitle || t('lalithaSahasramClass') || 'Online Class',
        'Could not open Google Meet. Please ensure a browser or the Google Meet app is installed.',
      );
    }
  };

  const onMeetingCardPress = () => {
    if (!activeMeeting || !activeMeeting.link) {
      return;
    }
    if (!isMeetingLive) {
      Alert.alert(
        activeMeeting.title || t('lalithaSahasramClass') || 'Online Class',
        `Class is scheduled at ${activeMeeting.time || 'the announced time'}.\n\n⏳ Starts in: ${meetingCountdown}\n\nThe Join link will activate automatically when the countdown ends!`,
      );
      return;
    }
    onOpenMeeting(activeMeeting.link, activeMeeting.title);
  };
  const [homeBanners, setHomeBanners] = useState<
    Array<{
      id: number;
      title: string;
      subtitle: string;
      imageUrl: string;
      buttonText?: string;
    }>
  >([]);
  const [annadanamVisibility, setAnnadanamVisibility] = useState({
    japa: true,
    general: true,
    campaigns: true,
    any: true,
  });

  const tiles = useMemo(
    () => [
      {
        title: t('tileJapaChanting'),
        sub: t('tileJapaSub'),
        route: 'JapaHub',
        icon: 'prayer' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileBaanalingam'),
        sub: t('tileBaanalingamSub'),
        route: 'BanaLingam',
        icon: 'banalingam' as AppIconName,
        tone: 'green' as const,
      },
      {
        title: t('tileAnnadanam'),
        sub: t('tileAnnadanamSub'),
        route: 'Donate',
        icon: 'bowl' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileMonthlySupport'),
        sub: t('tileMonthlySupportSub'),
        route: 'MonthlySupport',
        icon: 'bowl' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileNithyaHomam'),
        sub: t('tileNithyaHomamSub'),
        route: 'NithyaHomam',
        icon: 'flame' as AppIconName,
        tone: 'green' as const,
      },
      {
        title: t('tileRamakoti'),
        sub: t('tileRamakotiSub'),
        route: 'RamakotiBooks',
        icon: 'ramakoti' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileHomaBhasma'),
        sub: t('tileHomaBhasmaSub'),
        route: 'HomaBhasma',
        icon: 'homaBhasma' as AppIconName,
        tone: 'green' as const,
      },
      {
        title: t('tileBirava'),
        sub: t('tileBiravaSub'),
        route: 'BiravaPendant',
        icon: 'biravaPendant' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileOrders'),
        sub: t('tileOrdersSub'),
        route: 'Orders',
        icon: 'box' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileCustomerCare'),
        sub: t('tileCustomerCareSub'),
        route: 'CustomerCare',
        icon: 'care' as AppIconName,
        tone: 'green' as const,
      },
    ],
    [t],
  );

  const load = async () => {
    const user = await getStoredUser();
    const display =
      user?.fullName || user?.full_name || user?.firstName || t('devotee');
    setName(String(display).trim() || t('devotee'));

    try {
      const [
        summary,
        goals,
        challenges,
        panchangRes,
        bannersRes,
        annadanamRes,
        todayTotalsRes,
        meetingRes,
      ] = await Promise.allSettled([
        apiService.get('/japa/summary'),
        apiService.get('/japa-goals'),
        apiService.get('/challenges'),
        apiService.get('/festivals/panchang', {params: {lang: language}}),
        apiService.get('/banners/active', {
          params: {module: 'Home', lang: language || 'en'},
        }),
        apiService.get('/annadanam/visibility'),
        apiService.get('/japa/mantras/totals', {params: {period: 'today'}}),
        apiService.get('/home/meeting'),
      ]);
      if (summary.status === 'fulfilled') {
        const data = summary.value.data.data ?? {};
        setToday(Number(data.todayJapaCount ?? data.todayCount ?? 0));
        setLifetime(Number(data.totalJapaCount ?? data.lifetimeCount ?? 0));
        setStreak(Number(data.streakDays ?? data.currentStreak ?? 0));
        setMilestone(data.milestone || null);
      }
      if (goals.status === 'fulfilled') {
        const goalList: any[] = Array.isArray(goals.value.data?.data)
          ? goals.value.data.data
          : [];
        const todayTotals: any[] =
          todayTotalsRes.status === 'fulfilled' &&
          Array.isArray(todayTotalsRes.value.data?.data)
            ? todayTotalsRes.value.data.data
            : [];
        const todayStr = istIsoDate();
        const activeGoals = goalList.filter((item: any) => {
          if (String(item.status || '').toUpperCase() !== 'ACTIVE') {
            return false;
          }
          const completed = Number(item.completedCount ?? item.completed_count ?? 0);
          const target = Number(item.targetCount ?? item.target_count ?? 0);
          const daily = Number(item.dailyTarget ?? item.daily_target ?? 0);
          const goalName = String(item.goalName ?? item.goal_name ?? '').trim();
          // Signup used to auto-seed "Daily Japa" / 10800 / 108 — hide until user sets a real goal
          if (
            target === 10800 &&
            completed === 0 &&
            daily === 108 &&
            goalName === 'Daily Japa'
          ) {
            return false;
          }
          if (target > 0 && completed >= target) {
            return false;
          }
          if (item.endDate && String(item.endDate).slice(0, 10) < todayStr) {
            return false;
          }
          return true;
        });

        setAllActiveGoals(activeGoals);

        // Prioritize the devotee's most recently chanted & saved mantra if it's still ongoing
        const lastChanted = await getLastChantedJapa();
        let active: any = null;

        if (lastChanted && activeGoals.length > 0) {
          if (lastChanted.goalId) {
            active = activeGoals.find(
              (g: any) => Number(g.id) === Number(lastChanted.goalId),
            );
          }
          if (!active && lastChanted.personalMantraId) {
            active = activeGoals.find(
              (g: any) =>
                Number(g.personalMantraId ?? g.personal_mantra_id) ===
                Number(lastChanted.personalMantraId),
            );
          }
          if (!active && lastChanted.mantraId && !lastChanted.personalMantraId) {
            active = activeGoals.find(
              (g: any) =>
                Number(g.mantraId ?? g.mantra_id) === Number(lastChanted.mantraId) &&
                !Number(g.personalMantraId ?? g.personal_mantra_id),
            );
          }
        }

        // If recently chanted mantra is completed or not found, fall back to the first ongoing active goal
        if (!active && activeGoals.length > 0) {
          active = activeGoals[0];
        }

        // No invented 108 daily goal — only show what the devotee configured

        if (active) {
          const targetCount =
            Number(active.targetCount ?? active.target_count) || 0;
          const completedCount =
            Number(active.completedCount ?? active.completed_count) || 0;
          let todayCompletedCount =
            Number(active.todayCompletedCount ?? active.today_completed_count) || 0;

          // Cross check with today's totals for this specific mantra to ensure accuracy
          if (todayTotals.length > 0) {
            const matchToday = todayTotals.find((m: any) => {
              if (active.personalMantraId) {
                return (
                  Number(m.personalMantraId || m.personal_mantra_id) ===
                  Number(active.personalMantraId)
                );
              }
              if (active.mantraId) {
                return Number(m.mantraId || m.mantra_id) === Number(active.mantraId);
              }
              return false;
            });
            if (matchToday && Number(matchToday.total || 0) > 0) {
              todayCompletedCount = Math.max(
                todayCompletedCount,
                Number(matchToday.total || 0),
              );
            }
          }

          const planSnaps = await readDailyPlanSnaps();
          const plan = resolveMantraDailyTarget({
            today: todayStr,
            endDate: active.endDate ?? active.end_date,
            remainingNow: Math.max(0, targetCount - completedCount),
            doneToday: todayCompletedCount,
            serverTarget: Number(active.dailyTarget ?? active.daily_target) || 0,
            serverPlanDate: active.dailyPlanDate ?? active.daily_plan_date,
            saved: planSnaps[String(active.id)] || null,
          });
          const dailyTarget = plan.target;
          void writeDailyPlanSnap(Number(active.id), plan.snap);
          setActiveJapaGoal({
            id: Number(active.id),
            goalName: String(
              active.goalName || active.goal_name || t('continueJapa'),
            ),
            mantraId: active.mantraId ?? active.mantra_id ?? null,
            personalMantraId:
              active.personalMantraId ?? active.personal_mantra_id ?? null,
            mantraType: active.mantraType ?? active.mantra_type ?? 'DEFAULT',
            mantraName: active.mantraName ?? active.mantra_name ?? '',
            targetCount,
            completedCount,
            todayCompletedCount,
            dailyTarget,
            remainingCount: Math.max(0, targetCount - completedCount),
            startDate: active.startDate ?? active.start_date,
            endDate: active.endDate ?? active.end_date,
            status: String(active.status || 'ACTIVE').toUpperCase(),
          });
        } else {
          setActiveJapaGoal(null);
        }
      }
      if (challenges.status === 'fulfilled') {
        const list = challenges.value.data.data ?? [];
        setChallenge(list.find((item: any) => item.joined) || list[0] || null);
      }
      if (panchangRes.status === 'fulfilled' && panchangRes.value.data.data) {
        setPanchang(panchangRes.value.data.data);
      }
      if (bannersRes.status === 'fulfilled') {
        const rows = Array.isArray(bannersRes.value.data?.data)
          ? bannersRes.value.data.data
          : [];
        setHomeBanners(
          rows.map((row: any) => ({
            id: Number(row.id) || 0,
            title: String(row.title || ''),
            subtitle: String(row.subtitle || ''),
            imageUrl: String(row.imageUrl || ''),
            buttonText: String(row.buttonText || t('startChanting')),
          })),
        );
      } else {
        setHomeBanners([]);
      }
      if (annadanamRes.status === 'fulfilled') {
        const data = annadanamRes.value.data?.data || {};
        setAnnadanamVisibility({
          japa: data.japa !== false,
          general: data.general !== false,
          campaigns: data.campaigns !== false,
          any: data.any !== false,
        });
      }
      if (meetingRes.status === 'fulfilled' && meetingRes.value?.data?.data) {
        const m = meetingRes.value.data.data;
        if (m.enabled && m.link) {
          setActiveMeeting(m);
        } else {
          setActiveMeeting(null);
        }
      } else {
        setActiveMeeting(null);
      }
    } catch (error) {
      console.log('Home summary unavailable', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [t, language]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const askForRegion = async () => {
        const session = await hydrateSession();
        if (!active || !session.token) {
          return;
        }
        let user = session.user;
        try {
          const profile = await ProfileApi.getProfile();
          if (profile) {
            user = {...(user || {}), ...profile};
            await saveSession(session.token, user);
          }
        } catch {
          // Use the stored profile if the refresh fails.
        }
        if (!active) {
          return;
        }
        const role = String(user?.role || '').toUpperCase();
        if (role === 'ADMIN' || !regionMissing(user)) {
          return;
        }
        promptRegion(navigation, {
          title: t('regionRequiredTitle'),
          message: t('regionRequiredMessage'),
          ok: t('ok'),
        });
      };
      askForRegion();
      return () => {
        active = false;
      };
    }, [navigation, t]),
  );

  useFocusEffect(
    useCallback(() => {
      const installed = getAppVersionName();
      if (installed && installed !== '—') {
        apiService
          .post('/auth/app-version', {appVersion: installed})
          .catch(() => undefined);
      }
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatCountShort = (num: number) => {
    if (num >= 1000) {
      const k = num / 1000;
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return num.toLocaleString('en-IN');
  };

  const hasActiveGoal = Boolean(activeJapaGoal && activeJapaGoal.targetCount > 0);

  const activeMantraTodayCount = useMemo(() => {
    if (activeJapaGoal) {
      return Number(activeJapaGoal.todayCompletedCount || 0);
    }
    return 0;
  }, [activeJapaGoal]);

  const userDailyGoal = Number(activeJapaGoal?.dailyTarget || 0);

  const dailyProgress = Math.min(
    100,
    userDailyGoal > 0
      ? Math.round((activeMantraTodayCount / userDailyGoal) * 100)
      : 0,
  );

  const goalTarget = activeJapaGoal ? activeJapaGoal.targetCount : 0;
  const goalCompleted = activeJapaGoal ? activeJapaGoal.completedCount : 0;
  const goalProgress =
    goalTarget > 0
      ? Math.min(100, Math.round((goalCompleted / goalTarget) * 100))
      : 0;

  const handleDailyGoalPress = () => {
    navigation.navigate('YourJapas');
  };

  const handleContinueJapaPress = () => {
    if (activeJapaGoal) {
      const isPersonal =
        activeJapaGoal.mantraType === 'PERSONAL' ||
        Boolean(activeJapaGoal.personalMantraId);
      navigation.navigate('Chant', {
        mode: isPersonal ? 'private' : 'community',
        mantraId: isPersonal ? undefined : (activeJapaGoal.mantraId || undefined),
        personalMantraId: activeJapaGoal.personalMantraId || undefined,
        privateMantra: isPersonal ? activeJapaGoal.mantraName : undefined,
        goal: activeJapaGoal.targetCount,
        initialCount: activeJapaGoal.completedCount,
        dailyTarget: userDailyGoal || activeJapaGoal.dailyTarget,
        japaGoalId: activeJapaGoal.id,
        resume: true,
        fromHome: true,
      });
    } else {
      navigation.navigate('YourJapas');
    }
  };

  const handleBannerStartJapa = () => {
    navigation.navigate('YourJapas');
  };

  const onSharePanchang = async () => {
    const festival = panchang.festival ? tt(festivalName(panchang.festival)) : '';
    const nextLine =
      panchang.nextFestival && !panchang.festival
        ? `${t('next')}: ${tt(festivalName(panchang.nextFestival))} · ${festivalDateLabel(
            panchang.nextFestival.festivalDate,
            t,
          )}`
        : '';
    const message = buildPanchangShareText(panchang, t, language, {
      festival,
      nextLine,
    });
    (Clipboard as {setString?: (value: string) => void}).setString?.(message);
    try {
      await Share.share({message});
    } catch {
      // The text is already on the clipboard if the share sheet is dismissed.
    }
  };

  const onShareApp = async () => {
    Clipboard.setString(PLAYSTORE_URL);
    const message = `Japa Siddhi\n${PLAYSTORE_URL}`;
    try {
      if (Platform.OS === 'android' && NativeModules.AppShare?.shareLogo) {
        await NativeModules.AppShare.shareLogo(message);
        return;
      }
      await Share.share(
        Platform.OS === 'ios'
          ? {url: PLAYSTORE_URL, message: 'Japa Siddhi'}
          : {title: 'Japa Siddhi', message},
      );
    } catch {
      try {
        await Share.share({title: 'Japa Siddhi', message});
      } catch {
        // The link is already on the clipboard.
      }
    }
  };

  const showJapaAnnadanam =
    annadanamVisibility.japa && lifetime >= 5000;
  const visibleTiles = tiles.filter(item => {
    if (item.route !== 'Donate') {
      return true;
    }
    return annadanamVisibility.any;
  });
  const tabSwipe = useTabSwipe('Home');

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
      {...tabSwipe.panHandlers}>
      <View style={styles.body}>
        <AppHeader
          title="Japa Siddhi"
          subtitle={t('unitOfTrust')}
          showBell
          leftAction={
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={onShareApp}
              hitSlop={{top: 8, bottom: 8, left: 4, right: 8}}
              accessibilityRole="button"
              accessibilityLabel={t('share')}>
              <Text style={styles.shareLabel}>{t('share')}</Text>
            </TouchableOpacity>
          }
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.templeGold]}
            />
          }>
          <Text style={styles.greet}>{t('namaste', {name})}</Text>
          <Text style={styles.wish}>{t('peacefulDay')}</Text>

          <HomeBanner
            banner={{
              id: 1,
              title: t('beginYourJapa'),
              subtitle: t('bannerSubtitle'),
              imageUrl: '',
              buttonText: t('startChanting'),
            }}
            onPress={handleBannerStartJapa}
            secondaryButtonText={t('whyJapaSiddhiApp')}
            onSecondaryPress={() => navigation.navigate('IntroVideos')}
            announcements={homeBanners.map(item => ({
              id: item.id,
              title: tt(item.title),
              subtitle: item.subtitle ? tt(item.subtitle) : '',
            }))}
          />

          {/* Slow border blink — Panchangam */}
          <Animated.View
            style={[
              styles.panchangCardWrapper,
              {
                borderColor: panchangBorderColor,
                borderWidth: panchangBorderWidth,
              },
            ]}>
            <TouchableOpacity
              style={styles.panchangButton}
              onPress={() => navigation.navigate('Festivals')}
              activeOpacity={0.85}>
              <View style={styles.panchangButtonLeft}>
                <Text style={styles.panchangButtonIcon}>📅</Text>
                <Text style={styles.panchangButtonText}>
                  {t('panchangam') || 'Panchangam'}
                </Text>
              </View>
              <View style={styles.panchangButtonRight}>
                <Text style={styles.panchangButtonDate} numberOfLines={1}>
                  {formatPanchangDisplayDate(panchang, t) ||
                    panchang.displayDate ||
                    ''}
                </Text>
                <Text style={styles.panchangButtonArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Meeting / Class — same slow border blink */}
          {activeMeeting && activeMeeting.enabled && activeMeeting.link ? (
            <Animated.View
              style={[
                styles.meetingCardWrapper,
                {
                  borderColor: meetingBorderColor,
                  borderWidth: meetingBorderWidth,
                },
              ]}>
              <TouchableOpacity
                style={styles.lalithaClassCard}
                onPress={onMeetingCardPress}
                activeOpacity={0.85}>
                <View style={styles.lalithaClassLeft}>
                  <View style={styles.lalithaClassIconBox}>
                    <Text style={styles.lalithaClassEmoji}>🪔</Text>
                  </View>
                  <View style={styles.lalithaClassCopy}>
                    <View style={styles.lalithaClassTitleRow}>
                      <Text style={styles.lalithaClassTitle} numberOfLines={1}>
                        {activeMeeting.title || t('lalithaSahasramClass')}
                      </Text>
                      <View style={styles.gmeetPill}>
                        <Text style={styles.gmeetPillText}>📹 GMeet</Text>
                      </View>
                      {isMeetingLive ? (
                        <View style={styles.panchangLiveTag}>
                          <Text style={styles.panchangLiveDot}>●</Text>
                          <Text style={styles.panchangLiveText}>
                            {t('liveNow') || 'LIVE NOW'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.meetingUpcomingTag}>
                          <Text style={styles.meetingUpcomingTagDot}>⏳</Text>
                          <Text style={styles.meetingUpcomingTagText}>
                            {t('startsIn') || 'STARTS IN'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {!isMeetingLive && meetingCountdown ? (
                      <View style={styles.meetingCountdownBox}>
                        <Text style={styles.meetingCountdownDigits}>
                          ⏳ {meetingCountdown}
                        </Text>
                        {activeMeeting.time ? (
                          <Text
                            style={styles.meetingScheduledAtText}
                            numberOfLines={1}>
                            {' '}({activeMeeting.time})
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.lalithaClassSub} numberOfLines={1}>
                        {activeMeeting.time
                          ? `⏰ ${activeMeeting.time}`
                          : t('lalithaSahasramClassSub')}
                      </Text>
                    )}
                  </View>
                </View>
                {isMeetingLive ? (
                  <View style={styles.lalithaJoinBtn}>
                    <Text style={styles.lalithaJoinText}>
                      {t('joinClass') || 'JOIN'}
                    </Text>
                    <Text style={styles.lalithaJoinArrow}>↗</Text>
                  </View>
                ) : (
                  <View style={styles.meetingSoonBtn}>
                    <Text style={styles.meetingSoonText}>WAIT ⏳</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          <Modal
            visible={panchangModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setPanchangModalVisible(false)}>
            <View style={styles.modalBackdrop}>
              <TouchableOpacity
                style={styles.modalDismissArea}
                activeOpacity={1}
                onPress={() => setPanchangModalVisible(false)}
              />
              <View style={styles.panchangModalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalKicker}>
                    {panchang.festival ? t('todayFestival') : t('todayPanchangam')}
                  </Text>
                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      onPress={onSharePanchang}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      style={styles.modalShareBadge}
                      activeOpacity={0.7}>
                      <Text style={styles.modalShareBadgeText}>
                        {t('sharePanchangam')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPanchangModalVisible(false)}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      style={styles.modalCloseBtn}
                      activeOpacity={0.7}>
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.panchangModalScrollContent}>
                  <Text style={styles.dateLine}>
                    {formatPanchangDisplayDate(panchang, t) ||
                      panchang.displayDate ||
                      t('loadingToday')}
                  </Text>
                  {panchang.festival ? (
                    <View style={styles.modalFestivalBlock}>
                      <Text style={styles.cardTitle}>
                        {tt(festivalName(panchang.festival))}
                      </Text>
                      {panchang.festival.description ? (
                        <Text style={styles.cardMeta}>
                          {tt(panchang.festival.description)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {panchang.nextFestival && !panchang.festival ? (
                    <Text style={styles.nextFestival}>
                      {t('next')}: {tt(festivalName(panchang.nextFestival))} ·{' '}
                      {festivalDateLabel(panchang.nextFestival.festivalDate, t)}
                    </Text>
                  ) : null}
                  <PanchangDetails panchang={panchang} />
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalCloseFullBtn}
                  onPress={() => setPanchangModalVisible(false)}
                  activeOpacity={0.85}>
                  <Text style={styles.modalCloseFullBtnText}>
                    {t('cancel') || 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <View style={styles.progressCard}>
            {hasActiveGoal ? (
              /* Single Clean Daily Goal Card for the active / recently chanted mantra */
              <TouchableOpacity
                style={styles.cardSection}
                activeOpacity={0.85}
                onPress={handleContinueJapaPress}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.progressTitle} numberOfLines={2}>
                    {activeJapaGoal
                      ? `${tt(activeJapaGoal.mantraName || activeJapaGoal.goalName)} · ${t('dailyGoal')}`
                      : t('dailyGoal')}
                  </Text>
                  <View
                    style={[
                      styles.sectionBadge,
                      userDailyGoal > 0 &&
                        activeMantraTodayCount >= userDailyGoal &&
                        styles.sectionBadgeDone,
                    ]}>
                    <Text
                      style={[
                        styles.sectionBadgeText,
                        userDailyGoal > 0 &&
                          activeMantraTodayCount >= userDailyGoal &&
                          styles.sectionBadgeTextDone,
                      ]}>
                      {userDailyGoal > 0 &&
                      activeMantraTodayCount >= userDailyGoal
                        ? `✓ ${t('goalCompleted')}`
                        : t('goalNotCompleted')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.progressMeta}>
                  {t('chantsToday', {
                    count: activeMantraTodayCount.toLocaleString('en-IN'),
                  })}
                </Text>
                <Text style={styles.progressMeta}>
                  {t('goalChants', {
                    count: userDailyGoal.toLocaleString('en-IN'),
                  })}
                </Text>
                <View style={styles.barRow}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {width: `${dailyProgress}%`},
                        userDailyGoal > 0 &&
                          activeMantraTodayCount >= userDailyGoal &&
                          styles.barFillCompleted,
                      ]}
                    />
                  </View>
                  <Text style={styles.percent}>
                    {activeMantraTodayCount.toLocaleString('en-IN')} /{' '}
                    {formatCountShort(userDailyGoal)} · {dailyProgress}%
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* Clean state for fresh user with NO active goals */
              <View style={styles.cardSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.progressTitle}>
                    {t('dailyGoal')}
                  </Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>
                      {t('goalNotCompleted') || 'Not Started'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.progressMeta}>
                  {t('noActiveJapasDesc') ||
                    'Start an Antharanga Japa with your own mantra or join a Samuhika Japa to begin!'}
                </Text>
                <TouchableOpacity
                  style={styles.startGoalBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('YourJapas')}>
                  <Text style={styles.startGoalBtnText}>
                    ✨ {t('startJapa') || 'Start Japa'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <MilestoneProgressCard
            milestone={milestone}
            onPress={() => navigation.navigate('MilestoneNotifications')}
          />

          <Text style={styles.section}>{t('quickActions')}</Text>
          <View style={styles.grid}>
            {visibleTiles.map(item => (
              <TouchableOpacity
                key={item.route}
                style={styles.tile}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(item.route)}>
                <View
                  style={[
                    styles.tileIcon,
                    item.tone === 'green'
                      ? styles.tileIconGreen
                      : styles.tileIconGold,
                  ]}>
                  <AppIcon
                    name={item.icon}
                    size={48}
                    color={Colors.sacredBrown}
                  />
                </View>
                <Text style={styles.tileTitle}>{item.title}</Text>
                <Text style={styles.tileSub}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <BottomTabs active="Home" />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  shareBtn: {
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  body: {flex: 1, paddingHorizontal: 12},
  scrollContent: {paddingBottom: 40},
  greet: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '800',
    color: Colors.leafGreen,
    includeFontPadding: true,
  },
  wish: {
    marginTop: 4,
    marginBottom: 16,
    color: Colors.sacredBrown,
    lineHeight: 22,
    includeFontPadding: true,
  },
  noticeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    padding: 14,
    marginBottom: 14,
  },
  noticeCopy: {flex: 1},
  noticeKicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 18,
    includeFontPadding: true,
  },
  noticeTitle: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 26,
    includeFontPadding: true,
  },
  noticeSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: true,
  },
  festival: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
  },
  panchangCardWrapper: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#56350F',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
  },
  panchangButton: {
    backgroundColor: '#FFFDF7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panchangLiveTag: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
  },
  panchangLiveDot: {
    color: '#FFF',
    fontSize: 7,
  },
  panchangLiveText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  meetingCardWrapper: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#56350F',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
  },
  lalithaClassCard: {
    backgroundColor: '#FFFDF7',
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lalithaClassLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  lalithaClassIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lalithaClassEmoji: {
    fontSize: 22,
  },
  lalithaClassCopy: {
    flex: 1,
  },
  lalithaClassTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  lalithaClassTitle: {
    color: Colors.sacredBrown,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  gmeetPill: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  gmeetPillText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '700',
  },
  meetingUpcomingTag: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
  },
  meetingUpcomingTagDot: {
    fontSize: 8,
  },
  meetingUpcomingTagText: {
    color: '#B45309',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  meetingCountdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  meetingCountdownDigits: {
    color: '#D97706',
    fontSize: 12.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  meetingScheduledAtText: {
    color: '#8C6C42',
    fontSize: 11.5,
    fontWeight: '600',
  },
  meetingSoonBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingSoonText: {
    color: '#92400E',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  lalithaClassSub: {
    color: '#8C6C42',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  lalithaJoinBtn: {
    backgroundColor: Colors.templeGold,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  lalithaJoinText: {
    color: Colors.sacredBrown,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  lalithaJoinArrow: {
    color: Colors.sacredBrown,
    fontWeight: '900',
    fontSize: 13,
  },
  panchangButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panchangButtonIcon: {
    fontSize: 18,
  },
  panchangButtonText: {
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    includeFontPadding: true,
  },
  panchangButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  panchangButtonDate: {
    color: '#8C6C42',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 160,
    includeFontPadding: true,
  },
  panchangButtonArrow: {
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  panchangModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EBE0',
  },
  modalKicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
    includeFontPadding: true,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalShareBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#E4EFDF',
    borderRadius: 12,
  },
  modalShareBadgeText: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3EBE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  panchangModalScrollContent: {
    paddingVertical: 8,
  },
  modalFestivalBlock: {
    marginTop: 6,
    marginBottom: 4,
  },
  modalCloseFullBtn: {
    marginTop: 12,
    backgroundColor: Colors.leafGreen,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseFullBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  panchangHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  panchangHeadTitle: {
    flex: 1,
  },
  dateLine: {
    marginTop: 8,
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: true,
  },
  nextFestival: {
    marginTop: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: true,
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
  },
  cardSection: {
    paddingVertical: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  progressTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  sectionBadge: {
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#E8D8C0',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  sectionBadgeDone: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  sectionBadgeTextDone: {
    color: '#2E7D32',
    fontWeight: '800',
  },
  startGoalBtn: {
    marginTop: 10,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: Colors.templeGold,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  startGoalBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 13,
  },
  resumeChevron: {
    fontSize: 14,
    color: Colors.templeGold,
    fontWeight: '800',
    flexShrink: 0,
    marginLeft: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F2EBE0',
    marginVertical: 12,
  },
  progressMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: true,
  },
  todayLabel: {
    marginTop: 14,
    color: Colors.leafGreen,
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: true,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: Colors.sacredBrown,
  },
  barFillCompleted: {
    backgroundColor: '#2E7D32',
  },
  percent: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: true,
  },
  row: {flexDirection: 'row', gap: 10, marginBottom: 14},
  half: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  kicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0,
    includeFontPadding: true,
  },
  big: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  cardTitle: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  cardMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    lineHeight: 22,
    includeFontPadding: true,
  },
  promo: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  link: {
    marginTop: 10,
    color: Colors.templeGold,
    fontWeight: '800',
    lineHeight: 22,
    includeFontPadding: true,
  },
  section: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.leafGreen,
    includeFontPadding: true,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  tile: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    paddingBottom: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  tileIconGold: {
    backgroundColor: '#F3E2C6',
  },
  tileIconGreen: {
    backgroundColor: '#E4EFDF',
  },
  tileTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: false,
    paddingBottom: 2,
  },
  tileSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 14.5,
    lineHeight: 22,
    includeFontPadding: false,
    paddingBottom: 2,
  },
});
