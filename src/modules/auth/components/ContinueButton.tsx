import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import Colors from '../../../theme/colors';
import {useLanguage} from '../../../i18n/LanguageContext';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const ContinueButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
}: Props) => {
  const {tt} = useLanguage();
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
      disabled={disabled || loading}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator color={Colors.buttonPrimaryText} />
      ) : (
        <Text style={styles.text}>{tt(title)}</Text>
      )}
    </TouchableOpacity>
  );
};

export default ContinueButton;

const styles = StyleSheet.create({
  button: {
    height: 55,
    backgroundColor: Colors.buttonPrimary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  disabled: {
    backgroundColor: Colors.buttonDisabled,
  },

  text: {
    color: Colors.buttonPrimaryText,
    fontSize: 17,
    fontWeight: '700',
  },
});