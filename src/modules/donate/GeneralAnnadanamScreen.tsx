import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Clipboard,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SelectField from '../common/SelectField';
import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';
import {startAppPayment} from '../payments/startAppPayment';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const GeneralAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [occasion, setOccasion] = useState('');
  const [forWhom, setForWhom] = useState('');
  const [personName, setPersonName] = useState('');
  const [gender, setGender] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [preferDate, setPreferDate] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [comments, setComments] = useState('');
  const [persons, setPersons] = useState(0);
  const [enabled, setEnabled] = useState(true);

  const totalAmount = persons * RATE_PER_PERSON;
  const cleanMobileReady = mobile.replace(/\D/g, '');
  const genderKey = gender.trim().toLowerCase();
  const anniversaryRelation =
    genderKey === 'female' ? 'Husband' : genderKey === 'male' ? 'Wife' : '';
  const needsPersonName = forWhom.length > 0 && forWhom !== 'Self' && occasion !== 'Anniversary';
  const personReady =
    occasion === 'Anniversary'
      ? anniversaryRelation.length > 0 && spouseName.trim().length >= 2
      : forWhom === 'Self' || (needsPersonName && personName.trim().length >= 2);
  const detailsReady =
    fullName.trim().length >= 2 &&
    isMobile(cleanMobileReady) &&
    !/^0+$/.test(cleanMobileReady) &&
    occasion.length > 0 &&
    forWhom.length > 0 &&
    personReady &&
    /^\d{4}-\d{2}-\d{2}$/.test(preferDate) &&
    persons > 0;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        try {
          const [stored, profile] = await Promise.all([
            getStoredUser(),
            ProfileApi.getProfile().catch(() => null),
          ]);
          if (!active) return;
          const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
          const phone = profile?.mobileNumber || stored?.mobileNumber || stored?.mobile_number || stored?.phone || '';

          setFullName(current => current || String(name));
          setMobile(current => current || digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
          setGender(String(profile?.gender || stored?.gender || ''));
          setSpouseName(String(profile?.spouseName || stored?.spouseName || stored?.spouse_name || ''));
        } catch {
          // ignore profile load error
        }
      };

      loadProfile();
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    if (occasion !== 'Anniversary') {
      return;
    }
    setForWhom(anniversaryRelation);
    setPersonName(spouseName.trim());
  }, [occasion, anniversaryRelation, spouseName]);

  useEffect(() => {
    apiService
      .get('/annadanam/visibility')
      .then(response => setEnabled(response.data?.data?.general !== false))
      .catch(() => setEnabled(true));
  }, []);

  const continuePay = async () => {
    if (fullName.trim().length < 2) {
      Alert.alert(t('validationTitle'), t('enterDevoteeName'));
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!isMobile(cleanMobile) || /^0+$/.test(cleanMobile)) {
      Alert.alert(
        t('validationTitle'),
        t('enterValidMobileDigits', {digits: String(MOBILE_DIGITS)}),
      );
      return;
    }
    if (!occasion) {
      Alert.alert(t('validationTitle'), t('selectOccasion'));
      return;
    }
    if (occasion === 'Anniversary') {
      if (!anniversaryRelation || spouseName.trim().length < 2) {
        Alert.alert(t('validationTitle'), t('addSpouseInProfile'));
        return;
      }
    } else if (!forWhom) {
      Alert.alert(t('validationTitle'), t('selectForWhom'));
      return;
    } else if (forWhom !== 'Self' && personName.trim().length < 2) {
      Alert.alert(t('validationTitle'), t('enterPersonName'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferDate)) {
      Alert.alert(t('validationTitle'), t('selectPreferDate'));
      return;
    }
    if (persons <= 0) {
      Alert.alert(t('validationTitle'), t('enterPersonsCount'));
      return;
    }

    await startAppPayment({
      amount: totalAmount,
      purpose: occasion,
      occasion,
      preferDate,
      forWhom: occasion === 'Anniversary' ? anniversaryRelation : forWhom,
      personName:
        (occasion === 'Anniversary'
          ? spouseName
          : forWhom === 'Self'
            ? fullName
            : personName
        ).trim(),
      seva: 'Annadanam',
      name: fullName.trim(),
      phone: cleanMobile,
      comments: comments.trim(),
    });
  };

  const onShareForm = async () => {
    const appUrl = 'https://japasiddhi.onrender.com/annasantharpana';
    const deepLink = 'japasiddhi://annasantharpana';
    const message = `${t('generalAnnadanam')} - Japa Siddhi\n\nOffer Anna Santharpana for your special occasions & receive divine blessings.\n\nOpen Form in App:\n${appUrl}\n\nDirect App Link: ${deepLink}`;
    try {
      await Share.share({
        message,
        url: appUrl,
        title: t('generalAnnadanam') || 'General Anna Santharpana',
      });
    } catch {
      Clipboard.setString(appUrl);
      Alert.alert(
        t('shareFormLink') || 'Share Form Link',
        t('formLinkCopied') || 'Form link copied to clipboard!',
      );
    }
  };

  const onCopyLink = () => {
    const appUrl = 'https://japasiddhi.onrender.com/annasantharpana';
    Clipboard.setString(appUrl);
    Alert.alert(
      t('shareFormLink') || 'Share Form Link',
      t('formLinkCopied') || 'Form link copied to clipboard!',
    );
  };

  const occasions = [
    {label: t('occasionBirthday'), value: 'Birthday'},
    {label: t('occasionAnniversary'), value: 'Anniversary'},
    {label: t('occasionJayanthi'), value: 'Jayanthi'},
    {label: t('occasionVardhanti'), value: 'Vardhanti'},
    {label: t('occasionPuja'), value: 'Puja related'},
    {label: t('occasionOthers'), value: 'Others'},
  ];

  return (
    <ScreenLayout title={t('generalAnnadanam')} showBack tab="SevaHub">
      {!enabled ? (
        <Text style={styles.disabled}>
          General Anna Santharpana is currently unavailable.
        </Text>
      ) : (
        <>
          {/* Shareable Form Link Banner */}
          <View style={styles.shareBannerCard}>
            <View style={styles.shareBannerLeft}>
              <Text style={styles.shareBannerTitle}>
                🔗 {t('shareFormLink') || 'Share Form Link'}
              </Text>
              <Text style={styles.shareBannerUrl} numberOfLines={1}>
                https://japasiddhi.onrender.com/annasantharpana
              </Text>
            </View>
            <View style={styles.shareBannerActions}>
              <TouchableOpacity
                style={styles.shareBannerCopyBtn}
                onPress={onCopyLink}
                activeOpacity={0.7}>
                <Text style={styles.shareBannerCopyText}>📋</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareBannerShareBtn}
                onPress={onShareForm}
                activeOpacity={0.8}>
                <Text style={styles.shareBannerShareText}>
                  📤 {t('shareFormLink') ? 'Share' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <FormField
            label={t('nameLabel')}
            placeholder={t('fullName')}
            value={fullName}
            onChangeText={setFullName}
          />
          <FormField
            label={t('mobileNumber')}
            placeholder={t('enterMobileNumber')}
            value={mobile}
            onChangeText={text =>
              setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))
            }
            keyboardType="phone-pad"
            maxLength={MOBILE_DIGITS}
          />
          <Text style={styles.label}>{t('occasionLabel')} *</Text>
          <SelectField
            value={occasion}
            onChange={value => {
              setOccasion(value);
              if (value !== 'Anniversary') {
                setForWhom('');
                setPersonName('');
              }
            }}
            placeholder={t('selectShort')}
            title={t('occasionLabel')}
            options={occasions}
          />
          {occasion === 'Anniversary' ? (
            spouseName.trim().length >= 2 && anniversaryRelation ? (
              <Text style={styles.picked}>
                {t('forWhom')}: {t(anniversaryRelation === 'Wife' ? 'forWhomWife' : 'forWhomHusband')}
                {'\n'}
                {t('personNameLabel')}: {spouseName.trim()}
              </Text>
            ) : (
              <Text style={styles.pickedWarn}>{t('addSpouseInProfile')}</Text>
            )
          ) : occasion ? (
            <>
              <Text style={styles.label}>{t('forWhom')} *</Text>
              <SelectField
                value={forWhom}
                onChange={value => {
                  setForWhom(value);
                  if (value === 'Self') {
                    setPersonName('');
                  }
                }}
                placeholder={t('selectShort')}
                title={t('forWhom')}
                options={[
                  {label: t('forWhomSelf'), value: 'Self'},
                  {label: t('forWhomFather'), value: 'Father'},
                  {label: t('forWhomMother'), value: 'Mother'},
                  {label: t('forWhomChildren'), value: 'Children'},
                  {label: t('forWhomHusband'), value: 'Husband'},
                  {label: t('forWhomWife'), value: 'Wife'},
                  {label: t('forWhomOther'), value: 'Other'},
                ]}
              />
              {needsPersonName ? (
                <FormField
                  label={t('personNameLabel')}
                  placeholder={t('personNameLabel')}
                  value={personName}
                  onChangeText={setPersonName}
                />
              ) : null}
            </>
          ) : null}
          <Text style={styles.label}>{t('preferDate')} *</Text>
          <TouchableOpacity style={styles.dateField} onPress={() => setShowDate(true)}>
            <Text style={preferDate ? styles.dateValue : styles.datePlaceholder}>
              {preferDate || t('selectDate')}
            </Text>
          </TouchableOpacity>
          <DatePickerModal
            visible={showDate}
            value={
              /^\d{4}-\d{2}-\d{2}$/.test(preferDate)
                ? new Date(
                    Number(preferDate.slice(0, 4)),
                    Number(preferDate.slice(5, 7)) - 1,
                    Number(preferDate.slice(8, 10)),
                  )
                : new Date()
            }
            minimumDate={new Date()}
            onCancel={() => setShowDate(false)}
            onConfirm={selected => {
              const month = String(selected.getMonth() + 1).padStart(2, '0');
              const day = String(selected.getDate()).padStart(2, '0');
              setPreferDate(`${selected.getFullYear()}-${month}-${day}`);
              setShowDate(false);
            }}
          />
          <AnnadanamMembersSelector
            persons={persons}
            onChangePersons={setPersons}
            title={t('selectNoOfPersons')}
          />
          <FormField
            label={t('comments')}
            placeholder={t('annadanamCommentsPlaceholder')}
            value={comments}
            onChangeText={setComments}
            maxLength={1000}
            multiline
            numberOfLines={3}
            style={styles.commentsInput}
          />
          <PrimaryButton
            title={
              detailsReady
                ? `CONTINUE TO PAYMENT (₹${totalAmount.toLocaleString('en-IN')})`
                : 'ENTER REQUIRED DETAILS'
            }
            disabled={!detailsReady}
            onPress={continuePay}
          />
        </>
      )}
    </ScreenLayout>
  );
};

export default GeneralAnnadanamScreen;

const styles = StyleSheet.create({
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  dateField: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  dateValue: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  datePlaceholder: {
    color: Colors.placeholder,
    fontSize: 16,
  },
  picked: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
    lineHeight: 22,
  },
  pickedWarn: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.error,
    fontWeight: '700',
    lineHeight: 22,
  },
  disabled: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  commentsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  shareBannerCard: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1.5,
    borderColor: '#E8D2A6',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#56350F',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  shareBannerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  shareBannerTitle: {
    color: Colors.sacredBrown,
    fontSize: 13,
    fontWeight: '800',
  },
  shareBannerUrl: {
    color: '#8C6C42',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  shareBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareBannerCopyBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  shareBannerCopyText: {
    fontSize: 14,
  },
  shareBannerShareBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shareBannerShareText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
});
