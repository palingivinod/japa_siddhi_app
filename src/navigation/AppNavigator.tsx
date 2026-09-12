import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {navigationRef} from './navigationRef';
import {withAuth} from '../modules/common/AuthGate';
import {withAdminAuth} from '../modules/admin/AdminAuthGate';

import SplashScreen from '../modules/auth/SplashScreen';
import LanguageSelectScreen from '../modules/auth/LanguageSelectScreen';
import LoginScreen from '../modules/auth/LoginScreen';
import CreateAccountScreen from '../modules/auth/CreateAccountScreen';
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
import JapaGoalCompleteScreen from '../modules/japa/JapaGoalCompleteScreen';
import PrivateJapaScreen from '../modules/japa/PrivateJapaScreen';
import SevaHubScreen from '../modules/seva/SevaHubScreen';
import ChantScreen from '../modules/chant/ChantScreen';
import ChallengesScreen from '../modules/challenges/ChallengesScreen';
import ChallengeDetailsScreen from '../modules/challenges/ChallengeDetailsScreen';
import ChallengeProgressScreen from '../modules/challenges/ChallengeProgressScreen';
import ChallengeLeaderboardScreen from '../modules/challenges/ChallengeLeaderboardScreen';
import ChallengeMyRankScreen from '../modules/challenges/ChallengeMyRankScreen';
import ChallengeRewardSelectScreen from '../modules/challenges/ChallengeRewardSelectScreen';
import ChallengeRewardConfirmScreen from '../modules/challenges/ChallengeRewardConfirmScreen';
import ChallengeRewardClaimedScreen from '../modules/challenges/ChallengeRewardClaimedScreen';
import ChallengeRewardDeliveryScreen from '../modules/challenges/ChallengeRewardDeliveryScreen';
import ChallengeRewardOrderCreatedScreen from '../modules/challenges/ChallengeRewardOrderCreatedScreen';
import ChallengeRulesScreen from '../modules/challenges/ChallengeRulesScreen';
import RewardTermsScreen from '../modules/challenges/RewardTermsScreen';
import ChallengeCompleteScreen from '../modules/challenges/ChallengeCompleteScreen';
import FamilyJapaScreen from '../modules/family/FamilyJapaScreen';
import DonateScreen from '../modules/donate/DonateScreen';
import JapaAnnadanamScreen from '../modules/donate/JapaAnnadanamScreen';
import MilestoneNotificationsScreen from '../modules/donate/MilestoneNotificationsScreen';
import GeneralAnnadanamScreen from '../modules/donate/GeneralAnnadanamScreen';
import DonationFormScreen from '../modules/donate/DonationFormScreen';
import FestivalsScreen from '../modules/festivals/FestivalsScreen';
import ProgressScreen from '../modules/progress/ProgressScreen';
import AnalyticsHubScreen from '../modules/analytics/AnalyticsHubScreen';
import JapaOverviewScreen from '../modules/analytics/JapaOverviewScreen';
import DailyAnalyticsScreen from '../modules/analytics/DailyAnalyticsScreen';
import WeeklyAnalyticsScreen from '../modules/analytics/WeeklyAnalyticsScreen';
import MonthlyAnalyticsScreen from '../modules/analytics/MonthlyAnalyticsScreen';
import LifetimeAnalyticsScreen from '../modules/analytics/LifetimeAnalyticsScreen';
import GoalAnalyticsScreen from '../modules/analytics/GoalAnalyticsScreen';
import StreakAnalyticsScreen from '../modules/analytics/StreakAnalyticsScreen';
import ProfileViewScreen from '../modules/profile/ProfileViewScreen';
import PersonalDetailsScreen from '../modules/profile/PersonalDetailsScreen';
import SpiritualDetailsScreen from '../modules/profile/SpiritualDetailsScreen';
import SettingsScreen from '../modules/profile/SettingsScreen';
import BanaLingamScreen from '../modules/banaLingam/BanaLingamScreen';
import NithyaHomamScreen from '../modules/homam/NithyaHomamScreen';
import HomamEnrollScreen from '../modules/homam/HomamEnrollScreen';
import HomamConfirmationScreen from '../modules/homam/HomamConfirmationScreen';
import CheckoutScreen from '../modules/payments/CheckoutScreen';
import PaymentConfirmationScreen from '../modules/payments/PaymentConfirmationScreen';
import OrdersScreen from '../modules/orders/OrdersScreen';
import OrderDetailsScreen from '../modules/orders/OrderDetailsScreen';
import OrderTrackingScreen from '../modules/orders/OrderTrackingScreen';
import DeliveryStatusScreen from '../modules/orders/DeliveryStatusScreen';
import CustomerCareScreen from '../modules/customerCare/CustomerCareScreen';
import RaiseTicketScreen from '../modules/customerCare/RaiseTicketScreen';
import WhatsAppSupportScreen from '../modules/customerCare/WhatsAppSupportScreen';
import CallSupportScreen from '../modules/customerCare/CallSupportScreen';
import FaqScreen from '../modules/customerCare/FaqScreen';
import NotificationsScreen from '../modules/notifications/NotificationsScreen';
import FeedbackScreen from '../modules/feedback/FeedbackScreen';
import StarRatingScreen from '../modules/feedback/StarRatingScreen';
import FeedbackConfirmationScreen from '../modules/feedback/FeedbackConfirmationScreen';
import PrivacyPolicyScreen from '../modules/legal/PrivacyPolicyScreen';
import DesignSystemScreen from '../modules/screens/DesignSystemScreen';
import ScreenIndexScreen from '../modules/screens/ScreenIndexScreen';
import BanaLingamReviewScreen from '../modules/banaLingam/BanaLingamReviewScreen';
import DonationConfirmationScreen from '../modules/donate/DonationConfirmationScreen';
import WelcomeGiftScreen from '../modules/auth/WelcomeGiftScreen';
import AdminHubScreen from '../modules/admin/AdminHubScreen';
import AdminLoginScreen from '../modules/admin/AdminLoginScreen';
import AdminForgotPasswordScreen from '../modules/admin/AdminForgotPasswordScreen';
import AdminDashboardScreen from '../modules/admin/AdminDashboardScreen';
import AdminAccountsScreen from '../modules/admin/AdminAccountsScreen';
import AdminUsersScreen from '../modules/admin/AdminUsersScreen';
import AdminUserDetailsScreen from '../modules/admin/AdminUserDetailsScreen';
import AdminUserEditScreen from '../modules/admin/AdminUserEditScreen';
import AdminJapaScreen from '../modules/admin/AdminJapaScreen';
import AdminMantrasScreen from '../modules/admin/AdminMantrasScreen';
import AdminMantraEditScreen from '../modules/admin/AdminMantraEditScreen';
import AdminChallengeCreateScreen from '../modules/admin/AdminChallengeCreateScreen';
import AdminChallengesScreen from '../modules/admin/AdminChallengesScreen';
import AdminRewardsScreen from '../modules/admin/AdminRewardsScreen';
import AdminRewardStockScreen from '../modules/admin/AdminRewardStockScreen';
import AdminNotificationsScreen from '../modules/admin/AdminNotificationsScreen';
import AdminOrdersScreen from '../modules/admin/AdminOrdersScreen';
import AdminOrderDetailsScreen from '../modules/admin/AdminOrderDetailsScreen';
import AdminProductsScreen from '../modules/admin/AdminProductsScreen';
import AdminBannersScreen from '../modules/admin/AdminBannersScreen';
import AdminPaymentsScreen from '../modules/admin/AdminPaymentsScreen';
import AdminAnnadanamScreen from '../modules/admin/AdminAnnadanamScreen';
import AdminBaanalingamScreen from '../modules/admin/AdminBaanalingamScreen';
import AdminNithyaHomamScreen from '../modules/admin/AdminNithyaHomamScreen';
import AdminSupportScreen from '../modules/admin/AdminSupportScreen';
import AdminFeedbackScreen from '../modules/admin/AdminFeedbackScreen';
import AdminAnalyticsDashboardScreen from '../modules/admin/AdminAnalyticsDashboardScreen';
import AdminUserDemographicsScreen from '../modules/admin/AdminUserDemographicsScreen';
import AdminJapaAnalyticsScreen from '../modules/admin/AdminJapaAnalyticsScreen';
import AdminChallengeAnalyticsScreen from '../modules/admin/AdminChallengeAnalyticsScreen';
import AdminDonationAnalyticsScreen from '../modules/admin/AdminDonationAnalyticsScreen';
import AdminFestivalAnalyticsScreen from '../modules/admin/AdminFestivalAnalyticsScreen';
import AdminNotificationAnalyticsScreen from '../modules/admin/AdminNotificationAnalyticsScreen';
import AdminLanguagesScreen from '../modules/admin/AdminLanguagesScreen';
import AdminMultilingualContentScreen from '../modules/admin/AdminMultilingualContentScreen';
import AdminExportReportsScreen from '../modules/admin/AdminExportReportsScreen';
import AdminMoreScreen from '../modules/admin/AdminMoreScreen';

