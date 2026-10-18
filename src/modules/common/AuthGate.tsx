import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {CommonActions, useNavigation} from '@react-navigation/native';

import {getValidSession} from '../../services/session';
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

    getValidSession()
      .then(session => {
        if (!active) {
          return;
        }

        if (!session.token) {
          cachedAllowed = false;
          try {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{name: 'Login', params: {forceLoginForm: true}}],
              }),
            );
          } catch (err) {
            console.warn('[AuthGate] reset to Login failed', err);
          }
          return;
        }

        cachedAllowed = true;
        setAllowed(true);
      })
      .catch(err => {
        console.warn('[AuthGate] session check failed', err);
        if (!active) {
          return;
        }
        cachedAllowed = false;
        try {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{name: 'Login', params: {forceLoginForm: true}}],
            }),
          );
        } catch {
          // ignore
        }
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
