import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';

interface Props {
  title: string;
  onPress: () => void;
}

const OutlineButton: React.FC<Props> = ({title, onPress}) => {
  const {tt} = useLanguage();
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
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

export default OutlineButton;

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 30,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    width: '100%',
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
