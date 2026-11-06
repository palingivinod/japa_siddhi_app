import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../theme/colors';
import {useLanguage} from '../i18n/LanguageContext';
import {addressHasValidPin} from '../utils/deliveryAddress';

interface Props {
  visible: boolean;
  addresses: string[];
  selectedAddress?: string;
  onSelect: (address: string) => void;
  onEdit?: (address: string) => void;
  onAddNew: () => void;
  onClose: () => void;
}

const SavedAddressSelectorModal: React.FC<Props> = ({
  visible,
  addresses,
  selectedAddress,
  onSelect,
  onEdit,
  onAddNew,
  onClose,
}) => {
  const {t} = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('savedAddressesModalTitle') || 'Select Delivery Address'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {addresses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {t('noSavedAddressesFound') ||
                    'No saved addresses found. Please add a new address.'}
                </Text>
              </View>
            ) : (
              addresses.map((item, idx) => {
                const isSelected =
                  String(selectedAddress || '').trim().toLowerCase() ===
                  String(item).trim().toLowerCase();
                const hasPin = addressHasValidPin(item);
                return (
                  <View
                    key={`${item}-${idx}`}
                    style={[
                      styles.addressCard,
                      isSelected && styles.addressCardActive,
                    ]}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        onSelect(item);
                        onClose();
                      }}>
                      <View style={styles.cardRow}>
                        <View
                          style={[styles.radio, isSelected && styles.radioActive]}>
                          {isSelected ? <View style={styles.radioDot} /> : null}
                        </View>
                        <View style={styles.cardCopy}>
                          <Text
                            style={[
                              styles.addressText,
                              isSelected && styles.addressTextActive,
                            ]}>
                            {item}
                          </Text>
                          {!hasPin ? (
                            <Text style={styles.missingPinNote}>
                              {t('pinCodeMandatory') ||
                                'PIN code is mandatory (6 digits)'}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                    {onEdit ? (
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => {
                          onClose();
                          onEdit(item);
                        }}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Text style={styles.editBtnText}>
                          {t('edit') || 'Edit'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            )}

            <TouchableOpacity
              style={styles.addNewBtn}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                onAddNew();
              }}>
              <Text style={styles.addNewBtnIcon}>＋</Text>
              <Text style={styles.addNewBtnText}>
                {t('addNewAddress') || 'Add New Address'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default SavedAddressSelectorModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  addressCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8DEC8',
    padding: 14,
    marginBottom: 12,
  },
  addressCardActive: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFFBF2',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7B99D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  radioActive: {
    borderColor: Colors.templeGold,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.templeGold,
  },
  cardCopy: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  addressTextActive: {
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  missingPinNote: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
    lineHeight: 16,
  },
  editBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.leafGreen,
  },
  editBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBF2',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.templeGold,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  addNewBtnIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.templeGold,
    marginRight: 6,
  },
  addNewBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.templeGold,
  },
});
