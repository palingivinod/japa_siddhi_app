import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {navigationRef} from './navigationRef';
import {withAuth} from '../modules/common/AuthGate';

import SplashScreen from '../modules/auth/SplashScreen';
import LanguageSelectScreen from '../modules/auth/LanguageSelectScreen';
import LoginScreen from '../modules/auth/LoginScreen';
import OtpScreen from '../modules/auth/OtpScreen';
import SocialAuthScreen from '../modules/auth/SocialAuthScreen';
import SignupPersonalScreen from '../modules/auth/SignupPersonalScreen';
import SignupSpiritualScreen from '../modules/auth/SignupSpiritualScreen';
import SignupPhotoScreen from '../modules/auth/SignupPhotoScreen';
import RegistrationCompleteScreen from '../modules/auth/RegistrationCompleteScreen';
import CompleteProfileScreen from '../modules/auth/CompleteProfileScreen';
import HomeScreen from '../modules/home/screens/HomeScreen';
import JapaHubScreen from '../modules/japa/JapaHubScreen';
import CommunityJapaScreen from '../modules/japa/CommunityJapaScreen';
import MantraSelectScreen from '../modules/japa/MantraSelectScreen';
import GoalSelectScreen from '../modules/japa/GoalSelectScreen';
import ReferenceChantScreen from '../modules/japa/ReferenceChantScreen';
import JapaPausedScreen from '../modules/japa/JapaPausedScreen';
import JapaProgressScreen from '../modules/japa/JapaProgressScreen';
import PrivateJapaScreen from '../modules/japa/PrivateJapaScreen';
import SevaHubScreen from '../modules/seva/SevaHubScreen';
import ChantScreen from '../modules/chant/ChantScreen';
import ChallengesScreen from '../modules/challenges/ChallengesScreen';
import ChallengeDetailsScreen from '../modules/challenges/ChallengeDetailsScreen';
import FamilyJapaScreen from '../modules/family/FamilyJapaScreen';
import DonateScreen from '../modules/donate/DonateScreen';
import FestivalsScreen from '../modules/festivals/FestivalsScreen';
import ProgressScreen from '../modules/progress/ProgressScreen';
import ProfileViewScreen from '../modules/profile/ProfileViewScreen';
import PersonalDetailsScreen from '../modules/profile/PersonalDetailsScreen';
import SpiritualDetailsScreen from '../modules/profile/SpiritualDetailsScreen';
import SettingsScreen from '../modules/profile/SettingsScreen';
import BanaLingamScreen from '../modules/banaLingam/BanaLingamScreen';
import NithyaHomamScreen from '../modules/homam/NithyaHomamScreen';
import OrdersScreen from '../modules/orders/OrdersScreen';
import OrderDetailsScreen from '../modules/orders/OrderDetailsScreen';
import CustomerCareScreen from '../modules/customerCare/CustomerCareScreen';
import FaqScreen from '../modules/customerCare/FaqScreen';
import NotificationsScreen from '../modules/notifications/NotificationsScreen';
import FeedbackScreen from '../modules/feedback/FeedbackScreen';
import PrivacyPolicyScreen from '../modules/legal/PrivacyPolicyScreen';

