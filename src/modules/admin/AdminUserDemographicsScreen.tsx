import React from 'react';

import AdminAnalyticsPanel from './AdminAnalyticsPanel';

const AdminUserDemographicsScreen = () => (
  <AdminAnalyticsPanel
    title="User Demographics"
    kpiValue="1,284"
    changeValue="+18%"
    bars={[0.4, 0.7, 0.35, 0.88, 0.52, 0.65]}
  />
);

export default AdminUserDemographicsScreen;
