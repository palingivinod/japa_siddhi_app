import React from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity} from 'react-native';

import ENV from '../../env';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const PrivacyPolicyScreen = () => {
  return (
    <ScreenLayout title="Privacy Policy">
      <Text style={styles.updated}>Last updated: 16 August 2026</Text>
      <Text style={styles.body}>
        Japa Siddhi is operated by Bilva Patra Trust. This policy explains what
        we collect and how we use it when you use the Japa Siddhi app.
      </Text>
      <Text style={styles.heading}>Information we collect</Text>
      <Text style={styles.body}>
        We collect your name, mobile number, email address, date of birth,
        gender, address, language, and optional spiritual details such as
        gothram and nakshatram. We also store japa counts, donations you record,
        orders, feedback, and support messages.
      </Text>
      <Text style={styles.heading}>How we use it</Text>
      <Text style={styles.body}>
        We use this information to create your account, send a login OTP to your
        email, save your japa progress, process seva requests, and contact you
        about your account. Seva payments are completed in your UPI app as a
        donation to Bilva Patra Trust and are not Google Play purchases. We do
        not sell your personal data and we do not use advertising IDs.
      </Text>
      <Text style={styles.heading}>Account deletion</Text>
      <Text style={styles.body}>
        You can delete your account from Profile → Delete account. This removes
        your login and personal profile from our systems.
      </Text>
      <Text style={styles.heading}>Contact</Text>
      <Text style={styles.body}>
        Email {ENV.SUPPORT_EMAIL} for privacy questions.
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(ENV.PRIVACY_POLICY_URL)}>
        <Text style={styles.link}>Open privacy policy online</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  updated: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  heading: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  body: {
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: 15,
  },
  link: {
    marginTop: 20,
    color: Colors.primary,
    fontWeight: '700',
  },
});