export type RootStackParamList = {
  Splash: undefined;
  LanguageSelect: {fromSettings?: boolean} | undefined;
  Login: {forceLoginForm?: boolean} | undefined;
  CreateAccount: undefined;
  SocialAuth: {provider?: string} | undefined;
  OtpScreen: {
    phoneNumber: string;
    confirmation?: unknown;
    mobileCountryCode?: string;
    mobileNumber?: string;
    email?: string;
    sentTo?: string;
    password?: string;
    mode?: 'register';
  };
  SignupPersonal: any;
  SignupSpiritual: any;
  SignupPhoto: any;
  RegistrationComplete: undefined;
  WelcomeGift: undefined;
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
  GoalSelect: {mode?: string; mantraId?: number; goal?: number; challengeId?: number; privateMantra?: string} | undefined;
  ReferenceChant: {
    mode?: string;
    mantraId?: number;
    goal?: number;
    challengeId?: number;
    initialCount?: number;
    privateMantra?: string;
    challengeMantra?: string;
  } | undefined;
  JapaPaused: {count?: number; goal?: number} | undefined;
  JapaProgress: {count?: number; goal?: number} | undefined;
  JapaGoalComplete:
    | {
        count?: number;
        goal?: number;
        mode?: string;
        mantraId?: number;
        privateMantra?: string;
        japaGoalId?: number;
        userTotal?: number;
      }
    | undefined;
  PrivateJapa: undefined;
  SevaHub: undefined;
  Chant: {
    mode?: 'community' | 'private';
    mantraId?: number;
    goal?: number;
    challengeId?: number;
    privateMantra?: string;
    japaGoalId?: number;
    durationMs?: number;
    resume?: boolean;
    initialCount?: number;
    challengeMantra?: string;
  } | undefined;
  Challenges: undefined;
  ChallengeDetails: {id?: number} | undefined;
  ChallengeRules: undefined;
  RewardTerms: undefined;
  ChallengeProgress: {id?: number} | undefined;
  ChallengeLeaderboard: {id?: number} | undefined;
  ChallengeMyRank:
    | {
        id?: number;
        rank?: number;
        currentValue?: number;
        totalPlayers?: number;
      }
    | undefined;
  ChallengeRewardSelect: {id?: number} | undefined;
  ChallengeRewardConfirm:
    | {id?: number; rewardId?: number; rewardName?: string}
    | undefined;
  ChallengeRewardClaimed:
    | {id?: number; rewardId?: number; rewardName?: string}
    | undefined;
  ChallengeRewardDelivery:
    | {id?: number; rewardName?: string}
    | undefined;
  ChallengeRewardOrderCreated:
    | {
        id?: number;
        rewardName?: string;
        orderId?: number;
        orderNumber?: string;
      }
    | undefined;
  ChallengeComplete:
    | {
        id?: number;
        count?: number;
        goal?: number;
        mode?: string;
        mantraId?: number;
        privateMantra?: string;
      }
    | undefined;
  FamilyJapa: undefined;
  Donate: undefined;
  JapaAnnadanam: undefined;
  MilestoneNotifications: undefined;
  GeneralAnnadanam: undefined;
  DonationForm: any;
  DonationPayment: any;
  Festivals: undefined;
  Progress: undefined;
  AnalyticsHub: undefined;
  JapaOverview: undefined;
  DailyAnalytics: undefined;
  WeeklyAnalytics: undefined;
  MonthlyAnalytics: undefined;
  LifetimeAnalytics: undefined;
  GoalAnalytics: undefined;
  StreakAnalytics: undefined;
  Profile: undefined;
  PersonalDetails: {profile?: any} | undefined;
  SpiritualDetails: {profile?: any} | undefined;
  Settings: undefined;
  BanaLingam: undefined;
  BanaLingamPayment: any;
  PaymentConfirmation: any;
  NithyaHomam: undefined;
  HomamEnroll: undefined;
  HomamPayment: any;
  HomamConfirmation: any;
  Orders: undefined;
  OrderDetails: {id?: number; order?: any} | undefined;
  OrderTracking: {id?: number; order?: any} | undefined;
  DeliveryStatus: {id?: number; order?: any} | undefined;
  CustomerCare: undefined;
  RaiseTicket: undefined;
  WhatsAppSupport: undefined;
  CallSupport: undefined;
  Faq: undefined;
  Notifications: undefined;
  Feedback: undefined;
  StarRating: {message?: string} | undefined;
  FeedbackConfirmation: undefined;
  PrivacyPolicy: undefined;
  DesignSystem: undefined;
  ScreenIndex: undefined;
  BanaLingamReview: any;
  DonationConfirmation: any;
  AdminHub: undefined;
  AdminLogin: undefined;
  AdminForgotPassword: {email?: string} | undefined;
  AdminDashboard: undefined;
  AdminAccounts: undefined;
  AdminUsers: undefined;
  AdminUserDetails: {userId?: string} | undefined;
  AdminUserEdit: {userId?: string} | undefined;
  AdminJapa: undefined;
  AdminMantras: undefined;
  AdminMantraEdit: {mantraId?: string} | undefined;
  AdminChallengeCreate:
    | {
        id?: string;
        title?: string;
        description?: string;
        detail?: string;
        targetValue?: number;
        rewardName?: string;
        startDate?: string;
        endDate?: string;
        mantra?: string;
      }
    | undefined;
  AdminChallenges: undefined;
  AdminRewards: undefined;
  AdminRewardStock:
    | {
        id: string;
        name?: string;
        stock?: number;
      }
    | undefined;
  AdminNotifications: undefined;
  AdminOrders: undefined;
  AdminOrderDetails: {orderId?: string} | undefined;
  AdminProducts: undefined;
  AdminBanners: undefined;
  AdminPayments: undefined;
  AdminAnnadanam: undefined;
  AdminBaanalingam: undefined;
  AdminNithyaHomam: undefined;
  AdminSupport: undefined;
  AdminFeedback: undefined;
  AdminAnalyticsDashboard: undefined;
  AdminUserDemographics: undefined;
  AdminJapaAnalytics: undefined;
  AdminChallengeAnalytics: undefined;
  AdminDonationAnalytics: undefined;
  AdminFestivalAnalytics: undefined;
  AdminNotificationAnalytics: undefined;
  AdminLanguages: undefined;
  AdminMultilingualContent: undefined;
  AdminExportReports: undefined;
  AdminMore: undefined;
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
const ProtectedJapaGoalComplete = withAuth(JapaGoalCompleteScreen);
const ProtectedPrivate = withAuth(PrivateJapaScreen);
const ProtectedSevaHub = withAuth(SevaHubScreen);
const ProtectedChant = withAuth(ChantScreen);
const ProtectedChallenges = withAuth(ChallengesScreen);
const ProtectedChallengeDetails = withAuth(ChallengeDetailsScreen);
const ProtectedChallengeRules = withAuth(ChallengeRulesScreen);
const ProtectedRewardTerms = withAuth(RewardTermsScreen);
const ProtectedChallengeProgress = withAuth(ChallengeProgressScreen);
const ProtectedChallengeLeaderboard = withAuth(ChallengeLeaderboardScreen);
const ProtectedChallengeMyRank = withAuth(ChallengeMyRankScreen);
const ProtectedChallengeRewardSelect = withAuth(ChallengeRewardSelectScreen);
const ProtectedChallengeRewardConfirm = withAuth(ChallengeRewardConfirmScreen);
const ProtectedChallengeRewardClaimed = withAuth(ChallengeRewardClaimedScreen);
const ProtectedChallengeRewardDelivery = withAuth(ChallengeRewardDeliveryScreen);
const ProtectedChallengeRewardOrderCreated = withAuth(
  ChallengeRewardOrderCreatedScreen,
);
const ProtectedChallengeComplete = withAuth(ChallengeCompleteScreen);
const ProtectedFamily = withAuth(FamilyJapaScreen);
const ProtectedDonate = withAuth(DonateScreen);
const ProtectedJapaAnnadanam = withAuth(JapaAnnadanamScreen);
const ProtectedMilestoneNotes = withAuth(MilestoneNotificationsScreen);
const ProtectedGeneralAnnadanam = withAuth(GeneralAnnadanamScreen);
const ProtectedDonationForm = withAuth(DonationFormScreen);
const ProtectedCheckout = withAuth(CheckoutScreen);
const ProtectedPaymentConfirmation = withAuth(PaymentConfirmationScreen);
const ProtectedFestivals = withAuth(FestivalsScreen);
const ProtectedProgress = withAuth(ProgressScreen);
const ProtectedAnalyticsHub = withAuth(AnalyticsHubScreen);
const ProtectedJapaOverview = withAuth(JapaOverviewScreen);
const ProtectedDailyAnalytics = withAuth(DailyAnalyticsScreen);
const ProtectedWeeklyAnalytics = withAuth(WeeklyAnalyticsScreen);
const ProtectedMonthlyAnalytics = withAuth(MonthlyAnalyticsScreen);
const ProtectedLifetimeAnalytics = withAuth(LifetimeAnalyticsScreen);
const ProtectedGoalAnalytics = withAuth(GoalAnalyticsScreen);
const ProtectedStreakAnalytics = withAuth(StreakAnalyticsScreen);
const ProtectedProfile = withAuth(ProfileViewScreen);
const ProtectedPersonal = withAuth(PersonalDetailsScreen);
const ProtectedSpiritual = withAuth(SpiritualDetailsScreen);
const ProtectedSettings = withAuth(SettingsScreen);
const ProtectedBanaLingam = withAuth(BanaLingamScreen);
const ProtectedHomam = withAuth(NithyaHomamScreen);
const ProtectedHomamEnroll = withAuth(HomamEnrollScreen);
const ProtectedHomamConfirmation = withAuth(HomamConfirmationScreen);
const ProtectedOrders = withAuth(OrdersScreen);
const ProtectedOrderDetails = withAuth(OrderDetailsScreen);
const ProtectedOrderTracking = withAuth(OrderTrackingScreen);
const ProtectedDeliveryStatus = withAuth(DeliveryStatusScreen);
const ProtectedCare = withAuth(CustomerCareScreen);
const ProtectedRaiseTicket = withAuth(RaiseTicketScreen);
const ProtectedWhatsApp = withAuth(WhatsAppSupportScreen);
const ProtectedCallSupport = withAuth(CallSupportScreen);
const ProtectedFaq = withAuth(FaqScreen);
const ProtectedNotifications = withAuth(NotificationsScreen);
const ProtectedFeedback = withAuth(FeedbackScreen);
const ProtectedStarRating = withAuth(StarRatingScreen);
const ProtectedFeedbackConfirmation = withAuth(FeedbackConfirmationScreen);
const ProtectedDesignSystem = withAuth(DesignSystemScreen);
const ProtectedScreenIndex = withAuth(ScreenIndexScreen);
const ProtectedBanaReview = withAuth(BanaLingamReviewScreen);
const ProtectedDonationConfirmation = withAuth(DonationConfirmationScreen);
const ProtectedWelcomeGift = withAuth(WelcomeGiftScreen);
const ProtectedAdminHub = AdminHubScreen;
const ProtectedAdminLogin = AdminLoginScreen;
const ProtectedAdminForgotPassword = AdminForgotPasswordScreen;
const ProtectedAdminDashboard = withAdminAuth(AdminDashboardScreen);
const ProtectedAdminAccounts = withAdminAuth(AdminAccountsScreen);
const ProtectedAdminUsers = withAdminAuth(AdminUsersScreen);
const ProtectedAdminUserDetails = withAdminAuth(AdminUserDetailsScreen);
const ProtectedAdminUserEdit = withAdminAuth(AdminUserEditScreen);
const ProtectedAdminJapa = withAdminAuth(AdminJapaScreen);
const ProtectedAdminMantras = withAdminAuth(AdminMantrasScreen);
const ProtectedAdminMantraEdit = withAdminAuth(AdminMantraEditScreen);
const ProtectedAdminChallengeCreate = withAdminAuth(AdminChallengeCreateScreen);
const ProtectedAdminChallenges = withAdminAuth(AdminChallengesScreen);
const ProtectedAdminRewards = withAdminAuth(AdminRewardsScreen);
const ProtectedAdminRewardStock = withAdminAuth(AdminRewardStockScreen);
const ProtectedAdminNotifications = withAdminAuth(AdminNotificationsScreen);
const ProtectedAdminOrders = withAdminAuth(AdminOrdersScreen);
const ProtectedAdminOrderDetails = withAdminAuth(AdminOrderDetailsScreen);
const ProtectedAdminProducts = withAdminAuth(AdminProductsScreen);
const ProtectedAdminBanners = withAdminAuth(AdminBannersScreen);
const ProtectedAdminPayments = withAdminAuth(AdminPaymentsScreen);
const ProtectedAdminAnnadanam = withAdminAuth(AdminAnnadanamScreen);
const ProtectedAdminBaanalingam = withAdminAuth(AdminBaanalingamScreen);
const ProtectedAdminNithyaHomam = withAdminAuth(AdminNithyaHomamScreen);
const ProtectedAdminSupport = withAdminAuth(AdminSupportScreen);
const ProtectedAdminFeedback = withAdminAuth(AdminFeedbackScreen);
const ProtectedAdminAnalyticsDashboard = withAdminAuth(AdminAnalyticsDashboardScreen);
const ProtectedAdminUserDemographics = withAdminAuth(AdminUserDemographicsScreen);
const ProtectedAdminJapaAnalytics = withAdminAuth(AdminJapaAnalyticsScreen);
const ProtectedAdminChallengeAnalytics = withAdminAuth(
  AdminChallengeAnalyticsScreen,
);
const ProtectedAdminDonationAnalytics = withAdminAuth(AdminDonationAnalyticsScreen);
const ProtectedAdminFestivalAnalytics = withAdminAuth(AdminFestivalAnalyticsScreen);
const ProtectedAdminNotificationAnalytics = withAdminAuth(
  AdminNotificationAnalyticsScreen,
);
const ProtectedAdminLanguages = withAdminAuth(AdminLanguagesScreen);
const ProtectedAdminMultilingualContent = withAdminAuth(
  AdminMultilingualContentScreen,
);
const ProtectedAdminExportReports = withAdminAuth(AdminExportReportsScreen);
const ProtectedAdminMore = withAdminAuth(AdminMoreScreen);

const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        {__DEV__ ? (
          <>
            <Stack.Screen
              name="DesignSystem"
              component={ProtectedDesignSystem}
            />
            <Stack.Screen
              name="ScreenIndex"
              component={ProtectedScreenIndex}
            />
          </>
        ) : null}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        <Stack.Screen name="SocialAuth" component={SocialAuthScreen} />
        <Stack.Screen name="OtpScreen" component={OtpScreen} />
        <Stack.Screen name="SignupPersonal" component={SignupPersonalScreen} />
        <Stack.Screen name="SignupSpiritual" component={SignupSpiritualScreen} />
        <Stack.Screen name="SignupPhoto" component={SignupPhotoScreen} />
        <Stack.Screen
          name="RegistrationComplete"
          component={RegistrationCompleteScreen}
        />
        <Stack.Screen name="WelcomeGift" component={ProtectedWelcomeGift} />
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
        <Stack.Screen
          name="JapaGoalComplete"
          component={ProtectedJapaGoalComplete}
        />
        <Stack.Screen name="PrivateJapa" component={ProtectedPrivate} />
        <Stack.Screen name="SevaHub" component={ProtectedSevaHub} />
        <Stack.Screen name="Chant" component={ProtectedChant} />
        <Stack.Screen name="Challenges" component={ProtectedChallenges} />
        <Stack.Screen
          name="ChallengeDetails"
          component={ProtectedChallengeDetails}
        />
        <Stack.Screen
          name="ChallengeRules"
          component={ProtectedChallengeRules}
        />
        <Stack.Screen name="RewardTerms" component={ProtectedRewardTerms} />
        <Stack.Screen
          name="ChallengeProgress"
          component={ProtectedChallengeProgress}
        />
        <Stack.Screen
          name="ChallengeLeaderboard"
          component={ProtectedChallengeLeaderboard}
        />
        <Stack.Screen
          name="ChallengeMyRank"
          component={ProtectedChallengeMyRank}
        />
        <Stack.Screen
          name="ChallengeRewardSelect"
          component={ProtectedChallengeRewardSelect}
        />
        <Stack.Screen
          name="ChallengeRewardConfirm"
          component={ProtectedChallengeRewardConfirm}
        />
        <Stack.Screen
          name="ChallengeRewardClaimed"
          component={ProtectedChallengeRewardClaimed}
        />
        <Stack.Screen
          name="ChallengeRewardDelivery"
          component={ProtectedChallengeRewardDelivery}
        />
        <Stack.Screen
          name="ChallengeRewardOrderCreated"
          component={ProtectedChallengeRewardOrderCreated}
        />
        <Stack.Screen
          name="ChallengeComplete"
          component={ProtectedChallengeComplete}
        />
        <Stack.Screen name="FamilyJapa" component={ProtectedFamily} />
        <Stack.Screen name="Donate" component={ProtectedDonate} />
        <Stack.Screen name="JapaAnnadanam" component={ProtectedJapaAnnadanam} />
        <Stack.Screen
          name="MilestoneNotifications"
          component={ProtectedMilestoneNotes}
        />
        <Stack.Screen
          name="GeneralAnnadanam"
          component={ProtectedGeneralAnnadanam}
        />
        <Stack.Screen name="DonationForm" component={ProtectedDonationForm} />
        <Stack.Screen name="DonationPayment" component={ProtectedCheckout} />
        <Stack.Screen
          name="DonationConfirmation"
          component={ProtectedDonationConfirmation}
        />
        <Stack.Screen name="Festivals" component={ProtectedFestivals} />
        <Stack.Screen name="Progress" component={ProtectedProgress} />
        <Stack.Screen name="AnalyticsHub" component={ProtectedAnalyticsHub} />
        <Stack.Screen name="JapaOverview" component={ProtectedJapaOverview} />
        <Stack.Screen name="DailyAnalytics" component={ProtectedDailyAnalytics} />
        <Stack.Screen
          name="WeeklyAnalytics"
          component={ProtectedWeeklyAnalytics}
        />
        <Stack.Screen
          name="MonthlyAnalytics"
          component={ProtectedMonthlyAnalytics}
        />
        <Stack.Screen
          name="LifetimeAnalytics"
          component={ProtectedLifetimeAnalytics}
        />
        <Stack.Screen name="GoalAnalytics" component={ProtectedGoalAnalytics} />
        <Stack.Screen
          name="StreakAnalytics"
          component={ProtectedStreakAnalytics}
        />
        <Stack.Screen name="Profile" component={ProtectedProfile} />
        <Stack.Screen name="PersonalDetails" component={ProtectedPersonal} />
        <Stack.Screen name="SpiritualDetails" component={ProtectedSpiritual} />
        <Stack.Screen name="Settings" component={ProtectedSettings} />
        <Stack.Screen name="BanaLingam" component={ProtectedBanaLingam} />
        <Stack.Screen name="BanaLingamReview" component={ProtectedBanaReview} />
        <Stack.Screen name="BanaLingamPayment" component={ProtectedCheckout} />
        <Stack.Screen
          name="PaymentConfirmation"
          component={ProtectedPaymentConfirmation}
        />
        <Stack.Screen name="NithyaHomam" component={ProtectedHomam} />
        <Stack.Screen name="HomamEnroll" component={ProtectedHomamEnroll} />
        <Stack.Screen name="HomamPayment" component={ProtectedCheckout} />
        <Stack.Screen
          name="HomamConfirmation"
          component={ProtectedHomamConfirmation}
        />
        <Stack.Screen name="Orders" component={ProtectedOrders} />
        <Stack.Screen name="OrderDetails" component={ProtectedOrderDetails} />
        <Stack.Screen name="OrderTracking" component={ProtectedOrderTracking} />
        <Stack.Screen name="DeliveryStatus" component={ProtectedDeliveryStatus} />
        <Stack.Screen name="CustomerCare" component={ProtectedCare} />
        <Stack.Screen name="RaiseTicket" component={ProtectedRaiseTicket} />
        <Stack.Screen name="WhatsAppSupport" component={ProtectedWhatsApp} />
        <Stack.Screen name="CallSupport" component={ProtectedCallSupport} />
        <Stack.Screen name="Faq" component={ProtectedFaq} />
        <Stack.Screen name="Notifications" component={ProtectedNotifications} />
        <Stack.Screen name="Feedback" component={ProtectedFeedback} />
        <Stack.Screen name="StarRating" component={ProtectedStarRating} />
        <Stack.Screen
          name="FeedbackConfirmation"
          component={ProtectedFeedbackConfirmation}
        />
        <Stack.Screen name="AdminHub" component={ProtectedAdminHub} />
        <Stack.Screen name="AdminLogin" component={ProtectedAdminLogin} />
        <Stack.Screen
          name="AdminForgotPassword"
          component={ProtectedAdminForgotPassword}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={ProtectedAdminDashboard}
        />
        <Stack.Screen
          name="AdminAccounts"
          component={ProtectedAdminAccounts}
        />
        <Stack.Screen name="AdminUsers" component={ProtectedAdminUsers} />
        <Stack.Screen
          name="AdminUserDetails"
          component={ProtectedAdminUserDetails}
        />
        <Stack.Screen
          name="AdminUserEdit"
          component={ProtectedAdminUserEdit}
        />
        <Stack.Screen name="AdminJapa" component={ProtectedAdminJapa} />
        <Stack.Screen name="AdminMantras" component={ProtectedAdminMantras} />
        <Stack.Screen
          name="AdminMantraEdit"
          component={ProtectedAdminMantraEdit}
        />
        <Stack.Screen
          name="AdminChallengeCreate"
          component={ProtectedAdminChallengeCreate}
        />
        <Stack.Screen
          name="AdminChallenges"
          component={ProtectedAdminChallenges}
        />
        <Stack.Screen name="AdminRewards" component={ProtectedAdminRewards} />
        <Stack.Screen
          name="AdminRewardStock"
          component={ProtectedAdminRewardStock}
        />
        <Stack.Screen
          name="AdminNotifications"
          component={ProtectedAdminNotifications}
        />
        <Stack.Screen name="AdminOrders" component={ProtectedAdminOrders} />
        <Stack.Screen
          name="AdminOrderDetails"
          component={ProtectedAdminOrderDetails}
        />
        <Stack.Screen name="AdminProducts" component={ProtectedAdminProducts} />
        <Stack.Screen name="AdminBanners" component={ProtectedAdminBanners} />
        <Stack.Screen name="AdminPayments" component={ProtectedAdminPayments} />
        <Stack.Screen
          name="AdminAnnadanam"
          component={ProtectedAdminAnnadanam}
        />
        <Stack.Screen
          name="AdminBaanalingam"
          component={ProtectedAdminBaanalingam}
        />
        <Stack.Screen
          name="AdminNithyaHomam"
          component={ProtectedAdminNithyaHomam}
        />
        <Stack.Screen name="AdminSupport" component={ProtectedAdminSupport} />
        <Stack.Screen name="AdminFeedback" component={ProtectedAdminFeedback} />
        <Stack.Screen
          name="AdminAnalyticsDashboard"
          component={ProtectedAdminAnalyticsDashboard}
        />
        <Stack.Screen
          name="AdminUserDemographics"
          component={ProtectedAdminUserDemographics}
        />
        <Stack.Screen
          name="AdminJapaAnalytics"
          component={ProtectedAdminJapaAnalytics}
        />
        <Stack.Screen
          name="AdminChallengeAnalytics"
          component={ProtectedAdminChallengeAnalytics}
        />
        <Stack.Screen
          name="AdminDonationAnalytics"
          component={ProtectedAdminDonationAnalytics}
        />
        <Stack.Screen
          name="AdminFestivalAnalytics"
          component={ProtectedAdminFestivalAnalytics}
        />
        <Stack.Screen
          name="AdminNotificationAnalytics"
          component={ProtectedAdminNotificationAnalytics}
        />
        <Stack.Screen
          name="AdminLanguages"
          component={ProtectedAdminLanguages}
        />
        <Stack.Screen
          name="AdminMultilingualContent"
          component={ProtectedAdminMultilingualContent}
        />
        <Stack.Screen
          name="AdminExportReports"
          component={ProtectedAdminExportReports}
        />
        <Stack.Screen name="AdminMore" component={ProtectedAdminMore} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
