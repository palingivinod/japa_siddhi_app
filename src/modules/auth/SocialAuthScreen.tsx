import React, {useState} from 'react';
import {ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';
import {resetAuthGate} from '../common/AuthGate';
import {
  explainGoogleSignInError,
  signInWithGoogle,
} from './services/googleAuthService';
import {
  explainFacebookSignInError,
  signInWithFacebook,
} from './services/facebookAuthService';
import ENV from '../../env';
import {formatDobDisplay, parseDob, maskDob} from '../../utils/dobUtils';
import DatePickerModal from '../common/DatePickerModal';
import ProfileApi from './services/profileApi';
import {resetAfterSocialAuth, resetToHomeAfterAuth} from '../../navigation/goHomeAfterAuth';

const showAlertLater = (title: string, message: string) => {
  // Android Activity can be null right as native sign-in returns; Alert then
  // no-ops or destabilizes the resume. Wait a beat before presenting UI.
  setTimeout(() => Alert.alert(title, message), 350);
};

const isCancelledSignIn = (error: any, message: string) =>
  /cancel|cancelled|12501|SIGN_IN_CANCELLED|USER_CANCELLED/i.test(message) ||
  error?.code === '12501' ||
  error?.code === 'SIGN_IN_CANCELLED';

const SocialAuthScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const provider = String(route.params?.provider || 'Email');
  const [busy, setBusy] = useState(false);

  // Google sign in post-step fields (if DOB / Title needed)
  const [showGoogleDetailsModal, setShowGoogleDetailsModal] = useState(false);
  const [googleDobText, setGoogleDobText] = useState('');
  const [googleDobIso, setGoogleDobIso] = useState('');
  const [showGoogleDobPicker, setShowGoogleDobPicker] = useState(false);
  const [googleTitle, setGoogleTitle] = useState<'Mr' | 'Mrs' | ''>('');
  const [googleSaving, setGoogleSaving] = useState(false);
  const providerLabel =
    provider === 'Google'
      ? t('socialGoogle')
      : provider === 'Facebook'
        ? t('socialFacebook')
        : provider;

  const continueWithGoogle = async () => {
    if (!String(ENV.GOOGLE_WEB_CLIENT_ID || '').trim()) {
      showAlertLater(t('googleSetupNeeded'), t('googleSetupMessage'));
      return;
    }

    if (busy) {
      return;
    }

    try {
      setBusy(true);
      const signedIn = await signInWithGoogle();
      resetAuthGate();
      setTimeout(() => {
        resetAfterSocialAuth(navigation, signedIn.user, {
          title: t('socialDetailsTitle'),
          message: t('socialDetailsMessage'),
          ok: t('ok'),
        });
      }, 150);
    } catch (error: any) {
      const message = explainGoogleSignInError(error);
      if (isCancelledSignIn(error, message)) {
        return;
      }
      showAlertLater(t('googleSignInTitle'), message);
    } finally {
      setBusy(false);
    }
  };

  const continueWithFacebook = async () => {
    if (
      !String(ENV.FACEBOOK_APP_ID || '').trim() ||
      !String(ENV.FACEBOOK_CLIENT_TOKEN || '').trim()
    ) {
      showAlertLater(t('facebookSetupNeeded'), t('facebookSetupMessage'));
      return;
    }

    if (busy) {
      return;
    }

    try {
      setBusy(true);
      const signedIn = await signInWithFacebook();
      resetAuthGate();
      setTimeout(() => {
        resetAfterSocialAuth(navigation, signedIn.user, {
          title: t('socialDetailsTitle'),
          message: t('socialDetailsMessage'),
          ok: t('ok'),
        });
      }, 150);
    } catch (error: any) {
      const message = explainFacebookSignInError(error);
      if (isCancelledSignIn(error, message)) {
        return;
      }
      showAlertLater(t('facebookSignInTitle'), message);
    } finally {
      setBusy(false);
    }
  };


  const submitGoogleDetails = async () => {
    const parsed = parseDob(googleDobText) || googleDobIso;
    if (!parsed) {
      Alert.alert(t('required') || 'Required', (t as any)('enterDateOfBirth') || 'Please enter Date of Birth');
      return;
    }
    if (!googleTitle) {
      Alert.alert(t('required') || 'Required', 'Please select Mr or Mrs');
      return;
    }

    setGoogleSaving(true);
    try {
      await ProfileApi.updateProfile({
        dateOfBirth: parsed,
        gender: googleTitle === 'Mrs' ? 'Female' : 'Male',
      });
      setShowGoogleDetailsModal(false);
      resetAuthGate();
      await resetToHomeAfterAuth(navigation);
    } catch (error: any) {
      Alert.alert(
        (t as any)('updateFailedTitle') || 'Error',
        error?.response?.data?.message || 'Could not save details',
      );
    } finally {
      setGoogleSaving(false);
    }
  };

  if (provider === 'Google') {
    return (
      <ScreenLayout title={t('continueWithGoogle')} showBack>
        <Text style={styles.title}>{t('continueWithGoogle')}</Text>
        <Text style={styles.copy}>{t('googleAuthHelper')}</Text>
        {busy ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.templeGold} />
            <Text style={styles.loadingTitle}>Signing in with Google...</Text>
            <Text style={styles.loadingSubtitle}>
              Please wait while we connect your account
            </Text>
          </View>
        ) : (
          <>
            <PrimaryButton
              title={t('continueWithGoogleBtn')}
              onPress={continueWithGoogle}
            />
            <View style={styles.gap} />
            <OutlineButton
              title={t('signInWithEmailPassword')}
              onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
            />
          </>
        )}
              {/* Google Details Modal (Date of Birth and Mr / Mrs) */}
        <Modal
          visible={showGoogleDetailsModal}
          transparent
          animationType="slide"
          onRequestClose={() => {}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Complete Details</Text>
              <Text style={styles.modalSubtitle}>
                Please provide your Date of Birth and select Mr or Mrs to continue.
              </Text>

              {/* Google Date of Birth */}
              <Text style={styles.label}>{(t as any)('dateOfBirth') || 'Date of Birth'} *</Text>
              <View style={styles.dobRow}>
                <TextInput
                  style={[styles.inputField, styles.dobInput]}
                  value={googleDobText}
                  onChangeText={value => {
                    const masked = maskDob(value);
                    setGoogleDobText(masked);
                    const parsed = parseDob(masked);
                    if (parsed) {
                      setGoogleDobIso(parsed);
                    }
                  }}
                  placeholder={(t as any)('dobFormatPlaceholder') || 'DD-MM-YYYY'}
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.dobButton}
                  onPress={() => setShowGoogleDobPicker(true)}>
                  <Text style={styles.dobButtonText}>📅</Text>
                </TouchableOpacity>
              </View>
              <DatePickerModal
                visible={showGoogleDobPicker}
                value={(() => {
                  const picked = parseDob(googleDobText) || googleDobIso;
                  return picked
                    ? new Date(
                        Number(picked.slice(0, 4)),
                        Number(picked.slice(5, 7)) - 1,
                        Number(picked.slice(8, 10)),
                      )
                    : new Date(1995, 0, 1);
                })()}
                maximumDate={new Date()}
                onCancel={() => setShowGoogleDobPicker(false)}
                onConfirm={selected => {
                  const month = String(selected.getMonth() + 1).padStart(2, '0');
                  const day = String(selected.getDate()).padStart(2, '0');
                  const iso = `${selected.getFullYear()}-${month}-${day}`;
                  setGoogleDobIso(iso);
                  setGoogleDobText(formatDobDisplay(iso));
                  setShowGoogleDobPicker(false);
                }}
              />

              {/* Google Mr or Mrs */}
              <Text style={styles.label}>Mr or Mrs *</Text>
              <View style={styles.titleRow}>
                <TouchableOpacity
                  style={[
                    styles.titleBtn,
                    googleTitle === 'Mr' && styles.titleBtnActive,
                  ]}
                  onPress={() => setGoogleTitle('Mr')}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.titleBtnText,
                      googleTitle === 'Mr' && styles.titleBtnTextActive,
                    ]}>
                    Mr
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.titleBtn,
                    googleTitle === 'Mrs' && styles.titleBtnActive,
                  ]}
                  onPress={() => setGoogleTitle('Mrs')}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.titleBtnText,
                      googleTitle === 'Mrs' && styles.titleBtnTextActive,
                    ]}>
                    Mrs
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{marginTop: 20}}>
                {googleSaving ? (
                  <ActivityIndicator color={Colors.templeGold} size="large" />
                ) : (
                  <PrimaryButton
                    title="CONTINUE TO HOME"
                    onPress={submitGoogleDetails}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      </ScreenLayout>
    );
  }

  if (provider === 'Facebook') {
    return (
      <ScreenLayout title={t('continueWithFacebook')} showBack>
        <Text style={styles.title}>{t('continueWithFacebook')}</Text>
        <Text style={styles.copy}>{t('facebookAuthHelper')}</Text>
        {busy ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.templeGold} />
            <Text style={styles.loadingTitle}>Signing in with Facebook...</Text>
            <Text style={styles.loadingSubtitle}>
              Please wait while we connect your account
            </Text>
          </View>
        ) : (
          <>
            <PrimaryButton
              title={t('continueWithFacebookBtn')}
              onPress={continueWithFacebook}
            />
            <View style={styles.gap} />
            <OutlineButton
              title={t('tryGoogleInstead')}
              onPress={() =>
                navigation.replace('SocialAuth', {provider: 'Google'})
              }
            />
            <View style={styles.gap} />
            <OutlineButton
              title={t('signInWithEmailPassword')}
              onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
            />
          </>
        )}
              {/* Google Details Modal (Date of Birth and Mr / Mrs) */}
        <Modal
          visible={showGoogleDetailsModal}
          transparent
          animationType="slide"
          onRequestClose={() => {}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Complete Details</Text>
              <Text style={styles.modalSubtitle}>
                Please provide your Date of Birth and select Mr or Mrs to continue.
              </Text>

              {/* Google Date of Birth */}
              <Text style={styles.label}>{(t as any)('dateOfBirth') || 'Date of Birth'} *</Text>
              <View style={styles.dobRow}>
                <TextInput
                  style={[styles.inputField, styles.dobInput]}
                  value={googleDobText}
                  onChangeText={value => {
                    const masked = maskDob(value);
                    setGoogleDobText(masked);
                    const parsed = parseDob(masked);
                    if (parsed) {
                      setGoogleDobIso(parsed);
                    }
                  }}
                  placeholder={(t as any)('dobFormatPlaceholder') || 'DD-MM-YYYY'}
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.dobButton}
                  onPress={() => setShowGoogleDobPicker(true)}>
                  <Text style={styles.dobButtonText}>📅</Text>
                </TouchableOpacity>
              </View>
              <DatePickerModal
                visible={showGoogleDobPicker}
                value={(() => {
                  const picked = parseDob(googleDobText) || googleDobIso;
                  return picked
                    ? new Date(
                        Number(picked.slice(0, 4)),
                        Number(picked.slice(5, 7)) - 1,
                        Number(picked.slice(8, 10)),
                      )
                    : new Date(1995, 0, 1);
                })()}
                maximumDate={new Date()}
                onCancel={() => setShowGoogleDobPicker(false)}
                onConfirm={selected => {
                  const month = String(selected.getMonth() + 1).padStart(2, '0');
                  const day = String(selected.getDate()).padStart(2, '0');
                  const iso = `${selected.getFullYear()}-${month}-${day}`;
                  setGoogleDobIso(iso);
                  setGoogleDobText(formatDobDisplay(iso));
                  setShowGoogleDobPicker(false);
                }}
              />

              {/* Google Mr or Mrs */}
              <Text style={styles.label}>Mr or Mrs *</Text>
              <View style={styles.titleRow}>
                <TouchableOpacity
                  style={[
                    styles.titleBtn,
                    googleTitle === 'Mr' && styles.titleBtnActive,
                  ]}
                  onPress={() => setGoogleTitle('Mr')}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.titleBtnText,
                      googleTitle === 'Mr' && styles.titleBtnTextActive,
                    ]}>
                    Mr
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.titleBtn,
                    googleTitle === 'Mrs' && styles.titleBtnActive,
                  ]}
                  onPress={() => setGoogleTitle('Mrs')}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.titleBtnText,
                      googleTitle === 'Mrs' && styles.titleBtnTextActive,
                    ]}>
                    Mrs
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{marginTop: 20}}>
                {googleSaving ? (
                  <ActivityIndicator color={Colors.templeGold} size="large" />
                ) : (
                  <PrimaryButton
                    title="CONTINUE TO HOME"
                    onPress={submitGoogleDetails}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title={t('continueWithProvider', {provider: providerLabel})}
      showBack>
      <Text style={styles.title}>
        {t('continueWithProvider', {provider: providerLabel})}
      </Text>
      <Text style={styles.copy}>
        {t('providerAuthLaterHelper', {provider: providerLabel})}
      </Text>
      <PrimaryButton
        title={t('tryGoogleInstead')}
        onPress={() => navigation.replace('SocialAuth', {provider: 'Google'})}
      />
      <View style={styles.gap} />
      <OutlineButton
        title={t('createAccountBtn')}
        onPress={() => navigation.navigate('CreateAccount')}
      />
      <View style={styles.gap} />
      <OutlineButton
        title={t('signInWithEmailPassword')}
        onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
      />
            {/* Google Details Modal (Date of Birth and Mr / Mrs) */}
        <Modal
          visible={showGoogleDetailsModal}
          transparent
          animationType="slide"
          onRequestClose={() => {}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Complete Details</Text>
              <Text style={styles.modalSubtitle}>
                Please provide your Date of Birth and select Mr or Mrs to continue.
              </Text>

              {/* Google Date of Birth */}
              <Text style={styles.label}>{(t as any)('dateOfBirth') || 'Date of Birth'} *</Text>
              <View style={styles.dobRow}>
                <TextInput
                  style={[styles.inputField, styles.dobInput]}
                  value={googleDobText}
                  onChangeText={value => {
                    const masked = maskDob(value);
                    setGoogleDobText(masked);
                    const parsed = parseDob(masked);
                    if (parsed) {
                      setGoogleDobIso(parsed);
                    }
                  }}
                  placeholder={(t as any)('dobFormatPlaceholder') || 'DD-MM-YYYY'}
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.dobButton}
                  onPress={() => setShowGoogleDobPicker(true)}>
                  <Text style={styles.dobButtonText}>📅</Text>
                </TouchableOpacity>
              </View>
              <DatePickerModal
                visible={showGoogleDobPicker}
                value={(() => {
                  const picked = parseDob(googleDobText) || googleDobIso;
                  return picked
                    ? new Date(
                        Number(picked.slice(0, 4)),
                        Number(picked.slice(5, 7)) - 1,
                        Number(picked.slice(8, 10)),
                      )
                    : new Date(1995, 0, 1);
                })()}
                maximumDate={new Date()}
                onCancel={() => setShowGoogleDobPicker(false)}
                onConfirm={selected => {
                  const month = String(selected.getMonth() + 1).padStart(2, '0');
                  const day = String(selected.getDate()).padStart(2, '0');
                  const iso = `${selected.getFullYear()}-${month}-${day}`;
                  setGoogleDobIso(iso);
                  setGoogleDobText(formatDobDisplay(iso));
                  setShowGoogleDobPicker(false);
                }}
              />

              {/* Google Mr or Mrs */}
              <Text style={styles.label}>Mr or Mrs *</Text>
              <View style={styles.titleRow}>
                <TouchableOpacity
                  style={[
                    styles.titleBtn,
                    googleTitle === 'Mr' && styles.titleBtnActive,
                  ]}
                  onPress={() => setGoogleTitle('Mr')}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.titleBtnText,
                      googleTitle === 'Mr' && styles.titleBtnTextActive,
                    ]}>
                    Mr
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.titleBtn,
                    googleTitle === 'Mrs' && styles.titleBtnActive,
                  ]}
                  onPress={() => setGoogleTitle('Mrs')}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.titleBtnText,
                      googleTitle === 'Mrs' && styles.titleBtnTextActive,
                    ]}>
                    Mrs
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{marginTop: 20}}>
                {googleSaving ? (
                  <ActivityIndicator color={Colors.templeGold} size="large" />
                ) : (
                  <PrimaryButton
                    title="CONTINUE TO HOME"
                    onPress={submitGoogleDetails}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
    </ScreenLayout>
  );
};

export default SocialAuthScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  copy: {
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  gap: {height: 12},
  loadingBox: {
    backgroundColor: Colors.cream,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  loadingTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  dobRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  inputField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dobInput: {
    flex: 1,
    marginBottom: 0,
  },
  dobButton: {
    width: 52,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobButtonText: {
    fontSize: 20,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  titleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBtnActive: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  titleBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  titleBtnTextActive: {
    color: Colors.white,
  },

});
