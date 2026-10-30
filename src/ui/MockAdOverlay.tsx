import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { registerRewardedAdHandler } from '../ads/rewarded';
import { NeonButton, NeonText } from './Neon';
import { UI } from './theme';

const AD_SECONDS = 5;

/**
 * Stand-in for a rewarded video ad so the continue / double-coins flow can be
 * tested in Expo Go. Swap for a real ad SDK in src/ads/rewarded.ts.
 */
export function MockAdOverlay({ onVisibleChange }: { onVisibleChange?: (visible: boolean) => void }) {
  const [visible, setVisible] = useState(false);
  const [left, setLeft] = useState(AD_SECONDS);
  const resolver = useRef<((rewarded: boolean) => void) | null>(null);

  useEffect(() => {
    registerRewardedAdHandler(
      () =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve;
          setLeft(AD_SECONDS);
          setVisible(true);
        }),
    );
    return () => registerRewardedAdHandler(null);
  }, []);

  useEffect(() => {
    onVisibleChange?.(visible);
    if (!visible) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [visible, onVisibleChange]);

  const finish = (rewarded: boolean) => {
    setVisible(false);
    resolver.current?.(rewarded);
    resolver.current = null;
  };

  if (!visible) return null;
  const done = left === 0;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <NeonText size={11} color={UI.dim}>
          SPONSORED · TEST AD
        </NeonText>
        {done ? (
          <Pressable onPress={() => finish(true)} hitSlop={12} style={styles.close}>
            <NeonText size={14}>✕</NeonText>
          </Pressable>
        ) : (
          <Pressable onPress={() => finish(false)} hitSlop={12}>
            <NeonText size={11} color={UI.dim}>
              Reward in {left}s · Skip
            </NeonText>
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <NeonText size={30} weight="black" color={UI.gold} glowColor={UI.gold}>
          YOUR AD HERE
        </NeonText>
        <NeonText size={13} color={UI.dim} weight="regular">
          A real rewarded video will play here once an ad network is connected.
        </NeonText>
        {done && <NeonButton label="CLAIM REWARD" filled color={UI.green} onPress={() => finish(true)} style={styles.claim} />}
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progress, { width: `${((AD_SECONDS - left) / AD_SECONDS) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#000', padding: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: UI.text, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  claim: { marginTop: 16 },
  progressTrack: { height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' },
  progress: { height: 4, backgroundColor: UI.gold },
});
