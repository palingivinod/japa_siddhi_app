import React, {useMemo, useState} from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';

import Colors from '../../../theme/colors';
import countries, {
  CountryItem,
} from '../../../constants/countries';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: CountryItem) => void;
}

const CountrySelector: React.FC<Props> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      const india = countries.find(c => c.code === 'IN');
      const others = countries.filter(c => c.code !== 'IN');
      return india ? [india, ...others] : countries;
    }

    return countries.filter(
      item =>
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.callingCode.includes(keyword),
    );
  }, [search]);

  const handleSelect = (country: CountryItem) => {
    onSelect(country);
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Country</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search Country (e.g. India, +91)"
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filteredCountries}
          keyExtractor={item => item.code}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSelect(item)}>
              <Text style={styles.flag}>{item.flag}</Text>

              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.countryCode}>{item.code}</Text>
              </View>

              <Text style={styles.callingCode}>{item.callingCode}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
};

export default CountrySelector;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECE7DE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },

  search: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.white,
    color: Colors.textPrimary,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  flag: {
    fontSize: 24,
    width: 45,
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  countryCode: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  callingCode: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});