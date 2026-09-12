import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
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
  const back = showBack ?? !tab;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title={title} showBack={back} showBell={showBell} />
        {scroll ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.fill}>{children}</View>
        )}
      </View>
      {tab ? <BottomTabs active={tab} /> : null}
    </SafeAreaView>
  );
};

export default ScreenLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scroll: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
  },
});
