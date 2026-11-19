import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
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
import {resolveMediaUrl} from '../../services/profilePhoto';
import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
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
  const [categories, setCategories] = useState<CategoryRow[]>(
    builtinCategories(),
  );
  const [openCode, setOpenCode] = useState<string | null>(
    route.params?.categoryCode ? String(route.params.categoryCode) : null,
  );

  useFocusEffect(
    useCallback(() => {
      apiService
        .get('/japa/community')
        .then(response => {
          const data = response.data.data ?? {};
          const list = data.mantras ?? [];
          setMantras(list);
          const preferredId = Number(route.params?.mantraId || 0);
          setSelected((current: any) => {
            if (preferredId) {
              const preferred = list.find(
                (item: any) => Number(item.id) === preferredId,
              );
              if (preferred) {
                return preferred;
              }
            }
            return current
              ? list.find((item: any) => item.id === current.id) ?? current
              : list[0] ?? null;
          });
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
        })
        .catch(() => {
          setMantras([
            {id: 1, mantraName: 'Om Namah Shivaya'},
            {id: 2, mantraName: 'Om Namo Narayanaya'},
            {id: 3, mantraName: 'Hare Krishna'},
            {id: 4, mantraName: 'Gayatri Mantra'},
          ]);
        });

      apiService
        .get('/japa-goals')
        .then(res => {
          setActiveGoals(res.data?.data ?? []);
        })
        .catch(() => {
          setActiveGoals([]);
        });
    }, []),
  );

  useEffect(() => {
    if (route.params?.categoryCode) {
      setOpenCode(String(route.params.categoryCode));
    }
  }, [route.params?.categoryCode]);

  useEffect(() => {
    apiService
      .get('/mantras/categories')
      .then(response => {
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
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
  }, []);

  const {unassigned, groups} = groupByCategory(mantras, categories);
  const selectedStat = selected ? stats[Number(selected.id)] : undefined;
  const total = selectedStat?.totalChants ?? 0;
  const devotees = selectedStat?.devotees ?? 0;

  const openMedia = (url?: string) => {
    const resolved = resolveMediaUrl(url || '');
    if (!resolved) {
      return;
    }
    Linking.openURL(resolved).catch(() => undefined);
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
    return (
      <View style={styles.mediaRow}>
        {image ? (
          <TouchableOpacity onPress={() => openMedia(item.imageUrl)}>
            <Image source={{uri: image}} style={styles.mediaThumb} />
          </TouchableOpacity>
        ) : null}
        {video ? (
          <TouchableOpacity
            style={styles.mediaChip}
            onPress={() => openMedia(item.videoUrl)}>
            <Text style={styles.mediaChipText}>Video</Text>
          </TouchableOpacity>
        ) : null}
        {audio ? (
          <TouchableOpacity
            style={styles.mediaChip}
            onPress={() => openMedia(item.audioUrl)}>
            <Text style={styles.mediaChipText}>Audio</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const goChant = (payload: {
    mantraId: number;
    mantraName: string;
    goal: number;
    japaGoalId?: number;
    deadlineAt?: string | null;
    initialCount?: number;
  }) => {
    navigation.navigate('Chant', {
      mode: 'community',
      mantraId: payload.mantraId,
      mantraName: payload.mantraName,
      goal: payload.goal > 0 ? payload.goal : undefined,
      japaGoalId: payload.japaGoalId,
      deadlineAt: payload.deadlineAt || undefined,
      count: payload.initialCount || 0,
      resume: Boolean(payload.japaGoalId),
      samuhika: true,
      skipGoalSelect: true,
    });
  };

  const doJoin = async () => {
    if (!selected?.id) {
      return;
    }
    if (selected.deadlinePassed) {
      Alert.alert(
        t('deadlineOverTitle') || 'Deadline over',
        t('deadlineOverMsg') ||
          'You are not allowed to enroll. The deadline for this Samuhika japa is over.',
      );
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
      goChant({
        mantraId: Number(selected.id),
        mantraName:
          selected.mantraName || selected.transliteration || 'Mantra',
        goal: target,
        japaGoalId: data.japaGoalId ? Number(data.japaGoalId) : undefined,
        deadlineAt: data.deadlineAt || selected.deadlineAt,
        initialCount: Number(data.completedCount) || 0,
      });
    } catch (err: any) {
      Alert.alert(
        t('couldNotJoin') || 'Could not join',
        getApiError(
          err,
          t('deadlineOverMsg') ||
            'You are not allowed to enroll. The deadline for this Samuhika japa is over.',
        ),
      );
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
    if (item.deadlinePassed) {
      bits.push(t('deadlineOverShort') || 'Deadline over');
    } else if (item.deadlineAt) {
      bits.push(`Until ${String(item.deadlineAt).slice(0, 10)}`);
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
      </View>

      <ScrollView
        style={styles.mantraScroll}
        contentContainerStyle={styles.mantraScrollContent}
        showsVerticalScrollIndicator={false}>
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
                <Text
                  style={[
                    styles.categoryText,
                    open && styles.categoryTextOpen,
                  ]}>
                  {title}
                  {String(categoryMeta?.categoryType || '').toUpperCase() ===
                  'EVENT'
                    ? ' · Event'
                    : ''}
                </Text>
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
  label: {color: Colors.leafGreen, fontWeight: '700', fontSize: 12},
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
  categoryText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
  },
  categoryTextOpen: {
    color: Colors.white,
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
});