export type RootStackParamList = {
  Splash: undefined;
  LanguageSelect: {fromSettings?: boolean} | undefined;
  Login: undefined;
  SocialAuth: {provider?: string} | undefined;
  OtpScreen: {
    phoneNumber: string;
    confirmation?: unknown;
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    sentTo?: string;
  };
  SignupPersonal: any;
  SignupSpiritual: any;
  SignupPhoto: any;
  RegistrationComplete: undefined;
  CompleteProfile: {
    phoneNumber?: string;
    email?: string;
    mobileCountryCode?: string;
    mobileNumber?: string;
  };
  Home: undefined;
  JapaHub: undefined;
  CommunityJapa: undefined;
  MantraSelect: {mode?: string; mantraId?: number} | undefined;
  GoalSelect: {mode?: string; mantraId?: number; goal?: number} | undefined;
  ReferenceChant: {mode?: string; mantraId?: number; goal?: number} | undefined;
  JapaPaused: {count?: number; goal?: number} | undefined;
  JapaProgress: {count?: number; goal?: number} | undefined;
  PrivateJapa: undefined;
  SevaHub: undefined;
  Chant: {mode?: 'community' | 'private'; mantraId?: number; goal?: number} | undefined;
  Challenges: undefined;
  ChallengeDetails: {id?: number} | undefined;
  FamilyJapa: undefined;
  Donate: undefined;
  Festivals: undefined;
  Progress: undefined;
  Profile: undefined;
  PersonalDetails: {profile?: any} | undefined;
  SpiritualDetails: {profile?: any} | undefined;
  Settings: undefined;
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

const Stack = createNativeStackNavigator<RootStackParamList>();

const ProtectedHome = withAuth(HomeScreen);
const ProtectedJapaHub = withAuth(JapaHubScreen);
const ProtectedCommunity = withAuth(CommunityJapaScreen);
const ProtectedMantra = withAuth(MantraSelectScreen);
const ProtectedGoal = withAuth(GoalSelectScreen);
const ProtectedReference = withAuth(ReferenceChantScreen);
const ProtectedPaused = withAuth(JapaPausedScreen);
const ProtectedJapaProgress = withAuth(JapaProgressScreen);
const ProtectedPrivate = withAuth(PrivateJapaScreen);
const ProtectedSevaHub = withAuth(SevaHubScreen);
const ProtectedChant = withAuth(ChantScreen);
const ProtectedChallenges = withAuth(ChallengesScreen);
const ProtectedChallengeDetails = withAuth(ChallengeDetailsScreen);
const ProtectedFamily = withAuth(FamilyJapaScreen);
const ProtectedDonate = withAuth(DonateScreen);
const ProtectedFestivals = withAuth(FestivalsScreen);
const ProtectedProgress = withAuth(ProgressScreen);
const ProtectedProfile = withAuth(ProfileViewScreen);
const ProtectedPersonal = withAuth(PersonalDetailsScreen);
const ProtectedSpiritual = withAuth(SpiritualDetailsScreen);
const ProtectedSettings = withAuth(SettingsScreen);
const ProtectedBanaLingam = withAuth(BanaLingamScreen);
const ProtectedHomam = withAuth(NithyaHomamScreen);
const ProtectedOrders = withAuth(OrdersScreen);
const ProtectedOrderDetails = withAuth(OrderDetailsScreen);
const ProtectedCare = withAuth(CustomerCareScreen);
const ProtectedFaq = withAuth(FaqScreen);
const ProtectedNotifications = withAuth(NotificationsScreen);
const ProtectedFeedback = withAuth(FeedbackScreen);

const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SocialAuth" component={SocialAuthScreen} />
        <Stack.Screen name="OtpScreen" component={OtpScreen} />
        <Stack.Screen name="SignupPersonal" component={SignupPersonalScreen} />
        <Stack.Screen name="SignupSpiritual" component={SignupSpiritualScreen} />
        <Stack.Screen name="SignupPhoto" component={SignupPhotoScreen} />
        <Stack.Screen
          name="RegistrationComplete"
          component={RegistrationCompleteScreen}
        />
        <Stack.Screen
          name="CompleteProfile"
          component={CompleteProfileScreen}
        />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Home" component={ProtectedHome} />
        <Stack.Screen name="JapaHub" component={ProtectedJapaHub} />
        <Stack.Screen name="CommunityJapa" component={ProtectedCommunity} />
        <Stack.Screen name="MantraSelect" component={ProtectedMantra} />
        <Stack.Screen name="GoalSelect" component={ProtectedGoal} />
        <Stack.Screen name="ReferenceChant" component={ProtectedReference} />
        <Stack.Screen name="JapaPaused" component={ProtectedPaused} />
        <Stack.Screen name="JapaProgress" component={ProtectedJapaProgress} />
        <Stack.Screen name="PrivateJapa" component={ProtectedPrivate} />
        <Stack.Screen name="SevaHub" component={ProtectedSevaHub} />
        <Stack.Screen name="Chant" component={ProtectedChant} />
        <Stack.Screen name="Challenges" component={ProtectedChallenges} />
        <Stack.Screen
          name="ChallengeDetails"
          component={ProtectedChallengeDetails}
        />
        <Stack.Screen name="FamilyJapa" component={ProtectedFamily} />
        <Stack.Screen name="Donate" component={ProtectedDonate} />
        <Stack.Screen name="Festivals" component={ProtectedFestivals} />
        <Stack.Screen name="Progress" component={ProtectedProgress} />
        <Stack.Screen name="Profile" component={ProtectedProfile} />
        <Stack.Screen name="PersonalDetails" component={ProtectedPersonal} />
        <Stack.Screen name="SpiritualDetails" component={ProtectedSpiritual} />
        <Stack.Screen name="Settings" component={ProtectedSettings} />
        <Stack.Screen name="BanaLingam" component={ProtectedBanaLingam} />
        <Stack.Screen name="NithyaHomam" component={ProtectedHomam} />
        <Stack.Screen name="Orders" component={ProtectedOrders} />
        <Stack.Screen name="OrderDetails" component={ProtectedOrderDetails} />
        <Stack.Screen name="CustomerCare" component={ProtectedCare} />
        <Stack.Screen name="Faq" component={ProtectedFaq} />
        <Stack.Screen name="Notifications" component={ProtectedNotifications} />
        <Stack.Screen name="Feedback" component={ProtectedFeedback} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
