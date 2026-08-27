import React, {useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const FeedbackScreen = () => {
  const navigation = useNavigation<any>();
  const [message, setMessage] = useState('');

  return (
    <ScreenLayout title="Share Feedback" showBack tab="Profile">
      <Text style={styles.heading}>How was your experience?</Text>
      <FormField
        label="Comments"
        placeholder="Tell us more"
        value={message}
        onChangeText={setMessage}
        multiline
        style={styles.area}
      />
      <PrimaryButton
        title="CONTINUE TO RATING"
        onPress={() => navigation.navigate('StarRating', {message})}
      />
      <Text style={styles.spacer} />
      <OutlineButton title="Skip" onPress={() => navigation.goBack()} />
    </ScreenLayout>
  );
};

export default FeedbackScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  area: {minHeight: 100, textAlignVertical: 'top'},
  spacer: {height: 12},
});
