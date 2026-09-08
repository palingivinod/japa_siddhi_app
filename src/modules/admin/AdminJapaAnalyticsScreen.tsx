import React from 'react';

import AdminAnalyticsPanel from './AdminAnalyticsPanel';

const AdminJapaAnalyticsScreen = () => (
  <AdminAnalyticsPanel
    title="Japa Analytics"
    kpiValue="1,284"
    changeValue="+18%"
    bars={[0.48, 0.75, 0.4, 0.95, 0.6, 0.72]}
  />
);

export default AdminJapaAnalyticsScreen;
