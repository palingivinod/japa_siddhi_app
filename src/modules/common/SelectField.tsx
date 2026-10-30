import React, {useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import {dismissKeyboardThen} from '../../utils/keyboard';

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
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter(option =>
      String(option.label || '')
        .toLowerCase()
        .includes(q),
    );
  }, [options, query]);

  const open = () => {
    dismissKeyboardThen(() => {
      setQuery('');
      setVisible(true);
    });
  };

  const pick = (next: string) => {
    onChange(next);
    setVisible(false);
    setQuery('');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        activeOpacity={0.8}
        onPress={open}>
        <Text style={selected ? styles.value : styles.placeholder} numberOfLines={2}>
          {selected?.label || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.title}>{title || placeholder}</Text>
            {options.length > 8 ? (
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={Colors.textSecondary}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            ) : null}
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No matches.</Text>
              ) : (
                filtered.map((option, index) => {
                  const active = option.value === value;
                  return (
                    <TouchableOpacity
                      key={`${option.value}-${index}`}
                      style={styles.option}
                      activeOpacity={0.7}
                      onPress={() => pick(option.value)}>
                      <Text
                        style={active ? styles.optionActive : styles.optionText}
                        numberOfLines={3}>
                        {option.label}
                      </Text>
                      {active ? <Text style={styles.tick}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setVisible(false)}
              activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  value: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.sacredBrown,
    paddingRight: 8,
  },
  placeholder: {flex: 1, fontSize: 16, color: Colors.textSecondary},
  chevron: {fontSize: 16, color: Colors.templeGold, marginLeft: 12},
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 8,
    maxHeight: '75%',
    zIndex: 2,
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
  search: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.sacredBrown,
    backgroundColor: '#FAF8F5',
  },
  empty: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    color: Colors.textSecondary,
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
  optionText: {flex: 1, fontSize: 16, color: Colors.sacredBrown, paddingRight: 8},
  optionActive: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.templeGold,
    paddingRight: 8,
  },
  tick: {fontSize: 16, color: Colors.templeGold},
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
});
