import React from 'react';

import AdminAnalyticsPanel from './AdminAnalyticsPanel';

const AdminAnalyticsDashboardScreen = () => (
  <AdminAnalyticsPanel
    title="Analytics Dashboard"
    kpiValue="1,284"
    changeValue="+18%"
    bars={[0.5, 0.78, 0.42, 0.92, 0.58, 0.7]}
  />
);

export default AdminAnalyticsDashboardScreen;
