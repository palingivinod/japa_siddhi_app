import React from 'react';
import {StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';

interface Props extends TextInputProps {
  label: string;
}

const FormField: React.FC<Props> = ({label, style, placeholder, ...props}) => {
  const {tt} = useLanguage();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{tt(label)}</Text>
      <TextInput
        placeholder={placeholder ? tt(placeholder) : placeholder}
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
};

export default FormField;

const styles = StyleSheet.create({
  wrap: {marginBottom: 14},
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.sacredBrown,
  },
});
