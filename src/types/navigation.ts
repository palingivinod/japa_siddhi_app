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
  YourJapas: undefined;
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
        dailyTarget?: number;
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
  Notifications: {highlightId?: string | number} | undefined;
  Feedback: undefined;
  PrivacyPolicy: undefined;
  TransactionHistory: undefined;
  AdminSeva: undefined;
  AdminSevaDetailList:
    | {
        type?: 'ANNADANAM' | 'NITHYA_HOMAM';
        title?: string;
      }
    | undefined;
  GeneralAnnadanam: undefined;
  PaymentConfirmation: any;
  MilestoneNotifications: undefined;
  ChallengeDetails: {id?: number} | undefined;
  ChallengeRewardSelect: {id?: number} | undefined;
  MantraSelect: any;
  AdminMeeting: undefined;
};
