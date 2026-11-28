import React from 'react';

import {useLanguage} from '../../i18n/LanguageContext';
import MobileWithCountryField from '../auth/components/MobileWithCountryField';
import {
  AlternatePhoneValue,
} from '../../utils/alternatePhone';
import {digitsOnly, MOBILE_DIGITS} from '../../utils/validators';

type Props = {
  value: AlternatePhoneValue;
  onChange: (value: AlternatePhoneValue) => void;
};

/**
 * Optional "Alternative phone number" with a country picker (India by default).
 * Leaving it empty is always allowed.
 */
const AlternatePhoneField = ({value, onChange}: Props) => {
  const {t} = useLanguage();
  return (
    <MobileWithCountryField
      label={`${t('alternatePhoneLabel')} (${t('optional')})`}
      country={value.country}
      mobile={value.mobile}
      onCountryChange={country => {
        const code = country.callingCode.replace(/\D/g, '') || '91';
        onChange({
          country,
          mobile:
            code === '91'
              ? digitsOnly(value.mobile).slice(-MOBILE_DIGITS)
              : value.mobile,
        });
      }}
      onMobileChange={mobile => onChange({...value, mobile})}
    />
  );
};

export default AlternatePhoneField;
