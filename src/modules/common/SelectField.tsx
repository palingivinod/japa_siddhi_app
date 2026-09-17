import React, {useState} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';

export interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
}

/**
 * Plain dropdown: a field that opens a list of choices. Replaces the native
 * wheel picker, which rendered as an unreadable inline spinner on iOS.
 */
const SelectField: React.FC<Props> = ({
  value,
  options,
  onChange,
  placeholder = 'Select',
  title,
}) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(option => option.value === value);

  const pick = (next: string) => {
    onChange(next);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        activeOpacity={0.8}
        onPress={() => setVisible(true)}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected?.label || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{title || placeholder}</Text>
            <ScrollView bounces={false}>
              {options.map(option => {
                const active = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value || 'none'}
                    style={styles.option}
                    activeOpacity={0.7}
                    onPress={() => pick(option.value)}>
                    <Text style={active ? styles.optionActive : styles.optionText}>
                      {option.label}
                    </Text>
                    {active ? <Text style={styles.tick}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default SelectField;

const styles = StyleSheet.create({
  field: {
    minHeight: 54,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  value: {fontSize: 16, fontWeight: '600', color: Colors.sacredBrown},
  placeholder: {fontSize: 16, color: Colors.placeholder},
  chevron: {fontSize: 16, color: Colors.templeGold, marginLeft: 12},
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 8,
    maxHeight: '70%',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  option: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEE2',
  },
  optionText: {fontSize: 16, color: Colors.sacredBrown},
  optionActive: {fontSize: 16, fontWeight: '800', color: Colors.templeGold},
  tick: {fontSize: 16, color: Colors.templeGold},
});
