export type AdminUserStatus = 'Active' | 'Blocked';

export type AdminUser = {
  id: string;
  name: string;
  japaCount: number;
  status: AdminUserStatus;
  mobile: string;
  email?: string;
  mobileCountryCode?: string;
  mobileNumber?: string;
};

export type AdminMantra = {
  id: string;
  name: string;
  subtitle: string;
  active: boolean;
  target?: number;
};

export type AdminChallengeStatus = 'Active' | 'Inactive';

export type AdminChallenge = {
  id: string;
  title: string;
  detail: string;
  status: AdminChallengeStatus;
  active?: boolean;
};

export type AdminReward = {
  id: string;
  name: string;
  stock: number;
};

export type AdminDashboardStats = {
  users: number;
  japa: number;
  orders: number;
  donationsLabel: string;
};

export const ADMIN_CONTROL_ITEMS: Array<{
  title: string;
  route?: string;
}> = [
  {title: 'User Management', route: 'AdminUsers'},
  {title: 'Japa Management', route: 'AdminJapa'},
  {title: 'Challenge Creation', route: 'AdminChallengeCreate'},
  {title: 'Challenge Management', route: 'AdminChallenges'},
  {title: 'Reward Management', route: 'AdminRewards'},
  {title: 'Notification Management', route: 'AdminNotifications'},
  {title: 'Banner Management', route: 'AdminBanners'},
  {title: 'Product Management', route: 'AdminProducts'},
  {title: 'Orders', route: 'AdminOrders'},
  {title: 'Payments', route: 'AdminPayments'},
  {title: 'Annadanam', route: 'AdminAnnadanam'},
  {title: 'Baanalingam', route: 'AdminBaanalingam'},
  {title: 'Nithya Homam', route: 'AdminNithyaHomam'},
  {title: 'Support Tickets', route: 'AdminSupport'},
  {title: 'Feedback', route: 'AdminFeedback'},
  {title: 'Analytics Dashboard', route: 'AdminAnalyticsDashboard'},
  {title: 'User Demographics', route: 'AdminUserDemographics'},
  {title: 'Japa Analytics', route: 'AdminJapaAnalytics'},
  {title: 'Challenge Analytics', route: 'AdminChallengeAnalytics'},
  {title: 'Donation Analytics', route: 'AdminDonationAnalytics'},
  {title: 'Festival Analytics', route: 'AdminFestivalAnalytics'},
  {title: 'Notification Analytics', route: 'AdminNotificationAnalytics'},
  {title: 'Languages', route: 'AdminLanguages'},
  {title: 'Multilingual Content', route: 'AdminMultilingualContent'},
  {title: 'Export Reports', route: 'AdminExportReports'},
];

export const ADMIN_USERS: AdminUser[] = [
  {
    id: '1',
    name: 'Ananya Rao',
    japaCount: 1240,
    status: 'Active',
    mobile: '+91 XXXXX XXXXX',
  },
  {
    id: '2',
    name: 'Suresh Kumar',
    japaCount: 820,
    status: 'Active',
    mobile: '+91 XXXXX XXXXX',
  },
  {
    id: '3',
    name: 'Meera',
    japaCount: 120,
    status: 'Blocked',
    mobile: '+91 XXXXX XXXXX',
  },
  {
    id: '4',
    name: 'Ravi',
    japaCount: 2410,
    status: 'Active',
    mobile: '+91 XXXXX XXXXX',
  },
];

export const ADMIN_MANTRAS: AdminMantra[] = [
  {
    id: '1',
    name: 'Om Namah Shivaya',
    subtitle: 'Community mantra',
    active: true,
    target: 10000,
  },
  {
    id: '2',
    name: 'Om Namo Narayanaya',
    subtitle: 'Community mantra',
    active: true,
    target: 10000,
  },
  {
    id: '3',
    name: 'Hare Krishna',
    subtitle: 'Community mantra',
    active: true,
    target: 10000,
  },
  {
    id: '4',
    name: 'Gayatri Mantra',
    subtitle: 'Community mantra',
    active: true,
    target: 10000,
  },
];

export const ADMIN_CHALLENGES: AdminChallenge[] = [
  {
    id: '1',
    title: 'Kartika Masam 10,000',
    detail: '1,284 participants',
    status: 'Active',
  },
  {
    id: '2',
    title: 'Shivaratri 25,000',
    detail: '842 participants',
    status: 'Active',
  },
  {
    id: '3',
    title: 'Daily 108',
    detail: 'Completed',
    status: 'Inactive',
  },
];

export const ADMIN_REWARDS: AdminReward[] = [
  {id: '1', name: 'Rudraksha', stock: 12},
  {id: '2', name: 'Spatik mala', stock: 5},
  {id: '3', name: 'Pasupu kommuka maala', stock: 0},
  {id: '4', name: 'Green agate', stock: 8},
  {id: '5', name: 'Yellow agate', stock: 3},
  {id: '6', name: 'Tulasi mala', stock: 0},
];

export type AdminProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

export type AdminBannerStatus = 'Active' | 'Scheduled' | 'Blocked';

export type AdminBanner = {
  id: string;
  title: string;
  module: string;
  status: AdminBannerStatus;
};

export type AdminOrderStatus = 'Processing' | 'Shipped' | 'Delivered';

export type AdminOrder = {
  id: string;
  orderNo: string;
  product: string;
  customer: string;
  status: AdminOrderStatus;
};

export type AdminPaymentRow = {
  id: string;
  label: string;
  amount: string;
  status: 'Sent' | 'Pending';
};

export const ADMIN_PRODUCTS: AdminProduct[] = [
  {id: '1', name: 'Rudraksha', price: 499, stock: 12},
  {id: '2', name: 'Spatik mala', price: 699, stock: 5},
  {id: '3', name: 'Pasupu kommuka maala', price: 799, stock: 0},
  {id: '4', name: 'Tulasi mala', price: 399, stock: 0},
];

