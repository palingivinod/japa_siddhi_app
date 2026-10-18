import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Colors from '../../theme/colors';
import {useKeyboardOpen} from '../../utils/keyboard';
import AppHeader from '../common/AppHeader';
import AdminTabs, {AdminTabKey} from './AdminTabs';

type Props = {
  title: string;
  children: React.ReactNode;
  tab: AdminTabKey;
  showBack?: boolean;
};

/** Shared shell for signed-in admin screens (header + scroll + admin tabs). */
const AdminScreenLayout: React.FC<Props> = ({
  title,
  children,
  tab,
  showBack = true,
}) => {
  const keyboardOpen = useKeyboardOpen();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title={title} showBack={showBack} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          scrollEnabled={!keyboardOpen}
          keyboardDismissMode={keyboardOpen ? 'none' : 'on-drag'}
          removeClippedSubviews={false}
          overScrollMode="never">
          {children}
        </ScrollView>
      </View>
      <AdminTabs active={tab} />
    </SafeAreaView>
  );
};

export default AdminScreenLayout;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
  scroll: {flex: 1},
  content: {paddingBottom: 48, flexGrow: 1},
});
