import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import AdminTabs, {AdminTabKey} from './AdminTabs';

type Props = {
  title: string;
  children: React.ReactNode;
  tab: AdminTabKey;
  showBack?: boolean;
  pinned?: React.ReactNode;
};

/** Shared shell for signed-in admin screens (header + scroll + admin tabs). */
const AdminScreenLayout: React.FC<Props> = ({
  title,
  children,
  tab,
  showBack = true,
  pinned,
}) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title={title} showBack={showBack} />
        {pinned ? <View style={styles.pinned}>{pinned}</View> : null}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
  body: {flex: 1, paddingHorizontal: 12},
  pinned: {
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  scroll: {flex: 1},
  content: {paddingBottom: 48, flexGrow: 1},
});
