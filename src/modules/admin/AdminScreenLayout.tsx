import React, {useMemo, useRef, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  enableScrollToTop?: boolean;
  enableFastScroll?: boolean;
};

const THUMB_HEIGHT = 44;
const TRACK_BOTTOM_PAD = 72;
const TRACK_TOP_PAD = 8;

/** Shared shell for signed-in admin screens (header + scroll + admin tabs). */
const AdminScreenLayout: React.FC<Props> = ({
  title,
  children,
  tab,
  showBack = true,
  pinned,
  enableScrollToTop = false,
  enableFastScroll = false,
}) => {
  const scrollRef = useRef<ScrollView | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [contentHeight, setContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartThumbRef = useRef(0);
  const thumbTopRef = useRef(0);
  thumbTopRef.current = thumbTop;

  const availableTrack = Math.max(
    1,
    visibleHeight - TRACK_TOP_PAD - TRACK_BOTTOM_PAD,
  );
  const travel = Math.max(1, availableTrack - THUMB_HEIGHT);
  const maxScroll = Math.max(1, contentHeight - visibleHeight);

  const travelRef = useRef(travel);
  travelRef.current = travel;
  const maxScrollRef = useRef(maxScroll);
  maxScrollRef.current = maxScroll;

  const canFastScroll =
    enableFastScroll && contentHeight > visibleHeight + 100;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          isDraggingRef.current = true;
          setIsDragging(true);
          dragStartThumbRef.current = thumbTopRef.current;
        },
        onPanResponderMove: (_e, gestureState) => {
          const newTop = Math.min(
            travelRef.current,
            Math.max(0, dragStartThumbRef.current + gestureState.dy),
          );
          setThumbTop(newTop);
          if (travelRef.current > 0) {
            const scrollTarget =
              (newTop / travelRef.current) * maxScrollRef.current;
            scrollRef.current?.scrollTo({y: scrollTarget, animated: false});
          }
        },
        onPanResponderRelease: () => {
          isDraggingRef.current = false;
          setIsDragging(false);
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          setIsDragging(false);
        },
      }),
    [],
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (enableScrollToTop) {
      setShowScrollTop(offsetY > 200);
    }
    if (enableFastScroll && !isDraggingRef.current && maxScrollRef.current > 0) {
      const ratio = Math.min(
        1,
        Math.max(0, offsetY / maxScrollRef.current),
      );
      setThumbTop(ratio * travelRef.current);
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title={title} showBack={showBack} />
        {pinned ? <View style={styles.pinned}>{pinned}</View> : null}
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onLayout={e => setVisibleHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, h) => setContentHeight(h)}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          removeClippedSubviews={false}
          overScrollMode="never">
          {children}
        </ScrollView>

        {/* Draggable Fast Scrollbar */}
        {canFastScroll ? (
          <View
            style={[styles.fastScrollTrack, {height: availableTrack}]}
            pointerEvents="box-none">
            <View
              {...panResponder.panHandlers}
              style={[
                styles.fastScrollThumb,
                {top: thumbTop},
                isDragging && styles.fastScrollThumbActive,
              ]}>
              <Text style={styles.fastScrollGrip}>⇅</Text>
            </View>
          </View>
        ) : null}

        {/* Floating Top Arrow */}
        {enableScrollToTop && showScrollTop ? (
          <TouchableOpacity
            style={styles.floatingTopBtn}
            onPress={scrollToTop}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Scroll to top">
            <Text style={styles.floatingTopArrow}>↑</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <AdminTabs active={tab} />
    </SafeAreaView>
  );
};

export default AdminScreenLayout;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 12, position: 'relative'},
  pinned: {
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  scroll: {flex: 1},
  content: {paddingBottom: 48, flexGrow: 1},

  /* Fast Scroller */
  fastScrollTrack: {
    position: 'absolute',
    right: 2,
    top: TRACK_TOP_PAD,
    width: 28,
    alignItems: 'center',
    zIndex: 998,
  },
  fastScrollThumb: {
    position: 'absolute',
    width: 26,
    height: THUMB_HEIGHT,
    borderRadius: 13,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 7,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  fastScrollThumbActive: {
    backgroundColor: Colors.sacredBrown,
    transform: [{scale: 1.12}],
    shadowOpacity: 0.5,
    elevation: 10,
  },
  fastScrollGrip: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },

  /* Scroll To Top Button */
  floatingTopBtn: {
    position: 'absolute',
    right: 14,
    bottom: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: Colors.white,
    zIndex: 999,
  },
  floatingTopArrow: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
    marginTop: -2,
  },
});
