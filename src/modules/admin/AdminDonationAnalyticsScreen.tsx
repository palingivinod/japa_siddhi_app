import React from 'react';

import AdminAnalyticsPanel from './AdminAnalyticsPanel';

const AdminDonationAnalyticsScreen = () => (
  <AdminAnalyticsPanel
    title="Donation Analytics"
    kpiValue="1,284"
    changeValue="+18%"
    bars={[0.42, 0.8, 0.36, 0.9, 0.55, 0.66]}
  />
);

export default AdminDonationAnalyticsScreen;
