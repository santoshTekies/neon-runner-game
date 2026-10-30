import { useMemo } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { InputAction } from '../game/engine';

const THRESHOLD = 22;

/** One action per touch, fired as soon as the swipe crosses the threshold (no waiting for release). */
function createSwipeResponder(onAction: (a: InputAction) => void) {
  let fired = false;
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      fired = false;
    },
    onPanResponderMove: (_, g) => {
      if (fired) return;
      const ax = Math.abs(g.dx);
      const ay = Math.abs(g.dy);
      if (Math.max(ax, ay) < THRESHOLD) return;
      fired = true;
      if (ax > ay) onAction(g.dx > 0 ? 'right' : 'left');
      else onAction(g.dy < 0 ? 'jump' : 'slide');
    },
  });
}

/** Full-screen touch layer turning swipes into game input. */
export function SwipeLayer({ onAction }: { onAction: (a: InputAction) => void }) {
  const responder = useMemo(() => createSwipeResponder(onAction), [onAction]);
  return <View style={StyleSheet.absoluteFill} {...responder.panHandlers} />;
}
