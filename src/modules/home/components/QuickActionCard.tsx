import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../../theme/colors';
import { HomeQuickAction } from '../types/home';

interface Props {
  item: HomeQuickAction;
  onPress: (route: string) => void;
}

const localImages: Record<string, any> = {
  japa: require('../../../assets/images/chant.webp'),
  family: require('../../../assets/images/family_japa.webp'),
  donation: require('../../../assets/images/donation.webp'),
  banalingam: require('../../../assets/images/bana_linga_icon.png'),
  store: require('../../../assets/images/spiritual_store.webp'),
  orders: require('../../../assets/images/order.webp'),
  progress: require('../../../assets/images/myprogress.webp'),
  achievements: require('../../../assets/images/achievements.webp'),
  festivals: require('../../../assets/images/festivals.webp'),
  customer_care: require('../../../assets/images/customer_care.webp'),
  profile: require('../../../assets/images/profile.webp'),
};

const QuickActionCard: React.FC<Props> = ({
  item,
  onPress,
}) => {
  const [visible, setVisible] = useState(false);

  const imageSource = useMemo(() => {
    if (item.image && item.image.trim().length > 0) {
      return { uri: item.image };
    }

    return localImages[item.icon] || localImages.japa;
  }, [item]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => onPress(item.route)}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.infoButton}
          onPress={() => setVisible(true)}
        >
          <Text style={styles.infoText}>
            i
          </Text>
        </TouchableOpacity>

        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          {item.title}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>
              {item.title}
            </Text>

            <Text style={styles.popupDescription}>
              {item.description}
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default QuickActionCard;

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  image: {
    width: 72,
    height: 72,
    marginBottom: 14,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  infoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 12,
  },

  overlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  popup: {
    width: '92%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
  },

  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },

  popupDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  closeButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },

  closeText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});