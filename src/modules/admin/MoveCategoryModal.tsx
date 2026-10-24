import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import {MantraCategoryOption} from '../japa/mantraCategories';

type Props = {
  visible: boolean;
  mantraName?: string;
  title?: string;
  subtitle?: string;
  categories: MantraCategoryOption[];
  onCancel: () => void;
  onSelect: (category: MantraCategoryOption) => void;
};

const MoveCategoryModal: React.FC<Props> = ({
  visible,
  mantraName,
  title,
  subtitle,
  categories,
  onCancel,
  onSelect,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onCancel}>
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>
          {title || `Move "${mantraName || ''}"`}
        </Text>
        <Text style={styles.sub}>{subtitle || 'Choose the category.'}</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.code}
              style={styles.option}
              activeOpacity={0.8}
              onPress={() => onSelect(category)}>
              <Text style={styles.optionText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default MoveCategoryModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: '70%',
  },
  title: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
  },
  sub: {
    marginTop: 4,
    marginBottom: 10,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingVertical: 12,
  },
  optionText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 15,
  },
});
