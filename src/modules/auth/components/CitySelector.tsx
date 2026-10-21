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

interface StateModel {
  id: number;
  name: string;
}

export interface CityModel {
  id: number;
  name: string;
}

interface Props {
  state: StateModel | null;
  value: CityModel | null;
  onChange: (city: CityModel) => void;
}

const CitySelector: React.FC<Props> = ({
  state,
  value,
  onChange,
}) => {
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');

  const [showDropdown, setShowDropdown] =
    useState(false);

  const [cities, setCities] = useState<
    CityModel[]
  >([]);

  useEffect(() => {
    if (state) {
      loadCities();
    } else {
      setCities([]);
      setSearch('');
      setShowDropdown(false);
    }
  }, [state]);

  useEffect(() => {
    if (value) {
      setSearch(value.name);
    }
  }, [value]);
  const loadCities = async () => {
  try {
    setLoading(true);

    const response = await profileApi.getCities(
      state!.id,
    );

    setCities(response);
  } catch (error) {
    console.log('Load Cities Error:', error);
  } finally {
    setLoading(false);
  }
};

const filteredCities = useMemo(() => {
  if (!search.trim()) {
    return cities;
  }

  return cities.filter(item =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
}, [cities, search]);

const onSearchChange = (text: string) => {
  setSearch(text);

  if (!showDropdown) {
    setShowDropdown(true);
  }
};

const selectCity = (
  city: CityModel,
) => {
  setSearch(city.name);

  onChange(city);

  setShowDropdown(false);
};

const onFocus = () => {
  if (state) {
    setShowDropdown(true);
  }
};
console.log('State:', state);
return (
  <View style={styles.wrapper}>
    <TextInput
      style={[
        styles.selector,
        !state && styles.disabled,
      ]}
      editable={true}
      placeholderTextColor={Colors.textSecondary}
      placeholder={
        state
          ? 'Search City'
          : 'Select State First'
      }
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
      filteredCities.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            data={filteredCities}
            keyExtractor={item =>
              item.id.toString()
            }
            style={styles.list}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() =>
                  selectCity(item)
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

export default CitySelector;
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
    fontWeight: '500',
  },
});