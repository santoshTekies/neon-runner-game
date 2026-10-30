import { useCallback, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ModelRunner } from '../game/characters';
import { CharacterShowcase } from '../scene/CharacterStage';
import { NeonButton, NeonText } from './Neon';
import { UI } from './theme';

const RADIANS_PER_PIXEL = 0.012;

/** Horizontal drags spin the character. */
function createRotateResponder(yaw: { current: number }) {
  let start = 0;
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      start = yaw.current;
    },
    onPanResponderMove: (_, g) => {
      yaw.current = start + g.dx * RADIANS_PER_PIXEL;
    },
  });
}

export function CharacterViewer({ character, onClose }: { character: ModelRunner; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [yaw] = useState(() => ({ current: 0 }));
  const rotate = useMemo(() => createRotateResponder(yaw), [yaw]);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <View style={styles.root}>
      <CharacterShowcase character={character} yaw={yaw} onReady={onReady} />
      <View style={StyleSheet.absoluteFill} {...rotate.panHandlers} />

      <NeonText size={22} weight="black" color={character.accent} glowColor={character.accent} style={styles.name}>
        {character.name.toUpperCase()}
      </NeonText>
      <NeonButton small label="‹ BACK" color={UI.cyan} onPress={onClose} style={[styles.back, { left: insets.left + 16 }]} />
      <NeonText size={10} color={UI.dim} style={styles.hint}>
        {ready ? 'DRAG TO ROTATE' : 'LOADING…'}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#140b38' },
  name: { position: 'absolute', top: 18, alignSelf: 'center', pointerEvents: 'none' },
  back: { position: 'absolute', top: 14 },
  hint: { position: 'absolute', bottom: 14, alignSelf: 'center', pointerEvents: 'none' },
});
