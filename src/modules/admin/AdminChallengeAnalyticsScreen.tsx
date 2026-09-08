import React from 'react';

import AdminAnalyticsPanel from './AdminAnalyticsPanel';

const AdminChallengeAnalyticsScreen = () => (
  <AdminAnalyticsPanel
    title="Challenge Analytics"
    kpiValue="1,284"
    changeValue="+18%"
    bars={[0.55, 0.68, 0.45, 0.85, 0.5, 0.78]}
  />
);

export default AdminChallengeAnalyticsScreen;
