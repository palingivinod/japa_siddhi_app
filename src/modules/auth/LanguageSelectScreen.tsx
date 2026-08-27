import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {APP_LANGUAGES, getLanguage, saveLanguage} from '../../services/language';
import apiService from '../../services/apiService';
import AppHeader from '../common/AppHeader';
import PrimaryButton from '../common/PrimaryButton';

const LanguageSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fromSettings = route.params?.fromSettings;
  const [selected, setSelected] = useState('en');

  useEffect(() => {
    getLanguage().then(code => {
      if (code) {
        setSelected(code);
      }
    });
  }, []);

  const continueNext = async () => {
    await saveLanguage(selected);
    try {
      await apiService.put('/profile/settings', {languageCode: selected});
    } catch {
      undefined;
    }
    if (fromSettings) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader title="Choose Language" showBack={fromSettings} />
      <Text style={styles.hint}>Select your preferred language</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {APP_LANGUAGES.map(item => {
          const active = item.code === selected;
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => setSelected(item.code)}>
              <View>
                <Text style={styles.name}>{item.nativeName}</Text>
                {item.nativeName !== item.name ? (
                  <Text style={styles.native}>{item.name}</Text>
                ) : null}
              </View>
              <Text style={styles.mark}>{active ? '✓' : '›'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <PrimaryButton title="CONTINUE" onPress={continueNext} />
    </SafeAreaView>
  );
};

export default LanguageSelectScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  hint: {
    textAlign: 'center',
    color: Colors.sacredBrown,
    fontSize: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActive: {
    borderColor: Colors.templeGold,
    borderWidth: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  native: {
    marginTop: 2,
    color: Colors.leafGreen,
  },
  mark: {
    fontSize: 22,
    color: Colors.templeGold,
    fontWeight: '700',
  },
});
