import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import ProfileApi from '../auth/services/profileApi';
import {
  loadSavedAddresses,
  saveDeliveryAddress,
  setLatestSelectedAddress,
  updateDeliveryAddress,
} from '../../services/savedAddresses';
import {parseDeliveryAddress} from '../../utils/deliveryAddress';

const AddAddressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const returnTo = route.params?.returnTo;
  const routeEditAddress = String(route.params?.editAddress || '').trim();
  const scrollRef = useRef<ScrollView>(null);

  const [flatStreet, setFlatStreet] = useState('');
  const [area, setArea] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [editingOriginal, setEditingOriginal] = useState<string | null>(null);

  const [detectingPin, setDetectingPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedList, setSavedList] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const clearForm = () => {
    setFlatStreet('');
    setArea('');
    setPinCode('');
    setCity('');
    setStateName('');
    setEditingOriginal(null);
  };

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const addresses = await loadSavedAddresses();
      setSavedList(addresses);
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, []);

  const startEdit = useCallback(
    async (addr: string) => {
      const parsed = parseDeliveryAddress(addr);
      setEditingOriginal(addr);
      setFlatStreet(parsed.street || addr);
      setArea('');
      setPinCode(parsed.pinCode || '');
      setCity(parsed.city || '');
      setStateName(parsed.state || '');
      scrollRef.current?.scrollTo({y: 0, animated: true});

      if (parsed.pinCode.length === 6 && (!parsed.city || !parsed.state)) {
        setDetectingPin(true);
        try {
          const found = await ProfileApi.lookupPin(parsed.pinCode);
          if (found?.cityName) {
            setCity(String(found.cityName));
          }
          if (found?.stateName) {
            setStateName(String(found.stateName));
          }
        } catch {
          // User can correct PIN.
        } finally {
          setDetectingPin(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (routeEditAddress) {
      startEdit(routeEditAddress);
    }
  }, [routeEditAddress, startEdit]);

  const onPinChange = async (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setPinCode(digits);
    if (digits.length !== 6) {
      setCity('');
      setStateName('');
      return;
    }
    setDetectingPin(true);
    try {
      const found = await ProfileApi.lookupPin(digits);
      if (found?.cityName) {
        setCity(String(found.cityName));
      }
      if (found?.stateName) {
        setStateName(String(found.stateName));
      }
      if (!found?.cityName || !found?.stateName) {
        setCity('');
        setStateName('');
        Alert.alert(t('pinCode') || 'PIN Code', t('pinNotFound'));
      }
    } catch {
      setCity('');
      setStateName('');
      Alert.alert(t('pinCode') || 'PIN Code', t('pinNotFound'));
    } finally {
      setDetectingPin(false);
    }
  };

  const handleSave = async () => {
    const streetClean = flatStreet.trim();
    if (!streetClean) {
      Alert.alert(
        t('address') || 'Address',
        t('flatDoorStreetAreaNote') ||
          'Please enter flat no, door no, street and area name',
      );
      return;
    }

    const pinClean = pinCode.replace(/\D/g, '');
    if (!pinClean || pinClean.length !== 6) {
      Alert.alert(
        t('pinCode') || 'PIN Code',
        t('pinCodeMandatory') || 'PIN code is mandatory (6 digits)',
      );
      return;
    }

    if (!city.trim()) {
      Alert.alert(
        t('city') || 'City',
        t('pinNotFound') || 'Could not find that PIN code. Check it and try again.',
      );
      return;
    }

    if (!stateName.trim()) {
      Alert.alert(
        t('state') || 'State',
        t('pinNotFound') || 'Could not find that PIN code. Check it and try again.',
      );
      return;
    }

    setSaving(true);
    try {
      const parts = [
        streetClean,
        area.trim(),
        city.trim(),
        stateName.trim(),
        pinClean,
      ].filter(Boolean);
      const fullAddress = parts.join(', ');

      if (editingOriginal) {
        const nextList = await updateDeliveryAddress(editingOriginal, fullAddress);
        setSavedList(nextList);
        await setLatestSelectedAddress(fullAddress);
        if (returnTo) {
          navigation.navigate(returnTo, {selectedAddress: fullAddress});
        } else {
          Alert.alert(
            t('addressSavedSuccess') || 'Address saved successfully',
            fullAddress,
            [{text: 'OK', onPress: clearForm}],
          );
        }
      } else {
        await saveDeliveryAddress(fullAddress);
        await setLatestSelectedAddress(fullAddress);

        if (returnTo) {
          navigation.navigate(returnTo, {selectedAddress: fullAddress});
        } else {
          Alert.alert(
            t('addressSavedSuccess') || 'Address saved successfully',
            fullAddress,
            [{text: 'OK', onPress: () => {
              clearForm();
              loadList();
            }}],
          );
        }
      }
    } catch {
      Alert.alert('Save Failed', 'Could not save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(editingOriginal);

  return (
    <ScreenLayout
      title={
        isEditing
          ? t('edit') || 'Edit'
          : t('addNewAddress') || 'Add New Address'
      }
      showBack
      tab="Profile">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={styles.keyboardWrap}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>
            {isEditing
              ? `${t('edit') || 'Edit'} ${t('address') || 'Address'}`
              : t('addNewAddress') || 'Add New Address'}
          </Text>
          <Text style={styles.subHeading}>
            {t('addressDetailedHint') ||
              'Please ensure to enter Door No., Flat No., Street and Area name.'}
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>
              {t('houseFlatDoorStreet') || 'Flat / Door / House No. & Street'}
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={flatStreet}
              onChangeText={setFlatStreet}
              placeholder="e.g. Flat 205, Varma Apartments, 4th Main Road"
              placeholderTextColor={Colors.placeholder}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.redNote}>
              {t('flatDoorStreetAreaNote') ||
                'Note: Please enter flat no, door no, street and area name'}
            </Text>

            <Text style={styles.fieldLabel}>
              {t('areaLandmark') || 'Area / Landmark / Colony'}
            </Text>
            <TextInput
              style={styles.input}
              value={area}
              onChangeText={setArea}
              placeholder="e.g. Near Cosmopolitan Club, Gandhi Nagar"
              placeholderTextColor={Colors.placeholder}
            />

            <View style={styles.pinLabelRow}>
              <Text style={styles.fieldLabel}>
                {t('pinCode') || 'PIN Code'} *
              </Text>
              {detectingPin ? (
                <View style={styles.detectingRow}>
                  <ActivityIndicator size="small" color={Colors.leafGreen} />
                  <Text style={styles.detectingText}>
                    {t('pinCodeAutoDetect') || 'Auto-fetching...'}
                  </Text>
                </View>
              ) : null}
            </View>
            <TextInput
              style={styles.input}
              value={pinCode}
              onChangeText={onPinChange}
              placeholder="e.g. 534202"
              placeholderTextColor={Colors.placeholder}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text style={styles.fieldLabel}>{t('city') || 'City'}</Text>
            <TextInput
              style={[styles.input, styles.readonlyInput]}
              value={city}
              editable={false}
              placeholder={t('pinCodeAutoDetect') || 'Auto-fetching from PIN...'}
              placeholderTextColor={Colors.placeholder}
            />

            <Text style={styles.fieldLabel}>{t('state') || 'State'}</Text>
            <TextInput
              style={[styles.input, styles.readonlyInput]}
              value={stateName}
              editable={false}
              placeholder={t('pinCodeAutoDetect') || 'Auto-fetching from PIN...'}
              placeholderTextColor={Colors.placeholder}
            />

            <View style={styles.btnWrap}>
              <PrimaryButton
                title={
                  saving
                    ? 'SAVING...'
                    : isEditing
                      ? 'UPDATE ADDRESS'
                      : 'SAVE ADDRESS'
                }
                rawTitle
                onPress={handleSave}
                disabled={saving}
              />
              {isEditing ? (
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={clearForm}
                  disabled={saving}>
                  <Text style={styles.cancelEditText}>
                    {t('cancel') || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {!returnTo ? (
            <View style={styles.listCard}>
              <Text style={styles.listTitle}>
                {t('savedAddresses') || 'Saved Addresses'}
              </Text>
              {loadingList ? (
                <ActivityIndicator
                  color={Colors.templeGold}
                  style={styles.loader}
                />
              ) : savedList.length === 0 ? (
                <Text style={styles.emptyListText}>
                  {t('noSavedAddressesFound') ||
                    'No saved addresses found. Please add a new address.'}
                </Text>
              ) : (
                savedList.map((addr, idx) => {
                  const selected = editingOriginal === addr;
                  return (
                    <View
                      key={`${addr}-${idx}`}
                      style={[
                        styles.savedItem,
                        selected ? styles.savedItemEditing : null,
                      ]}>
                      <Text style={styles.savedItemIcon}>📍</Text>
                      <Text style={styles.savedItemText}>{addr}</Text>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => startEdit(addr)}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Text style={styles.editBtnText}>
                          {t('edit') || 'Edit'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

export default AddAddressScreen;

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 6,
    marginTop: 10,
  },
  pinLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  detectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detectingText: {
    fontSize: 12,
    color: Colors.leafGreen,
    fontWeight: '700',
    marginLeft: 6,
  },
  input: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  readonlyInput: {
    backgroundColor: '#F7F5F2',
    color: Colors.textSecondary,
  },
  redNote: {
    color: Colors.error,
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  btnWrap: {
    marginTop: 22,
  },
  cancelEditBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelEditText: {
    color: Colors.templeGold,
    fontWeight: '700',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 16,
  },
  emptyListText: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    paddingVertical: 12,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8DEC8',
  },
  savedItemEditing: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#F3Faf4',
  },
  savedItemIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  savedItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  editBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.leafGreen,
  },
  editBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
});
