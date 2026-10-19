import React, {useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import Colors from '../../../theme/colors';
import {useLanguage} from '../../../i18n/LanguageContext';

export const RATE_PER_PERSON = 80;

export const PERSON_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25, 30, 40, 50, 75, 100, 108, 150, 200, 250, 500,
];

type Props = {
  persons: number;
  onChangePersons: (count: number) => void;
  title?: string;
};

const AnnadanamMembersSelector: React.FC<Props> = ({
  persons,
  onChangePersons,
  title,
}) => {
  const {t} = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const currentCount = Math.max(0, persons);
  const totalAmount = currentCount * RATE_PER_PERSON;
  const headerTitle = title || t('selectNoOfPersons');
  const personUnit = (count: number) =>
    count === 1 ? t('personOne') : t('personMany');
  const devoteeUnit = (count: number) =>
    count === 1 ? t('devoteeOne') : t('devoteeMany');

  const handleTextChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const num = digits ? parseInt(digits, 10) : 0;
    onChangePersons(num);
  };

  const selectOption = (num: number) => {
    onChangePersons(num);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{headerTitle}</Text>
        <View style={styles.rateBadge}>
          <Text style={styles.rateText}>
            {t('rateSlashPerson', {rate: RATE_PER_PERSON})}
          </Text>
        </View>
      </View>

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}>
          <Text style={styles.dropdownBtnText} numberOfLines={1}>
            {currentCount > 0 ? `${currentCount}` : t('selectShort')}
          </Text>
          <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>{t('or')}</Text>

        <View style={styles.textInputWrap}>
          <TextInput
            style={styles.textInput}
            value={currentCount > 0 ? String(currentCount) : ''}
            onChangeText={handleTextChange}
            placeholder={t('enterNoOfPersons')}
            placeholderTextColor={Colors.placeholder}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
      </View>

      <View style={styles.calcCard}>
        <View style={styles.calcRow}>
          <Text style={styles.calcFormula}>
            {t('personsTimesRate', {
              count: currentCount,
              unit: personUnit(currentCount || 0),
              rate: RATE_PER_PERSON,
            })}
          </Text>
          <Text style={styles.calcTotal}>
            ₹ {totalAmount.toLocaleString()}
          </Text>
        </View>
        <Text style={styles.calcSub}>
          {currentCount > 0
            ? t('sevaSacredMeals', {
                count: currentCount,
                unit: devoteeUnit(currentCount),
              })
            : t('selectDevoteesSponsor')}
        </Text>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('selectNoOfPersons')}</Text>
                  <Text style={styles.modalSubtitle}>
                    {t('ratePerPersonFull', {rate: RATE_PER_PERSON})}
                  </Text>
                </View>

                <FlatList
                  data={PERSON_OPTIONS}
                  keyExtractor={item => String(item)}
                  showsVerticalScrollIndicator={true}
                  style={styles.list}
                  renderItem={({item}) => {
                    const isSelected = item === currentCount;
                    const itemTotal = item * RATE_PER_PERSON;
                    return (
                      <TouchableOpacity
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                        onPress={() => selectOption(item)}>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}>
                          {item} {personUnit(item)}
                        </Text>
                        <Text
                          style={[
                            styles.optionAmount,
                            isSelected && styles.optionAmountSelected,
                          ]}>
                          ₹ {itemTotal.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>{t('close')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default AnnadanamMembersSelector;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: false,
    paddingBottom: 2,
    marginRight: 8,
  },
  rateBadge: {
    backgroundColor: '#FFF4E0',
    borderColor: Colors.templeGold,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rateText: {
    color: Colors.sacredBrown,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    includeFontPadding: false,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownBtn: {
    width: 95,
    height: 52,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  dropdownArrow: {
    fontSize: 15,
    color: Colors.templeGold,
    fontWeight: '800',
    marginLeft: 4,
  },
  orText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: 2,
    alignSelf: 'center',
  },
  textInputWrap: {
    flex: 1,
  },
  textInput: {
    height: 52,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  calcCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  calcFormula: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: Colors.leafGreen,
    includeFontPadding: false,
    paddingBottom: 2,
  },
  calcTotal: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: false,
  },
  calcSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 22,
    includeFontPadding: false,
    paddingBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E7DB',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.leafGreen,
    fontWeight: '700',
    marginTop: 2,
  },
  list: {
    maxHeight: 340,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionRowSelected: {
    backgroundColor: '#FFF4E0',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  optionTextSelected: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  optionAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  optionAmountSelected: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
  closeBtn: {
    marginTop: 14,
    paddingVertical: 12,
    backgroundColor: Colors.lightGold,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
  },
});
