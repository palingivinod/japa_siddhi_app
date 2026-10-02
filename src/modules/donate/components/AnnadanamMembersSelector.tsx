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
  title = 'Number of Devotees / Persons',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const currentCount = Math.max(0, persons);
  const totalAmount = currentCount * RATE_PER_PERSON;

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
        <Text style={styles.label}>{title}</Text>
        <View style={styles.rateBadge}>
          <Text style={styles.rateText}>₹{RATE_PER_PERSON} / person</Text>
        </View>
      </View>

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}>
          <Text style={styles.dropdownBtnText}>
            {currentCount > 0 ? `${currentCount} ${currentCount === 1 ? 'Person' : 'Persons'}` : 'Select Persons'}
          </Text>
          <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>

        <View style={styles.textInputWrap}>
          <TextInput
            style={styles.textInput}
            value={currentCount > 0 ? String(currentCount) : ''}
            onChangeText={handleTextChange}
            placeholder="Qty"
            placeholderTextColor={Colors.placeholder}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>

      <View style={styles.calcCard}>
        <View style={styles.calcRow}>
          <Text style={styles.calcFormula}>
            {currentCount > 0 ? `${currentCount} ${currentCount === 1 ? 'Person' : 'Persons'} × ₹${RATE_PER_PERSON}` : `0 Persons × ₹${RATE_PER_PERSON}`}
          </Text>
          <Text style={styles.calcTotal}>
            ₹ {totalAmount.toLocaleString()}
          </Text>
        </View>
        <Text style={styles.calcSub}>
          {currentCount > 0
            ? `Your seva will provide sacred meals to ${currentCount} ${currentCount === 1 ? 'devotee' : 'devotees'}.`
            : 'Select or enter the number of devotees to sponsor food for.'}
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
                  <Text style={styles.modalTitle}>Select Number of Persons</Text>
                  <Text style={styles.modalSubtitle}>Rate: ₹{RATE_PER_PERSON} per person</Text>
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
                          {item} {item === 1 ? 'Person' : 'Persons'}
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
                  <Text style={styles.closeBtnText}>CLOSE</Text>
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
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 15,
  },
  rateBadge: {
    backgroundColor: '#FFF4E0',
    borderColor: Colors.templeGold,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rateText: {
    color: Colors.sacredBrown,
    fontSize: 12,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  dropdownArrow: {
    fontSize: 16,
    color: Colors.templeGold,
    fontWeight: '800',
  },
  textInputWrap: {
    width: 90,
  },
  textInput: {
    height: 52,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  calcCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    padding: 14,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calcFormula: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  calcTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  calcSub: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
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
