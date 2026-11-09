import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../../theme/colors';
import {CountryItem} from '../../../constants/countries';
import {digitsOnly, MOBILE_DIGITS} from '../../../utils/validators';
import {dismissKeyboardThen} from '../../../utils/keyboard';
import CountrySelector from './CountrySelector';

type Props = {
  country: CountryItem;
  mobile: string;
  onCountryChange: (country: CountryItem) => void;
  onMobileChange: (mobile: string) => void;
  label?: string;
  editable?: boolean;
};

const MobileWithCountryField = ({
  country,
  mobile,
  onCountryChange,
  onMobileChange,
  label,
  editable = true,
}: Props) => {
  const [showPicker, setShowPicker] = useState(false);
  const isIndia = country.code === 'IN';
  const maxLen = isIndia ? MOBILE_DIGITS : 15;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.countryBtn, !editable && styles.disabled]}
          activeOpacity={0.7}
          disabled={!editable}
          onPress={() =>
            editable ? dismissKeyboardThen(() => setShowPicker(true)) : undefined
          }>
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.calling}>{country.callingCode || '+91'}</Text>
          {editable ? <Text style={styles.chevron}>▾</Text> : null}
        </TouchableOpacity>
        <TextInput
          style={[styles.input, styles.mobileInput, !editable && styles.disabled]}
          value={mobile}
          editable={editable}
          onChangeText={text => onMobileChange(digitsOnly(text).slice(0, maxLen))}
          keyboardType="phone-pad"
          placeholder={isIndia ? `${MOBILE_DIGITS}-digit mobile` : 'Mobile number'}
          placeholderTextColor={Colors.placeholder}
          maxLength={maxLen}
          underlineColorAndroid="transparent"
        />
      </View>
      <CountrySelector
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={item => {
          onCountryChange(item);
          setShowPicker(false);
        }}
      />
    </View>
  );
};

export default MobileWithCountryField;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  countryBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    flexShrink: 0,
  },
  flag: {
    fontSize: 20,
  },
  calling: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  chevron: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  mobileInput: {
    flex: 1,
  },
  disabled: {
    opacity: 0.75,
  },
});
