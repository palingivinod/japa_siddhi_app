import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const ReferenceChantScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState(0);

  const goSmart = (durationMs = 2500) => {
    navigation.navigate('Chant', {
      mode: route.params?.mode || 'community',
      mantraId: route.params?.mantraId,
      privateMantra: route.params?.privateMantra,
      goal: route.params?.goal || 2000,
      durationMs,
    });
  };

  const toggleRecord = async () => {
    if (!recording) {
      setStartedAt(Date.now());
      setRecording(true);
      return;
    }
    const durationMs = Math.max(800, Date.now() - startedAt);
    setRecording(false);
    try {
      await apiService.post('/japa/reference', {
        mantraId: route.params?.mantraId,
        durationMs,
      });
    } catch {
      undefined;
    }
    goSmart(durationMs);
  };

  return (
    <ScreenLayout title="Reference Chant" showBack tab="JapaHub">
      <View style={styles.circle}>
        <View style={styles.dot} />
      </View>
      <Text style={styles.title}>Record a short reference chant</Text>
      <Text style={styles.copy}>
        Start and stop once while you chant aloud. This only captures your
        rhythm timing — counting happens on the next screen by tapping once
        per japa toward your goal.
      </Text>
      <PrimaryButton
        title={recording ? 'STOP RECORDING' : 'START RECORDING'}
        onPress={toggleRecord}
      />
      <View style={styles.gap} />
      <OutlineButton title="SKIP" onPress={() => goSmart()} />
    </ScreenLayout>
  );
};

export default ReferenceChantScreen;

const styles = StyleSheet.create({
  circle: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.sacredBrown,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  copy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginVertical: 16,
    lineHeight: 22,
  },
  gap: {height: 12},
});
