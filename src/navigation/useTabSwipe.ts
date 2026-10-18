import {useMemo, useRef} from 'react';
import {PanResponder, GestureResponderEvent, PanResponderGestureState} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {TabKey} from '../modules/common/BottomTabs';

/** Main bottom-tab order (WhatsApp-style swipe). */
export const TAB_SWIPE_ORDER: Array<{route: string; tabKey: TabKey}> = [
  {route: 'Home', tabKey: 'Home'},
  {route: 'JapaHub', tabKey: 'JapaHub'},
  {route: 'SevaHub', tabKey: 'SevaHub'},
  {route: 'AvailableRewards', tabKey: 'Rewards'},
  {route: 'Profile', tabKey: 'Profile'},
];

const SWIPE_DX = 56;
const SWIPE_VX = 0.35;

const resolveIndex = (active: TabKey): number => {
  const idx = TAB_SWIPE_ORDER.findIndex(
    item => item.tabKey === active || item.route === active,
  );
  if (idx >= 0) {
    return idx;
  }
  if (active === 'AvailableRewards' || active === 'Rewards') {
    return TAB_SWIPE_ORDER.findIndex(item => item.tabKey === 'Rewards');
  }
  return -1;
};

/**
 * Horizontal swipe between bottom tabs (right→left = next, left→right = previous).
 * Ignores mostly-vertical gestures so ScrollViews keep working.
 */
export const useTabSwipe = (active: TabKey, enabled = true) => {
  const navigation = useNavigation<any>();
  const activeRef = useRef(active);
  activeRef.current = active;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const goRelative = (delta: number) => {
    const idx = resolveIndex(activeRef.current);
    if (idx < 0) {
      return;
    }
    const next = TAB_SWIPE_ORDER[idx + delta];
    if (next) {
      navigation.navigate(next.route);
    }
  };

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (
          _e: GestureResponderEvent,
          g: PanResponderGestureState,
        ) => {
          if (!enabledRef.current) {
            return false;
          }
          const absX = Math.abs(g.dx);
          const absY = Math.abs(g.dy);
          return absX > 18 && absX > absY * 1.35;
        },
        // Never capture — letting ScrollViews / buttons keep priority avoids
        // stolen touches and unstable navigations while exploring.
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderRelease: (
          _e: GestureResponderEvent,
          g: PanResponderGestureState,
        ) => {
          if (!enabledRef.current) {
            return;
          }
          const absX = Math.abs(g.dx);
          const absY = Math.abs(g.dy);
          if (absX < absY * 1.2) {
            return;
          }
          try {
            if (g.dx <= -SWIPE_DX || g.vx <= -SWIPE_VX) {
              goRelative(1);
            } else if (g.dx >= SWIPE_DX || g.vx >= SWIPE_VX) {
              goRelative(-1);
            }
          } catch (err) {
            console.warn('[useTabSwipe] navigate failed', err);
          }
        },
        onPanResponderTerminationRequest: () => true,
      }),
    // navigation is stable enough; active/enabled read via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation],
  );
};
