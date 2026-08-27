import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';

interface Props {
  title: string;
  showBack?: boolean;
}

const AppHeader: React.FC<Props> = ({title, showBack = false}) => {
  const navigation = useNavigation();

  return (
    <View style={styles.row}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Image
        source={require('../../assets/images/login_logo.webp')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  back: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 32,
    color: Colors.sacredBrown,
    lineHeight: 34,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  logo: {
    width: 40,
    height: 40,
  },
});
