import React from 'react';
import {
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {PLAYSTORE_URL} from '../../constants/app';
import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';

const PLAY_MARKET_URL = 'market://details?id=com.japasiddhi';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const openPlayStoreApp = async () => {
  try {
    await Linking.openURL(PLAY_MARKET_URL);
  } catch {
    try {
      await Linking.openURL(PLAYSTORE_URL);
    } catch {
      // ignore
    }
  }
};

const PlayStoreFeedbackModal: React.FC<Props> = ({visible, onClose}) => {
  const {t} = useLanguage();

  const onOpenPlayStore = async () => {
    await openPlayStoreApp();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {t('playStoreFeedbackTitle') || 'Thank you!'}
          </Text>
          <Text style={styles.message}>
            {t('playStoreFeedbackMessage') ||
              'Please give your feedback on the Play Store. Your review helps other devotees.'}
          </Text>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => void onOpenPlayStore()}
            activeOpacity={0.85}>
            <Text style={styles.linkBtnText}>
              {t('rateOnPlayStore') || 'Open Play Store'}
            </Text>
            <Text style={styles.linkUrl} numberOfLines={1}>
              {PLAYSTORE_URL}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('close') || 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PlayStoreFeedbackModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  linkBtn: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  linkBtnText: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 15,
  },
  linkUrl: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontSize: 11,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
  },
});
