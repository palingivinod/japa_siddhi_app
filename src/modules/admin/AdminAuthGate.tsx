import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {CommonActions, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {getAdminSession} from '../admin/adminSession';

let cachedAdminAllowed = false;

export const resetAdminAuthGate = () => {
  cachedAdminAllowed = false;
};

const AdminAuthGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const navigation = useNavigation<any>();
  const [allowed, setAllowed] = useState(cachedAdminAllowed);

  useEffect(() => {
    let active = true;

    getAdminSession().then(session => {
      if (!active) {
        return;
      }

      if (!session?.email) {
        cachedAdminAllowed = false;
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'Login'}],
          }),
        );
        return;
      }

      cachedAdminAllowed = true;
      setAllowed(true);
    });

    return () => {
      active = false;
    };
  }, [navigation]);

  if (!allowed) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

export const withAdminAuth = <P extends object>(
  Component: React.ComponentType<P>,
) => {
  return function AdminAuthenticatedScreen(props: P) {
    return (
      <AdminAuthGate>
        <Component {...props} />
      </AdminAuthGate>
    );
  };
};

export default AdminAuthGate;

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
