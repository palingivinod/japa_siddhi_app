import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTabSwipe} from '../../navigation/useTabSwipe';
import Colors from '../../theme/colors';
import {useBottomNavPad} from '../../utils/safeArea';
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
  // WhatsApp-style swipe only on main tab roots (not nested pages with back)
  const swipeEnabled = Boolean(tab) && !back;
  const tabSwipe = useTabSwipe(tab || 'Home', swipeEnabled);
  // Tab bar pads itself; stack pages need explicit bottom pad (Android inset can be 0).
  const bottomPad = useBottomNavPad();

  const body = (
    <View style={styles.body}>
      <AppHeader title={title} showBack={back} showBell={showBell} />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            !tab ? {paddingBottom: 140 + bottomPad} : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // Android 15 / some OEMs (Lava, Poco): clipped TextInput views can NPE on focus
          removeClippedSubviews={false}
          overScrollMode="never">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, !tab ? {paddingBottom: bottomPad} : null]}>
          {children}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
      {...(swipeEnabled ? tabSwipe.panHandlers : {})}>
      {/* KAV only on iOS — Android uses windowSoftInputMode=adjustPan */}
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={8}>
          {body}
          {tab ? <BottomTabs active={tab} /> : null}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>
          {body}
          {tab ? <BottomTabs active={tab} /> : null}
        </View>
      )}
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
