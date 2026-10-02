export type RootStackParamList = {
  Splash: undefined;
  LanguageSelect: {fromSettings?: boolean} | undefined;
  Login: {forceLoginForm?: boolean} | undefined;
  OtpScreen: {
    phoneNumber: string;
    confirmation?: unknown;
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    sentTo?: string;
  };
  WelcomeGift: undefined;
  CompleteProfile: {
    phoneNumber?: string;
    email?: string;
    mobileCountryCode?: string;
    mobileNumber?: string;
  };
  Home: undefined;
  JapaHub: undefined;
  SevaHub: undefined;
  Chant:
    | {
        mode?: 'community' | 'private';
        mantraId?: number;
        goal?: number;
        challengeId?: number;
        privateMantra?: string;
        personalMantraId?: number;
        japaGoalId?: number;
        durationMs?: number;
        resume?: boolean;
        initialCount?: number;
        challengeMantra?: string;
        fromHome?: boolean;
        recentOnly?: boolean;
      }
    | undefined;
  Challenges: undefined;
  FamilyJapa: undefined;
  Donate: undefined;
  Festivals: undefined;
  Progress: undefined;
  Profile: undefined;
  PersonalDetails: {profile?: any} | undefined;
  SpiritualDetails: {profile?: any} | undefined;
  Settings: undefined;
  AvailableRewards: undefined;
  Rewards: undefined;
  BanaLingam: undefined;
  NithyaHomam: undefined;
  Orders: undefined;
  OrderDetails: {order?: any} | undefined;
  CustomerCare: undefined;
  Faq: undefined;
  Notifications: undefined;
  Feedback: undefined;
  PrivacyPolicy: undefined;
};
