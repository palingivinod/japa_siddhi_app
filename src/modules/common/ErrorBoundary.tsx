import React, {Component, ErrorInfo, ReactNode} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';

type Props = {children: ReactNode};
type State = {hasError: boolean; message: string};

/**
 * Catch React render errors so one bad screen does not kill the whole app process.
 * Native keyboard/layout crashes are handled separately (all Android devices).
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = {hasError: false, message: ''};

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: String(error?.message || 'Something went wrong.'),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[ErrorBoundary]', error?.message, info?.componentStack);
  }

  private retry = () => {
    this.setState({hasError: false, message: ''});
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Japa Siddhi</Text>
          <Text style={styles.copy}>
            A screen hit an unexpected error. You can try again without
            reinstalling.
          </Text>
          {this.state.message ? (
            <Text style={styles.detail} numberOfLines={4}>
              {this.state.message}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.btn} onPress={this.retry}>
            <Text style={styles.btnText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 10,
  },
  copy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  detail: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 18,
  },
  btn: {
    backgroundColor: Colors.sacredBrown,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
