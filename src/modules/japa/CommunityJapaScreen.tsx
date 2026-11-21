import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import {getReadCache, READ_TTL_MS, setReadCache} from '../../services/readCache';
import {playIntroVideo} from '../../services/introVideos';
import {
  pauseRemoteAudio,
  playRemoteAudio,
  stopRemoteAudio,
  subscribeRemoteAudioProgress,
} from '../../services/remoteAudio';
import {resolveMediaUrl} from '../../services/profilePhoto';
import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import {
  formatIstDate,
  formatIstDateTime12h,
  isDeadlinePassed,
  isNotStartedYet,
} from '../../utils/istTime';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {
  MantraCategoryOption,
  builtinCategories,
  categoryTitle,
  groupByCategory,
} from './mantraCategories';

interface MantraStat {
  totalChants: number;
  devotees: number;
}

type CategoryRow = MantraCategoryOption & {
  categoryType?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
};

const CommunityJapaScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [mantras, setMantras] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState<Record<number, MantraStat>>({});
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [loadingMantras, setLoadingMantras] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>(
    builtinCategories(),
  );
  const [openCode, setOpenCode] = useState<string | null>(
    route.params?.categoryCode ? String(route.params.categoryCode) : null,
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [playingMedia, setPlayingMedia] = useState<null | 'video'>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrlPlaying, setAudioUrlPlaying] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState({
    positionMs: 0,
    durationMs: 0,
  });

  useEffect(() => {
    return subscribeRemoteAudioProgress(event => {
      if (event.completed) {
        setAudioPlaying(false);
        setAudioLoading(false);
        setAudioUrlPlaying(null);
        setAudioProgress({positionMs: 0, durationMs: 0});
        return;
      }
      setAudioPlaying(Boolean(event.playing));
      setAudioProgress({
        positionMs: Number(event.positionMs) || 0,
        durationMs: Number(event.durationMs) || 0,
      });
      if (event.url) {
        setAudioUrlPlaying(String(event.url));
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopRemoteAudio();
        setAudioPlaying(false);
        setAudioLoading(false);
        setAudioUrlPlaying(null);
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const applyCommunity = (data: any) => {
        const list = data.mantras ?? [];
        setMantras(list);
        const preferredId = Number(route.params?.mantraId || 0);
        const preferredMantra = preferredId
          ? list.find((item: any) => Number(item.id) === preferredId)
          : null;
        setSelected((current: any) => {
          if (preferredMantra) {
            return preferredMantra;
          }
          return current
            ? list.find((item: any) => item.id === current.id) ?? current
            : list[0] ?? null;
        });
        if (preferredMantra?.categoryCode) {
          setOpenCode(String(preferredMantra.categoryCode));
        } else if (route.params?.categoryCode) {
          setOpenCode(String(route.params.categoryCode));
        }
        const byMantra: Record<number, MantraStat> = {};
        (data.mantraStats ?? []).forEach((row: any) => {
          byMantra[Number(row.mantraId)] = {
            totalChants: Number(row.totalChants ?? 0),
            devotees: Number(row.devotees ?? 0),
          };
        });
        setStats(byMantra);
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(
            data.categories.map((row: any) => ({
              code: String(row.code || ''),
              name: String(row.name || ''),
              categoryType: String(row.categoryType || 'NORMAL'),
              imageUrl: String(row.imageUrl || ''),
              videoUrl: String(row.videoUrl || ''),
              audioUrl: String(row.audioUrl || ''),
            })),
          );
        }
      };

      // Show last catalog if cached, but always show a loading circle while
      // fresh mantras (including newly added ones) are fetched.
      // v2: catalog is EVENT/Yagyam-only from API (old enrollments stay on Your Japas).
      const cached = getReadCache<any>('community:payload:v2');
      if (cached) {
        applyCommunity(cached);
      }
      setLoadingMantras(true);

      apiService
        .get('/japa/community')
        .then(response => {
          const data = response.data.data ?? {};
          setReadCache('community:payload:v2', data, READ_TTL_MS);
          applyCommunity(data);
          // Fallback only if community payload has no categories yet.
          if (
            !Array.isArray(data.categories) ||
            data.categories.length === 0
          ) {
            apiService
              .get('/mantras/categories', {params: {list: 'samuhika'}})
              .then(catRes => {
                const rows = Array.isArray(catRes.data?.data)
                  ? catRes.data.data
                  : [];
                if (rows.length > 0) {
                  setCategories(
                    rows.map((row: any) => ({
                      code: String(row.code || ''),
                      name: String(row.name || ''),
                      categoryType: String(row.categoryType || 'NORMAL'),
                      imageUrl: String(row.imageUrl || ''),
                      videoUrl: String(row.videoUrl || ''),
                      audioUrl: String(row.audioUrl || ''),
                    })),
                  );
                }
              })
              .catch(() => undefined);
          }
        })
        .catch(() => {
          if (!cached) {
            setMantras([
              {id: 1, mantraName: 'Om Namah Shivaya'},
              {id: 2, mantraName: 'Om Namo Narayanaya'},
              {id: 3, mantraName: 'Hare Krishna'},
              {id: 4, mantraName: 'Gayatri Mantra'},
            ]);
          }
        })
        .finally(() => {
          setLoadingMantras(false);
        });

      // Goals always fresh — used for enroll/already-done (not cached).
      apiService
        .get('/japa-goals')
        .then(res => {
          setActiveGoals(res.data?.data ?? []);
        })
        .catch(() => {
          setActiveGoals([]);
        });
    }, [route.params?.mantraId, route.params?.categoryCode]),
  );

  useEffect(() => {
    if (route.params?.categoryCode) {
      setOpenCode(String(route.params.categoryCode));
    }
  }, [route.params?.categoryCode]);

  useEffect(() => {
    const preferredId = Number(route.params?.mantraId || 0);
    if (!preferredId || !mantras.length) {
      return;
    }
    const preferred = mantras.find(item => Number(item.id) === preferredId);
    if (!preferred) {
      return;
    }
    setSelected(preferred);
    if (preferred.categoryCode) {
      setOpenCode(String(preferred.categoryCode));
    }
  }, [route.params?.mantraId, mantras]);

  // Categories come from /japa/community — no duplicate /mantras/categories call.

  const {unassigned, groups} = groupByCategory(mantras, categories);
  const selectedStat = selected ? stats[Number(selected.id)] : undefined;
  const total = selectedStat?.totalChants ?? 0;
  const devotees = selectedStat?.devotees ?? 0;

  const playVideoInApp = async (url: string | undefined) => {
    const resolved = resolveMediaUrl(url || '');
    if (!resolved || playingMedia) {
      return;
    }
    setPlayingMedia('video');
    const ok = await playIntroVideo(resolved);
    setPlayingMedia(null);
    if (!ok) {
      Alert.alert(
        'Video',
        t('mediaPlayError') ||
          'Could not play this file. Check your connection.',
      );
    }
  };

  const toggleAudioInApp = async (url: string | undefined) => {
    const resolved = resolveMediaUrl(url || '');
    if (!resolved) {
      return;
    }
    if (audioPlaying && audioUrlPlaying === resolved) {
      await pauseRemoteAudio();
      setAudioPlaying(false);
      return;
    }
    setAudioLoading(true);
    setAudioUrlPlaying(resolved);
    const ok = await playRemoteAudio(resolved);
    setAudioLoading(false);
    if (!ok) {
      setAudioPlaying(false);
      setAudioUrlPlaying(null);
      Alert.alert(
        'Audio',
        t('mediaPlayError') ||
          'Could not play this file. Check your connection.',
      );
      return;
    }
    setAudioPlaying(true);
  };

  const formatAudioClock = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const renderMediaRow = (item: {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
  }) => {
    const image = resolveMediaUrl(item.imageUrl || '');
    const video = resolveMediaUrl(item.videoUrl || '');
    const audio = resolveMediaUrl(item.audioUrl || '');
    if (!image && !video && !audio) {
      return null;
    }
    const thisAudioActive = Boolean(audio && audioUrlPlaying === audio);
    const progressRatio =
      thisAudioActive && audioProgress.durationMs > 0
        ? Math.min(1, audioProgress.positionMs / audioProgress.durationMs)
        : 0;
    return (
      <View style={styles.mediaRow}>
        {image ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(image)}>
            <Image source={{uri: image}} style={styles.mediaThumb} />
          </TouchableOpacity>
        ) : null}
        {video ? (
          <TouchableOpacity
            style={styles.mediaChip}
            activeOpacity={0.85}
            disabled={Boolean(playingMedia)}
            onPress={() => void playVideoInApp(item.videoUrl)}>
            {playingMedia === 'video' ? (
              <ActivityIndicator size="small" color={Colors.sacredBrown} />
            ) : (
              <Text style={styles.mediaChipText}>
                ▶ {t('tapToPlayVideo') || 'Tap to play video'}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
        {audio ? (
          <TouchableOpacity
            style={styles.audioPlayer}
            activeOpacity={0.85}
            onPress={() => void toggleAudioInApp(item.audioUrl)}>
            <View style={styles.audioPlayBtn}>
              {audioLoading && thisAudioActive ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.audioPlayIcon}>
                  {thisAudioActive && audioPlaying ? '❚❚' : '▶'}
                </Text>
              )}
            </View>
            <View style={styles.audioWaveWrap}>
              <View style={styles.audioTrack}>
                <View
                  style={[
                    styles.audioFill,
                    {width: `${Math.round(progressRatio * 100)}%`},
                  ]}
                />
              </View>
              <Text style={styles.audioTime}>
                {thisAudioActive
                  ? `${formatAudioClock(audioProgress.positionMs)} / ${formatAudioClock(
                      audioProgress.durationMs,
                    )}`
                  : t('tapToPlayAudio') || 'Tap to play audio'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  /** New Samuhika campaigns have start/deadline; legacy catalog mantras do not. */
  const isSamuhikaCampaignMantra = (item: any) =>
    Boolean(
      String(item?.startsAt || '').trim() ||
        String(item?.deadlineAt || '').trim(),
    );

  const goCampaignChant = (payload: {
    mantraId: number;
    mantraName: string;
    goal: number;
    japaGoalId?: number;
    startsAt?: string | null;
    deadlineAt?: string | null;
    initialCount?: number;
    categoryCode?: string;
  }) => {
    navigation.navigate('Chant', {
      mode: 'community',
      mantraId: payload.mantraId,
      mantraName: payload.mantraName,
      goal: payload.goal > 0 ? payload.goal : undefined,
      japaGoalId: payload.japaGoalId,
      startsAt: payload.startsAt || undefined,
      deadlineAt: payload.deadlineAt || undefined,
      count: payload.initialCount || 0,
      initialCount: payload.initialCount || 0,
      resume: Boolean(payload.japaGoalId),
      samuhika: true,
      samuhikaCampaign: true,
      skipGoalSelect: true,
      dailyTarget: 0,
      categoryCode: payload.categoryCode,
    });
  };

  const goLegacyGoalSelect = () => {
    if (!selected?.id) {
      return;
    }
    navigation.navigate('GoalSelect', {
      mode: 'community',
      mantraId: Number(selected.id),
      mantraName:
        selected.mantraName || selected.transliteration || 'Mantra',
    });
  };

  const doJoin = async () => {
    if (!selected?.id) {
      return;
    }
    const campaign = isSamuhikaCampaignMantra(selected);
    if (!campaign) {
      // Old Samuhika mantras: keep Goal Select + daily goal (Antharanga untouched).
      goLegacyGoalSelect();
      return;
    }
    // Live IST wall-clock check (naive stamps are Asia/Kolkata, not UTC).
    if (isNotStartedYet(selected.startsAt)) {
      Alert.alert(t('notStartedTitle'), t('notStartedMsg'));
      return;
    }
    if (isDeadlinePassed(selected.deadlineAt)) {
      Alert.alert(t('deadlineOverTitle'), t('deadlineOverMsg'));
      return;
    }
    try {
      const response = await apiService.post('/japa/community/join', {
        mantraId: selected.id,
      });
      const data = response.data?.data || {};
      const target =
        Number(data.targetCount) ||
        Number(selected.targetCount) ||
        Number(selected.defaultJapaCount) ||
        0;
      const done = Number(data.completedCount) || 0;
      if (data.alreadyCompleted || (target > 0 && done >= target)) {
        Alert.alert(
          t('samuhikaAlreadyDoneTitle'),
          t('samuhikaAlreadyDoneMsg'),
        );
        return;
      }
      goCampaignChant({
        mantraId: Number(selected.id),
        mantraName:
          selected.mantraName || selected.transliteration || 'Mantra',
        goal: target,
        japaGoalId: data.japaGoalId ? Number(data.japaGoalId) : undefined,
        startsAt: selected.startsAt,
        deadlineAt: data.deadlineAt || selected.deadlineAt,
        initialCount: done,
        categoryCode: selected.categoryCode,
      });
    } catch (err: any) {
      const code = String(err?.response?.data?.code || err?.code || '');
      const msg = getApiError(err, t('deadlineOverMsg'));
      if (
        code === 'ALREADY_COMPLETED' ||
        /already completed/i.test(msg)
      ) {
        Alert.alert(
          t('samuhikaAlreadyDoneTitle'),
          t('samuhikaAlreadyDoneMsg'),
        );
        return;
      }
      Alert.alert(t('couldNotJoin'), msg);
    }
  };

  const join = async () => {
    if (!selected?.id) {
      return;
    }

    if (activeGoals.length > 0) {
      const hasActiveIndividual = activeGoals.some(g => {
        const status = String(g.status || 'ACTIVE').toUpperCase();
        if (status !== 'ACTIVE') {
          return false;
        }
        const isSam =
          String(g.goalName || '').toLowerCase().includes('samuhika') ||
          String(g.goal_name || '').toLowerCase().includes('samuhika') ||
          String(g.notes || '').toLowerCase().includes('samuhika');
        const gMantraId = Number(g.mantraId ?? g.mantra_id ?? 0);
        return !isSam && gMantraId === Number(selected.id);
      });

      if (hasActiveIndividual) {
        const mName =
          selected?.mantraName || selected?.transliteration || 'this mantra';
        Alert.alert(
          t('alreadyInIndividualTitle') || 'Active in Individual Japa',
          t('alreadyInIndividualMsg', {mantra: mName}) ||
            `You already have an active individual Japa for "${mName}". Are you sure you want to join Samuhika Japa for it?`,
          [
            {text: t('cancel') || 'Cancel', style: 'cancel'},
            {text: t('continue') || 'Continue', onPress: doJoin},
          ],
        );
        return;
      }
    }

    await doJoin();
  };

  const mantraSubtitle = (item: any) => {
    const bits: string[] = [];
    const target =
      Number(item.targetCount) || Number(item.defaultJapaCount) || 0;
    if (target > 0) {
      bits.push(`Target ${target.toLocaleString()}`);
    }
    const notStarted = isNotStartedYet(item.startsAt);
    const deadlineOver = isDeadlinePassed(item.deadlineAt);
    if (notStarted && item.startsAt) {
      bits.push(`Starts ${formatIstDateTime12h(item.startsAt)}`);
    } else if (deadlineOver) {
      bits.push(t('deadlineOverShort') || 'Deadline over');
    } else if (item.deadlineAt) {
      bits.push(`Until ${formatIstDate(item.deadlineAt)}`);
    } else if (item.startsAt) {
      bits.push(`Starts ${formatIstDateTime12h(item.startsAt)}`);
    }
    if (selected?.id === item.id) {
      bits.push(t('selected') || 'Selected');
    } else {
      bits.push(t('tapToSelect') || 'Tap to select');
    }
    return bits.join(' · ');
  };

  return (
    <ScreenLayout
      title={t('communityJapa') || 'Samuhika Japa'}
      showBack
      tab="JapaHub"
      scroll={false}>
      <View style={styles.topFixedSection}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.label}>{t('totalChants')}</Text>
            <Text style={styles.value}>{total.toLocaleString()}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>{t('devoteesLabel')}</Text>
            <Text style={styles.value}>{devotees.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.joinBtnWrap}>
          <PrimaryButton
            title={t('joinCommunityJapa') || 'JOIN'}
            onPress={join}
          />
        </View>

        <Text style={styles.heading}>{t('selectMantra') || 'Select a mantra'}</Text>
        <Text style={styles.categoryHint}>{t('selectCategoryForMantra')}</Text>
        {loadingMantras && mantras.length > 0 ? (
          <View
            style={styles.mantraLoadingRow}
            accessibilityLabel="Loading mantras">
            <ActivityIndicator color={Colors.templeGold} />
            <Text style={styles.mantraLoadingText}>
              {t('loadingMantras') || 'Loading mantras…'}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.mantraScroll}
        contentContainerStyle={styles.mantraScrollContent}
        showsVerticalScrollIndicator={false}>
        {loadingMantras && mantras.length === 0 ? (
          <View style={styles.mantraLoadingEmpty}>
            <ActivityIndicator size="large" color={Colors.templeGold} />
            <Text style={styles.mantraLoadingText}>
              {t('loadingMantras') || 'Loading mantras…'}
            </Text>
          </View>
        ) : null}
        {groups.map(group => {
          const open = openCode === group.code;
          const title = categoryTitle(group, t);
          const categoryMeta = categories.find(item => item.code === group.code);
          return (
            <View key={group.code} style={styles.section}>
              <TouchableOpacity
                style={[styles.categoryBtn, open && styles.categoryBtnOpen]}
                activeOpacity={0.8}
                onPress={() =>
                  setOpenCode(current =>
                    current === group.code ? null : group.code,
                  )
                }>
                <View style={styles.categoryTitleRow}>
                  <Text
                    style={[
                      styles.categoryText,
                      open && styles.categoryTextOpen,
                      styles.categoryTitleFlex,
                    ]}>
                    {title}
                  </Text>
                  {String(categoryMeta?.categoryType || '').toUpperCase() ===
                  'EVENT' ? (
                    <Text
                      style={[
                        styles.eventBadge,
                        open && styles.eventBadgeOpen,
                      ]}>
                      Event
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              {open ? (
                <>
                  {categoryMeta ? renderMediaRow(categoryMeta) : null}
                  {group.items.length > 0 ? (
                    group.items.map(item => (
                      <View key={item.id}>
                        <MenuCard
                          emoji="🕉️"
                          title={item.mantraName || item.transliteration}
                          subtitle={mantraSubtitle(item)}
                          tone="gold"
                          selected={selected?.id === item.id}
                          onPress={() => setSelected(item)}
                        />
                        {selected?.id === item.id
                          ? renderMediaRow(item)
                          : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.empty}>{t('noMantrasInCategory')}</Text>
                  )}
                </>
              ) : null}
            </View>
          );
        })}
        {unassigned.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('mantraCatUnassigned')}</Text>
            {unassigned.map(item => (
              <View key={item.id}>
                <MenuCard
                  emoji="🕉️"
                  title={item.mantraName || item.transliteration}
                  subtitle={mantraSubtitle(item)}
                  tone="gold"
                  selected={selected?.id === item.id}
                  onPress={() => setSelected(item)}
                />
                {selected?.id === item.id ? renderMediaRow(item) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={Boolean(selectedImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <TouchableOpacity
          style={styles.imageModalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}>
          {selectedImage ? (
            <Image
              source={{uri: selectedImage}}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
          ) : null}
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}>
            <Text style={styles.imageModalCloseText}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
};

export default CommunityJapaScreen;

const styles = StyleSheet.create({
  topFixedSection: {
    paddingBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 14,
  },
  value: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  joinBtnWrap: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
  },
  categoryHint: {
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 10,
  },
  mantraLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 6,
  },
  mantraLoadingEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  mantraLoadingText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  categoryBtn: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  categoryBtnOpen: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitleFlex: {
    flex: 1,
  },
  categoryText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
  },
  categoryTextOpen: {
    color: Colors.white,
  },
  eventBadge: {
    backgroundColor: '#FFF3D6',
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 11,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  eventBadgeOpen: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: Colors.white,
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  imageModalImage: {
    width: '100%',
    height: '75%',
  },
  imageModalClose: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.templeGold,
  },
  imageModalCloseText: {
    color: Colors.white,
    fontWeight: '800',
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  mantraScroll: {
    flex: 1,
  },
  mantraScrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  mediaThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: Colors.lightGold,
  },
  mediaChip: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediaChipText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 12,
  },
  audioPlayer: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayIcon: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  audioWaveWrap: {
    flex: 1,
    gap: 4,
  },
  audioTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  audioFill: {
    backgroundColor: Colors.templeGold,
    height: 4,
  },
  audioTime: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
});
