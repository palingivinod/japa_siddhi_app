import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';

import Colors from '../../theme/colors';

interface Props {
  title: string;
  onPress: () => void;
}

const OutlineButton: React.FC<Props> = ({title, onPress}) => (
  <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
);

export default OutlineButton;

const styles = StyleSheet.create({
  button: {
    borderRadius: 30,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
  },
  text: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.6,
  },
});
