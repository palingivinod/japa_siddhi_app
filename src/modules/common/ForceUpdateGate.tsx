import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
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

const openPlayStore = () => {
  Linking.openURL(PLAY_MARKET_URL).catch(() => {
    Linking.openURL(PLAYSTORE_URL).catch(() => undefined);
  });
};

const ForceUpdateGate = ({children}: {children: React.ReactNode}) => {
  const {t} = useLanguage();
  const [phase, setPhase] = useState<Phase>('checking');

  useEffect(() => {
    let cancelled = false;
    const installed = getAppVersionName();
    if (!installed || installed === '—') {
      setPhase('ready');
      return;
    }
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 8000);
    });
    Promise.race([apiService.get('/auth/app-release'), timeout])
      .then(response => {
        if (cancelled) {
          return;
        }
        const latest = String(response.data?.data?.latestVersion || '').trim();
        setPhase(!latest || !isUpdateAvailable(installed, latest) ? 'ready' : 'required');
      })
      .catch(() => {
        if (!cancelled) {
          setPhase('ready');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'required') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [phase]);

  if (phase === 'required') {
    return (
      <View style={styles.fill}>
        <Text style={styles.title}>{t('updateAvailableTitle')}</Text>
        <Text style={styles.body}>{t('updateAvailableBody')}</Text>
        <TouchableOpacity style={styles.button} onPress={openPlayStore} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{t('updateNow')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'checking') {
    return (
      <View style={styles.fill}>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
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
    marginTop: 28,
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
});
