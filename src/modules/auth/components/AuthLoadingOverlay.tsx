import React from 'react';
import {ActivityIndicator, Modal, StyleSheet, Text, View} from 'react-native';

import Colors from '../../../theme/colors';

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
};

/**
 * Full-screen blocking loader for Google / phone auth.
 * Button-only spinners are easy to miss while native sheets open.
 */
const AuthLoadingOverlay = ({
  visible,
  title = 'Please wait...',
  subtitle = 'Signing you in',
}: Props) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.templeGold} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  </Modal>
);

export default AuthLoadingOverlay;

/** Let React paint the overlay before opening native Google / Firebase UI. */
export const waitForLoadingPaint = () =>
  new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 80);
    });
  });

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(40, 24, 12, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    minWidth: 240,
    maxWidth: 320,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
