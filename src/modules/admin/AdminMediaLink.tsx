import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import {resolveMediaUrl} from '../../services/profilePhoto';

const isImageUrl = (url: string) =>
  /\.(jpe?g|png|webp|gif|bmp)(\?|#|$)/i.test(url) ||
  /\/uploads\/support\//i.test(url);

type Props = {
  url?: string | null;
  label?: string;
  emptyLabel?: string;
};

/** Opens ticket screenshots / feedback media inside the app when possible. */
const AdminMediaLink: React.FC<Props> = ({
  url,
  label = 'Open attachment',
  emptyLabel = 'No attachment',
}) => {
  const resolved = useMemo(() => resolveMediaUrl(url), [url]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!resolved) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  const image = isImageUrl(resolved);

  const openExternal = async () => {
    try {
      const can = await Linking.canOpenURL(resolved);
      if (!can) {
        Alert.alert('Unable to open', 'This device cannot open the media link.');
        return;
      }
      await Linking.openURL(resolved);
    } catch {
      Alert.alert('Unable to open', 'Could not open the media link.');
    }
  };

  const onPress = () => {
    setFailed(false);
    if (image) {
      setLoading(true);
      setPreviewOpen(true);
      return;
    }
    openExternal();
  };

  return (
    <View>
      {image ? (
        <TouchableOpacity
          style={styles.thumbWrap}
          onPress={onPress}
          activeOpacity={0.85}>
          <Image
            source={{uri: resolved}}
            style={styles.thumb}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
          <Text style={styles.link}>{failed ? 'Retry / open' : label}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
          <Text style={styles.link}>{label}</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={previewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {loading ? (
              <ActivityIndicator color={Colors.templeGold} style={styles.loader} />
            ) : null}
            {failed ? (
              <Text style={styles.failText}>
                Image could not load. The file may be missing on the server.
              </Text>
            ) : (
              <Image
                source={{uri: resolved}}
                style={styles.preview}
                resizeMode="contain"
                onLoadStart={() => {
                  setLoading(true);
                  setFailed(false);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setFailed(true);
                }}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setPreviewOpen(false)}>
                <Text style={styles.modalBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={openExternal}>
                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>
                  Open in browser
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdminMediaLink;

const styles = StyleSheet.create({
  empty: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  link: {
    marginTop: 8,
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  thumbWrap: {marginTop: 8},
  thumb: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    maxHeight: '88%',
  },
  loader: {marginVertical: 12},
  preview: {
    width: '100%',
    height: 420,
    backgroundColor: '#111',
    borderRadius: 10,
  },
  failText: {
    color: Colors.error,
    fontWeight: '700',
    paddingVertical: 24,
    textAlign: 'center',
  },
  modalActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
  },
  modalBtnText: {
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  modalBtnTextPrimary: {color: Colors.white},
});