export const ADMIN_BANNERS: AdminBanner[] = [
  {id: '1', title: 'Kartika Masam', module: 'Home', status: 'Active'},
  {id: '2', title: 'Japa Rewards', module: 'Challenges', status: 'Scheduled'},
  {id: '3', title: 'Annadanam', module: 'Annadanam', status: 'Blocked'},
];

export const ADMIN_ORDERS: AdminOrder[] = [
  {
    id: '10281',
    orderNo: '#10281',
    product: 'Rudraksha',
    customer: 'Ananya',
    status: 'Processing',
  },
  {
    id: '10280',
    orderNo: '#10280',
    product: 'Spatik mala',
    customer: 'Suresh',
    status: 'Shipped',
  },
  {
    id: '10279',
    orderNo: '#10279',
    product: 'Tulasi mala',
    customer: 'Meera',
    status: 'Delivered',
  },
];

export const ADMIN_PAYMENTS: AdminPaymentRow[] = [
  {id: '1', label: 'Today', amount: '₹0', status: 'Pending'},
  {id: '2', label: 'This week', amount: '₹0', status: 'Pending'},
  {id: '3', label: 'This month', amount: '₹0', status: 'Pending'},
  {id: '4', label: 'Refunds', amount: '₹0', status: 'Sent'},
];

export type AdminAnnadanamItem = {
  id: string;
  title: string;
  subtitle: string;
  active: boolean;
};

export type AdminBaanalingamStatus = 'Sent' | 'Pending' | 'Delivered';

export type AdminBaanalingamItem = {
  id: string;
  code: string;
  name: string;
  status: AdminBaanalingamStatus;
};

export type AdminHomamStatus = 'Active' | 'Inactive';

export type AdminHomamItem = {
  id: string;
  code: string;
  name: string;
  stage: string;
  status: AdminHomamStatus;
};

export type AdminTicketStatus = 'Pending' | 'Resolved';

export type AdminTicket = {
  id: string;
  code: string;
  subject: string;
  status: AdminTicketStatus;
};

export type AdminFeedback = {
  id: string;
  name: string;
  rating: string;
  comment: string;
  status: AdminTicketStatus;
};

export const ADMIN_ANNADANAM: AdminAnnadanamItem[] = [
  {
    id: '1',
    title: 'Japa Annadanam',
    subtitle: 'Milestone participation',
    active: true,
  },
  {
    id: '2',
    title: 'General Annadanam',
    subtitle: 'Donations',
    active: true,
  },
  {
    id: '3',
    title: 'Campaigns',
    subtitle: 'Festival campaigns',
    active: true,
  },
];

export const ADMIN_BAANALINGAM: AdminBaanalingamItem[] = [];

export const ADMIN_NITHYA_HOMAM: AdminHomamItem[] = [];

export const ADMIN_TICKETS: AdminTicket[] = [
  {
    id: '1',
    code: '#T1021',
    subject: 'Reward stock question',
    status: 'Pending',
  },
  {
    id: '2',
    code: '#T1020',
    subject: 'Payment confirmation',
    status: 'Pending',
  },
  {
    id: '3',
    code: '#T1019',
    subject: 'Japa progress',
    status: 'Resolved',
  },
];

export const ADMIN_FEEDBACK: AdminFeedback[] = [
  {
    id: '1',
    name: 'Ananya',
    rating: '5/5',
    comment: 'Excellent',
    status: 'Resolved',
  },
  {
    id: '2',
    name: 'Suresh',
    rating: '4/5',
    comment: 'Smooth',
    status: 'Resolved',
  },
  {
    id: '3',
    name: 'Meera',
    rating: '4/5',
    comment: 'More mantras',
    status: 'Pending',
  },
];

export type AdminLanguage = {
  id: string;
  name: string;
  active: boolean;
};

export type AdminContentItem = {
  id: string;
  title: string;
  languages: string;
};

export type AdminExportReport = {
  id: string;
  title: string;
  subtitle: string;
};

export const ADMIN_LANGUAGES: AdminLanguage[] = [
  {id: '1', name: 'English', active: true},
  {id: '2', name: 'Telugu', active: true},
  {id: '3', name: 'Hindi', active: true},
  {id: '4', name: 'Kannada', active: true},
  {id: '5', name: 'Tamil', active: true},
  {id: '6', name: 'Malayalam', active: true},
];

export const ADMIN_CONTENT_ITEMS: AdminContentItem[] = [
  {
    id: '1',
    title: 'Home banners',
    languages: 'English / Telugu / Hindi',
  },
  {
    id: '2',
    title: 'Japa mantras',
    languages: 'English / Telugu',
  },
  {
    id: '3',
    title: 'Challenges',
    languages: 'English / Hindi',
  },
  {
    id: '4',
    title: 'Notifications',
    languages: 'All enabled languages',
  },
];

export const ADMIN_EXPORT_REPORTS: AdminExportReport[] = [
  {id: '1', title: 'User Reports', subtitle: 'Users and demographics'},
  {id: '2', title: 'Japa Reports', subtitle: 'Japa activity'},
  {id: '3', title: 'Challenge Reports', subtitle: 'Challenge results'},
  {id: '4', title: 'Donation Reports', subtitle: 'Annadanam'},
  {id: '5', title: 'Order Reports', subtitle: 'Products and orders'},
];

export const findAdminUser = (id?: string) =>
  ADMIN_USERS.find(user => user.id === id) || ADMIN_USERS[0];

export const findAdminOrder = (id?: string) =>
  ADMIN_ORDERS.find(order => order.id === id) || ADMIN_ORDERS[0];
