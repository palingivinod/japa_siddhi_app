import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import Colors from '../../../theme/colors';
import profileApi from '../services/profileApi';

interface Country {
  code: string;
  name: string;
}

export interface StateModel {
  id: number;
  name: string;
}

interface Props {
  country: Country | null;
  value: StateModel | null;
  onChange: (state: StateModel) => void;
}

const StateSelector: React.FC<Props> = ({
  country,
  value,
  onChange,
}) => {
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');

  const [showDropdown, setShowDropdown] =
    useState(false);

  const [states, setStates] = useState<
    StateModel[]
  >([]);

  useEffect(() => {
    if (country) {
      loadStates();
    } else {
      setStates([]);
      setSearch('');
      setShowDropdown(false);
    }
  }, [country]);

  useEffect(() => {
    if (value) {
      setSearch(value.name);
    }
  }, [value]);
  const loadStates = async () => {
  try {
    setLoading(true);

    const response = await profileApi.getStates(
      country!.code,
    );

    setStates(response);
  } catch (error) {
    console.log('Load States Error:', error);
  } finally {
    setLoading(false);
  }
};

const filteredStates = useMemo(() => {
  if (!search.trim()) {
    return states;
  }

  return states.filter(item =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
}, [states, search]);

const onSearchChange = (text: string) => {
  setSearch(text);

  if (!showDropdown) {
    setShowDropdown(true);
  }
};

const selectState = (state: StateModel) => {
  console.log('State selected:', state);

  setSearch(state.name);

  onChange(state);

  setShowDropdown(false);
};

const onFocus = () => {
  if (country) {
    setShowDropdown(true);
  }
};
return (
  <View style={styles.wrapper}>
    <TextInput
      style={[
        styles.selector,
        !country && styles.disabled,
      ]}
      editable={!!country}
      placeholder={
        country
          ? 'Search State'
          : 'Select Country First'
      }
      placeholderTextColor={Colors.textSecondary}
      value={search}
      onFocus={onFocus}
      onChangeText={onSearchChange}
    />

    {loading && (
      <ActivityIndicator
        style={styles.loader}
        size="small"
        color={Colors.primary}
      />
    )}

    {showDropdown &&
      !loading &&
      filteredStates.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            data={filteredStates}
            keyExtractor={item =>
              item.id.toString()
            }
            style={styles.list}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() =>
                  selectState(item)
                }>
                <Text style={styles.itemText}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
  </View>
);
};

export default StateSelector;
const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },

  selector: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.textPrimary,
  },

  disabled: {
    backgroundColor: '#F5F5F5',
    color: '#999999',
  },

  loader: {
    marginTop: 12,
  },

  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 8,
    zIndex: 9999,

    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  list: {
    maxHeight: 220,
  },

  item: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
  },

  itemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});