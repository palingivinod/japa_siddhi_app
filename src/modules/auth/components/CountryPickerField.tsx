import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

import Colors from '../../../theme/colors';
import {dismissKeyboardThen} from '../../../utils/keyboard';
import CountrySelector from './CountrySelector';
import {CountryItem} from '../../../constants/countries';

interface Props {
  value: CountryItem;
  onChange: (country: CountryItem) => void;
}

const CountryPickerField: React.FC<Props> = ({
  value,
  onChange,
}) => {
  const [visible, setVisible] = useState(false);

  const handleSelect = (country: CountryItem) => {
    onChange(country);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.container}
        onPress={() => dismissKeyboardThen(() => setVisible(true))}>
        <Text style={styles.flag}>
          {value.flag}
        </Text>

        <View style={styles.info}>
          <Text
            style={styles.country}
            numberOfLines={1}>
            {value.name}
          </Text>

          <Text style={styles.code}>
            {value.code}
          </Text>
        </View>

        <Text style={styles.callingCode}>
          {value.callingCode}
        </Text>

        <Text style={styles.arrow}>
          ▼
        </Text>
      </TouchableOpacity>

      <CountrySelector
        visible={visible}
        onClose={() => setVisible(false)}
        onSelect={handleSelect}
      />
    </>
  );
};

export default CountryPickerField;

const styles = StyleSheet.create({
  container: {
    height: 58,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 20,
  },

  flag: {
    fontSize: 24,
    marginRight: 12,
  },

  info: {
    flex: 1,
  },

  country: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  code: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  callingCode: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginRight: 10,
  },

  arrow: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});