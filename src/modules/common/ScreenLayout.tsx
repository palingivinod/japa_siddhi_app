import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Colors from '../../theme/colors';
import AppHeader from './AppHeader';
import BottomTabs, {TabKey} from './BottomTabs';

interface Props {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  showBell?: boolean;
  tab?: TabKey;
  scroll?: boolean;
}

const ScreenLayout: React.FC<Props> = ({
  title,
  children,
  showBack,
  showBell,
  tab,
  scroll = true,
}) => {
  // Tab roots hide back unless explicitly requested. Stack pages show back.
  const back = showBack ?? (tab ? false : true);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <View style={styles.body}>
          <AppHeader title={title} showBack={back} showBell={showBell} />
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.fill}>{children}</View>
          )}
        </View>
        {tab ? <BottomTabs active={tab} /> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ScreenLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  scroll: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  content: {
    // Extra space so focused fields stay above the keyboard.
    paddingBottom: 140,
  },
});
