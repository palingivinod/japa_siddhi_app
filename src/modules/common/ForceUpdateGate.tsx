import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {PLAYSTORE_URL} from '../../constants/app';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import {getAppVersionName, isUpdateAvailable} from '../../utils/appVersion';

const PLAY_MARKET_URL = 'market://details?id=com.japasiddhi';

type Phase = 'checking' | 'required' | 'ready';

type ReleaseNotes = {
  fixedTitle: string;
  fixed: string[];
  newTitle: string;
  features: string[];
};

const openPlayStore = () => {
  Linking.openURL(PLAY_MARKET_URL).catch(() => {
    Linking.openURL(PLAYSTORE_URL).catch(() => undefined);
  });
};

const toNotes = (value: any): ReleaseNotes | null => {
  if (!value || !Array.isArray(value.fixed) || !Array.isArray(value.features)) {
    return null;
  }
  return {
    fixedTitle: String(value.fixedTitle || ''),
    fixed: value.fixed.map((item: unknown) => String(item)),
    newTitle: String(value.newTitle || ''),
    features: value.features.map((item: unknown) => String(item)),
  };
};

const ForceUpdateGate = ({children}: {children: React.ReactNode}) => {
  const {t, language, ready} = useLanguage();
  const [phase, setPhase] = useState<Phase>('checking');
  const [notes, setNotes] = useState<ReleaseNotes | null>(null);

  useEffect(() => {
    // Wait until the saved language is loaded so the notes come in the right language.
    if (!ready) {
      return;
    }
    let cancelled = false;
    const installed = getAppVersionName();
    // This gate compares against the Play Store release and opens Google Play.
    // There is no iOS update to install, so it must not block iPhone.
    if (Platform.OS !== 'android' || !installed || installed === '—') {
      setPhase('ready');
      return;
    }
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 8000);
    });
    const lang = encodeURIComponent(language || 'en');
    Promise.race([apiService.get(`/auth/app-release?lang=${lang}`), timeout])
      .then(response => {
        if (cancelled) {
          return;
        }
        const latest = String(response.data?.data?.latestVersion || '').trim();
        const required = Boolean(latest) && isUpdateAvailable(installed, latest);
        setPhase(required ? 'required' : 'ready');
        setNotes(required ? toNotes(response.data?.data?.releaseNotes) : null);
      })
      .catch(() => {
        if (!cancelled) {
          setPhase('ready');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, language]);

  useEffect(() => {
    if (phase !== 'required') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [phase]);

  if (phase === 'required') {
    return (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('updateAvailableTitle')}</Text>
        <Text style={styles.body}>{t('updateAvailableBody')}</Text>
        <TouchableOpacity style={styles.button} onPress={openPlayStore} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{t('updateNow')}</Text>
        </TouchableOpacity>
        {notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.sectionTitle}>{notes.fixedTitle}</Text>
            {notes.fixed.map((item, index) => (
              <View key={`fixed-${index}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
            <Text style={[styles.sectionTitle, styles.sectionGap]}>{notes.newTitle}</Text>
            {notes.features.map((item, index) => (
              <View key={`new-${index}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  if (phase === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.templeGold} />
      </View>
    );
  }

  return <>{children}</>;
};

export default ForceUpdateGate;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#F9E7CF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9E7CF',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  body: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    minWidth: 180,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.templeGold,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  notesBox: {
    marginTop: 28,
    width: '100%',
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EBD5AE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  sectionGap: {
    marginTop: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 16,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.templeGold,
    fontWeight: '800',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
});
