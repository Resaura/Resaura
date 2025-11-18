import { useMemo } from 'react';
import {
  Dimensions,
  GestureResponderHandlers,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;
const EDGE_THRESHOLD = 32;
const MIN_SWIPE_DISTANCE = 70;
const TAB_ORDER = ['index', 'clients', 'planning', 'finance', 'tools', 'settings', 'advanced'] as const;
type TabKey = typeof TAB_ORDER[number];

export function useSwipeTabsNavigation(currentTab: TabKey): GestureResponderHandlers {
  const router = useRouter();

  return useMemo(() => {
    const responder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (gesture.numberActiveTouches !== 1) return false;
        const horizontal = Math.abs(gesture.dx);
        const vertical = Math.abs(gesture.dy);
        const fromEdge = gesture.x0 < EDGE_THRESHOLD || gesture.x0 > SCREEN_WIDTH - EDGE_THRESHOLD;
        return fromEdge && horizontal > 18 && horizontal > vertical * 1.5;
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < MIN_SWIPE_DISTANCE) return;
        const direction = gesture.dx > 0 ? -1 : 1;
        const index = TAB_ORDER.indexOf(currentTab);
        if (index === -1) return;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;
        const target = TAB_ORDER[nextIndex];
        router.replace(`/(tabs)/${target}`);
      },
    });
    return responder.panHandlers;
  }, [currentTab, router]);
}

