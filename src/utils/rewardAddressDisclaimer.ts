import {Alert} from 'react-native';

export const REWARD_ADDRESS_DISCLAIMER_BODY_EN =
  'If the Trust has found that the address is not fully and clearly mentioned, the Trust will refrain from sending the rewards / orders.  No communication with the devotee will be taken up personally to make the address correct keeping in view of the voluminous out flows.  It is the whole responsibility of the devotee to send clear and detail address';

/** One-time disclaimer before continuing/submitting a reward or order delivery. */
export const promptRewardAddressDisclaimer = (
  t: (key: any, vars?: any) => string,
  onContinue: () => void,
) => {
  Alert.alert(
    t('rewardAddressDisclaimerTitle') || 'Disclaimer',
    t('rewardAddressDisclaimerBody') || REWARD_ADDRESS_DISCLAIMER_BODY_EN,
    [
      {
        text: t('ok') || 'OK',
        onPress: onContinue,
      },
    ],
    {cancelable: false},
  );
};
