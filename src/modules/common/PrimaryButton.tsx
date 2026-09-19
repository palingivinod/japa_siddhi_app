import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const PrimaryButton: React.FC<Props> = ({title, onPress, disabled}) => {
  const {tt} = useLanguage();
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}>
      <Text
        style={styles.text}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        maxFontSizeMultiplier={1.15}
        allowFontScaling>
        {tt(title)}
      </Text>
    </TouchableOpacity>
  );
};

export default PrimaryButton;

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: Colors.templeGold,
    borderRadius: 30,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  text: {
    width: '100%',
    color: Colors.white,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
    // letterSpacing breaks mid-word wraps on some Android widths.
    letterSpacing: 0,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
