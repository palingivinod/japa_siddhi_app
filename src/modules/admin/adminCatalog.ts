/**
 * Admin screen catalog — filled as frames arrive (batches of ~5).
 */
export type AdminFrameStatus = 'pending' | 'scaffold' | 'done';

export type AdminFrame = {
  id: string;
  title: string;
  route?: string;
  status: AdminFrameStatus;
  notes?: string;
};

export const ADMIN_FRAMES: AdminFrame[] = [
  {id: '01', title: 'Admin Login', route: 'AdminLogin', status: 'done'},
  {
    id: '02',
    title: 'Admin Dashboard',
    route: 'AdminDashboard',
    status: 'done',
  },
  {id: '03', title: 'User Management', route: 'AdminUsers', status: 'done'},
  {
    id: '04',
    title: 'User Details',
    route: 'AdminUserDetails',
    status: 'done',
  },
  {id: '05', title: 'Japa Management', route: 'AdminJapa', status: 'done'},
  {
    id: '06',
    title: 'Mantra Management',
    route: 'AdminMantras',
    status: 'done',
  },
  {
    id: '07',
    title: 'Challenge Creation',
    route: 'AdminChallengeCreate',
    status: 'done',
  },
  {
    id: '08',
    title: 'Challenge Management',
    route: 'AdminChallenges',
    status: 'done',
  },
  {
    id: '09',
    title: 'Configure Rewards',
    route: 'AdminRewards',
    status: 'done',
  },
  {
    id: '09b',
    title: 'Update Reward Stock',
    route: 'AdminRewardStock',
    status: 'done',
  },
  {
    id: '10',
    title: 'Notification Management',
    route: 'AdminNotifications',
    status: 'done',
  },
  {
    id: '11',
    title: 'Banner Management',
    route: 'AdminBanners',
    status: 'done',
  },
  {
    id: '12',
    title: 'Product Management',
    route: 'AdminProducts',
    status: 'done',
  },
  {
    id: '13',
    title: 'Order Management',
    route: 'AdminOrders',
    status: 'done',
  },
  {
    id: '14',
    title: 'Order Details',
    route: 'AdminOrderDetails',
    status: 'done',
  },
  {
    id: '15',
    title: 'Payment Reports',
    route: 'AdminPayments',
    status: 'done',
  },
  {
    id: '16',
    title: 'Annadanam Management',
    route: 'AdminAnnadanam',
    status: 'done',
  },
  {
    id: '17',
    title: 'Nithya Homam Management',
    route: 'AdminNithyaHomam',
    status: 'done',
  },
  {
    id: '18',
    title: 'Baanalingam Management',
    route: 'AdminBaanalingam',
    status: 'done',
  },
  {
    id: '19',
    title: 'Feedback Management',
    route: 'AdminFeedback',
    status: 'done',
  },
  {
    id: '20',
    title: 'Customer Support Tickets',
    route: 'AdminSupport',
    status: 'done',
  },
  {
    id: '21',
    title: 'Analytics Dashboard',
    route: 'AdminAnalyticsDashboard',
    status: 'done',
  },
  {
    id: '22',
    title: 'User Demographics',
    route: 'AdminUserDemographics',
    status: 'done',
  },
  {
    id: '23',
    title: 'Japa Analytics',
    route: 'AdminJapaAnalytics',
    status: 'done',
  },
  {
    id: '24',
    title: 'Challenge Analytics',
    route: 'AdminChallengeAnalytics',
    status: 'done',
  },
  {
    id: '25',
    title: 'Donation Analytics',
    route: 'AdminDonationAnalytics',
    status: 'done',
  },
  {
    id: '26',
    title: 'Festival Analytics',
    route: 'AdminFestivalAnalytics',
    status: 'done',
  },
  {
    id: '27',
    title: 'Notification Analytics',
    route: 'AdminNotificationAnalytics',
    status: 'done',
  },
  {
    id: '28',
    title: 'Language Management',
    route: 'AdminLanguages',
    status: 'done',
  },
  {
    id: '29',
    title: 'Multilingual Content',
    route: 'AdminMultilingualContent',
    status: 'done',
  },
  {
    id: '30',
    title: 'Export Reports',
    route: 'AdminExportReports',
    status: 'done',
  },
];
