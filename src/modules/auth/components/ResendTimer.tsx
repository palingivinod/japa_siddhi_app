import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

import Colors from '../../../theme/colors';
import {useLanguage} from '../../../i18n/LanguageContext';

interface Props {
  seconds?: number;
  onResend: () => void;
}

const ResendTimer: React.FC<Props> = ({
  seconds = 30,
  onResend,
}) => {

  const {t} = useLanguage();
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {

    if (timeLeft === 0) {
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    },1000);

    return () => clearTimeout(timer);

  },[timeLeft]);

  const resend = () => {

    setTimeLeft(seconds);

    onResend();

  };

  if(timeLeft>0){

    return(

      <Text style={styles.timer}>
        {t('resendOtpIn', {seconds: String(timeLeft).padStart(2, '0')})}
      </Text>

    );

  }

  return(

    <TouchableOpacity onPress={resend}>

      <Text style={styles.resend}>
        {t('resendOtp')}
      </Text>

    </TouchableOpacity>

  );

};

export default ResendTimer;

const styles=StyleSheet.create({

timer:{
    marginTop:25,
    textAlign:'center',
    color:Colors.leafGreen,
    fontSize:15,
},

resend:{
    marginTop:25,
    textAlign:'center',
    color:Colors.primary,
    fontSize:16,
    fontWeight:'700',
}

});