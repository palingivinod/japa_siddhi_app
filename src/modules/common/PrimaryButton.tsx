import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';

import Colors from '../../theme/colors';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const PrimaryButton: React.FC<Props> = ({title, onPress, disabled}) => (
  <TouchableOpacity
    style={[styles.button, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}>
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
);

export default PrimaryButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.templeGold,
    borderRadius: 30,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  disabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  text: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.6,
  },
});
