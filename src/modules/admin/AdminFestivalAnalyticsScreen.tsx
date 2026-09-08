import React from 'react';

import AdminAnalyticsPanel from './AdminAnalyticsPanel';

const AdminFestivalAnalyticsScreen = () => (
  <AdminAnalyticsPanel
    title="Festival Analytics"
    kpiValue="1,284"
    changeValue="+18%"
    bars={[0.46, 0.74, 0.39, 0.91, 0.57, 0.69]}
  />
);

export default AdminFestivalAnalyticsScreen;
