import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {CommonActions, useNavigation} from '@react-navigation/native';

import {hydrateSession} from '../../services/session';
import Colors from '../../theme/colors';

let cachedAllowed = false;

export const resetAuthGate = () => {
  cachedAllowed = false;
};

const AuthGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const navigation = useNavigation<any>();
  const [allowed, setAllowed] = useState(cachedAllowed);

  useEffect(() => {
    let active = true;

    hydrateSession().then(session => {
      if (!active) {
        return;
      }

      if (!session.token) {
        cachedAllowed = false;
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'Login'}],
          }),
        );
        return;
      }

      cachedAllowed = true;
      setAllowed(true);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!allowed) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return function AuthenticatedScreen(props: P) {
    return (
      <AuthGate>
        <Component {...props} />
      </AuthGate>
    );
  };
};

export default AuthGate;

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
