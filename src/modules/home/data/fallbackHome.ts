import {HomeResponse} from '../types/home';

const fallbackHome: HomeResponse = {
  banner: {
    id: 1,
    title: 'Welcome to Japa Siddhi',
    subtitle:
      'Begin your spiritual journey with daily mantra chanting and devotion.',
    imageUrl: '',
    buttonText: 'Start Japa',
    buttonAction: 'CHANT',
  },
  globalJapaCount: {
    totalCount: 0,
    userCount: 0,
  },
  upcomingFestival: null,
  quickActions: [
    {
      id: 1,
      title: 'Japa Chanting',
      description: 'Community, private, and challenge japa',
      icon: 'japa',
      route: 'CHANT',
    },
    {
      id: 2,
      title: 'Baanalingam',
      description: 'Apply for Baanalingam distribution',
      icon: 'banalingam',
      route: 'BAANALINGAM',
    },
    {
      id: 3,
      title: 'Annadanam',
      description: 'Sponsor food seva and offerings',
      icon: 'donation',
      route: 'DONATE',
    },
    {
      id: 4,
      title: 'Nithya Homam',
      description: 'Enroll for daily homam',
      icon: 'festivals',
      route: 'NITHYA_HOMAM',
    },
    {
      id: 5,
      title: 'Orders & Tracking',
      description: 'Track mala, gifts, and Baanalingam',
      icon: 'store',
      route: 'ORDERS',
    },
    {
      id: 6,
      title: 'Customer Care',
      description: 'Tickets, WhatsApp, and FAQ',
      icon: 'customer_care',
      route: 'CUSTOMER_CARE',
    },
  ],
};

export default fallbackHome;
