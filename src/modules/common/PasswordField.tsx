import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

/** Password box with a Show / Hide control. */
const PasswordField: React.FC<Props> = ({
  containerStyle,
  style,
  ...inputProps
}) => {
  const {t} = useLanguage();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={[styles.wrap, containerStyle, style]}>
      <TextInput
        {...inputProps}
        style={styles.input}
        secureTextEntry={hidden}
        underlineColorAndroid="transparent"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setHidden(value => !value)}
        hitSlop={8}
        accessibilityRole="button">
        <Text style={styles.toggleText}>
          {hidden ? t('showPassword') : t('hidePassword')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default PasswordField;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingRight: 8,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  toggle: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  toggleText: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 13,
  },
});
