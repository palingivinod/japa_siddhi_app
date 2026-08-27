import React, { useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import Colors from '../../../theme/colors';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 4,
}) => {
  const inputs = useRef<RNTextInput[]>([]);

  useEffect(() => {
    if (value.length < length) {
      inputs.current[value.length]?.focus();
    }
  }, [value, length]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');

    const otpArray = value.split('');

    otpArray[index] = digit;

    const newOtp = otpArray.join('').substring(0, length);

    onChange(newOtp);

    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: any,
    index: number,
  ) => {
    if (
      e.nativeEvent.key === 'Backspace' &&
      !value[index] &&
      index > 0
    ) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={ref => {
            if (ref) {
              inputs.current[index] = ref;
            }
          }}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={1}
          value={value[index] || ''}
          onChangeText={text => handleChange(text, index)}
          onKeyPress={e => handleKeyPress(e, index)}
          textAlign="center"
        />
      ))}
    </View>
  );
};

export default OTPInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },

  input: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    backgroundColor: Colors.white,
    fontSize: 24,
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
});