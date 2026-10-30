import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ENERGY_TO_SPRINT, MAX_SPEED, PowerUpType, SPRINT_DISTANCE, START_LIVES, UPGRADE_INFO } from '../game/config';
import { game } from '../game/engine';
import { NeonText } from './Neon';
import { UI } from './theme';

const snapshot = () => ({
  distance: game.distance,
  speed: game.speed,
  lives: game.lives,
  coins: game.coins,
  energy: game.energy,
  sprintLeft: game.sprintLeft,
  powerUps: { ...game.powerUps },
});

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.floor(m)} M` : `${(m / 1000).toFixed(2)} KM`;
}

const HEART = 'M12 21s-7.5-4.6-10-9.3C0.3 8.3 2.2 4 6.2 4c2.4 0 3.8 1.4 5.8 3.6C14 5.4 15.4 4 17.8 4c4 0 5.9 4.3 4.2 7.7C19.5 16.4 12 21 12 21z';

export function Heart({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={HEART} fill={filled ? UI.red : 'transparent'} stroke={UI.red} strokeWidth={2} opacity={filled ? 1 : 0.4} />
    </Svg>
  );
}

const BOLT = 'M14 2 L4 14 H11 L9 22 L20 9 H13 Z';

function EnergyCell({ filled }: { filled: boolean }) {
  return (
    <Svg width={18} height={20} viewBox="0 0 24 24">
      <Path d={BOLT} fill={filled ? '#7fb2ff' : 'transparent'} stroke="#3d8bff" strokeWidth={2} strokeLinejoin="round" opacity={filled ? 1 : 0.45} />
    </Svg>
  );
}

function SprintBanner({ left }: { left: number }) {
  return (
    <View style={styles.sprint} pointerEvents="none">
      <NeonText size={22} weight="black" color="#d8fbff" glowColor={UI.cyan}>
        SPRINT!
      </NeonText>
      <View style={styles.sprintTrack}>
        <View style={[styles.sprintFill, { width: `${(left / SPRINT_DISTANCE) * 100}%` }]} />
      </View>
    </View>
  );
}

function SprintButton({ onPress, right }: { onPress: () => void; right: number }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });

  return (
    <Animated.View style={[styles.sprintButtonWrap, { right, transform: [{ scale }] }]}>
      <Animated.View style={[styles.sprintRing, { opacity: ringOpacity }]} pointerEvents="none" />
      <Pressable onPress={onPress} hitSlop={12} style={({ pressed }) => [styles.sprintButton, pressed && { opacity: 0.7 }]}>
        <Svg width={30} height={30} viewBox="0 0 24 24">
          <Path d={BOLT} fill="#e6f6ff" stroke="#3d8bff" strokeWidth={1.5} strokeLinejoin="round" />
        </Svg>
        <NeonText size={11} weight="black" color="#e6f6ff" glowColor="#3d8bff">
          SPRINT
        </NeonText>
      </Pressable>
    </Animated.View>
  );
}

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#ffb800',
        borderWidth: 2,
        borderColor: UI.gold,
        shadowColor: UI.gold,
        shadowOpacity: 1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

const GAUGE_W = 240;
const GAUGE_H = 64;
const R = 170;
const CX = GAUGE_W / 2;
const CY = R + 14;
const A0 = (-90 - 38) * (Math.PI / 180);
const A1 = (-90 + 38) * (Math.PI / 180);

function arc(frac: number) {
  const a = A0 + (A1 - A0) * frac;
  const x0 = CX + R * Math.cos(A0);
  const y0 = CY + R * Math.sin(A0);
  return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${CX + R * Math.cos(a)} ${CY + R * Math.sin(a)}`;
}

function SpeedGauge({ speed }: { speed: number }) {
  const frac = Math.min(1, Math.max(0.02, speed / MAX_SPEED));
  return (
    <View style={styles.gauge} pointerEvents="none">
      <Svg width={GAUGE_W} height={GAUGE_H}>
        <Path d={arc(1)} stroke="#3a1a10" strokeWidth={10} fill="none" strokeLinecap="round" />
        <Path d={arc(frac)} stroke={UI.orange} strokeWidth={16} opacity={0.25} fill="none" strokeLinecap="round" />
        <Path d={arc(frac)} stroke={UI.orange} strokeWidth={6} fill="none" strokeLinecap="round" />
      </Svg>
      <View style={styles.gaugeLabel}>
        <NeonText size={26} weight="black" color="#ffb070" glowColor={UI.orange}>
          {Math.round(speed * 3.6)}
        </NeonText>
        <NeonText size={11} color="#ffb070" glowColor={UI.orange}>
          {' KM/H »'}
        </NeonText>
      </View>
    </View>
  );
}

function PowerUpChip({ type, remaining, duration }: { type: PowerUpType; remaining: number; duration: number }) {
  const info = UPGRADE_INFO[type];
  return (
    <View style={[styles.chip, { borderColor: info.color, shadowColor: info.color }]}>
      <NeonText size={11} color={info.color} glowColor={info.color}>
        {info.name.toUpperCase()}
      </NeonText>
      <View style={styles.chipTrack}>
        <View style={[styles.chipFill, { width: `${(remaining / duration) * 100}%`, backgroundColor: info.color }]} />
      </View>
    </View>
  );
}

export function Hud({ onPause, onSprint }: { onPause: () => void; onSprint: () => void }) {
  const insets = useSafeAreaInsets();
  const [s, setS] = useState(snapshot);

  useEffect(() => {
    const id = setInterval(() => setS(snapshot()), 100);
    return () => clearInterval(id);
  }, []);

  const active = (Object.keys(s.powerUps) as PowerUpType[]).filter((t) => s.powerUps[t] > 0);

  return (
    <View style={[StyleSheet.absoluteFill, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <View pointerEvents="none">
          <NeonText size={18} color={UI.orange} glowColor={UI.orange}>
            DISTANCE: {formatDistance(s.distance)}
          </NeonText>
          <View style={styles.row}>
            <NeonText size={14} color={UI.orange} glowColor={UI.orange}>
              LIVES:
            </NeonText>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <Heart key={i} filled={i < s.lives} />
            ))}
          </View>
          <View style={styles.row}>
            <CoinIcon />
            <NeonText size={15} color={UI.gold} glowColor={UI.gold}>
              {s.coins}
            </NeonText>
          </View>
          <View style={styles.row}>
            {Array.from({ length: ENERGY_TO_SPRINT }, (_, i) => (
              <EnergyCell key={i} filled={i < s.energy} />
            ))}
          </View>
        </View>

        <View style={styles.chips} pointerEvents="none">
          {active.map((t) => (
            <PowerUpChip key={t} type={t} remaining={s.powerUps[t]} duration={game.powerUpDurations[t]} />
          ))}
        </View>

        <Pressable onPress={onPause} hitSlop={16} style={styles.pause}>
          <View style={styles.pauseBar} />
          <View style={styles.pauseBar} />
        </Pressable>
      </View>
      {s.sprintLeft > 0 && <SprintBanner left={s.sprintLeft} />}
      <SpeedGauge speed={s.speed} />
      {s.energy >= ENERGY_TO_SPRINT && s.sprintLeft <= 0 && (
        <SprintButton
          right={insets.right + 22}
          onPress={() => {
            onSprint();
            setS(snapshot());
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(10, 6, 34, 0.6)',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  chipTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 4, overflow: 'hidden' },
  chipFill: { height: 4, borderRadius: 2 },
  pause: {
    flexDirection: 'row',
    gap: 6,
    padding: 10,
    borderWidth: 2,
    borderColor: UI.cyan,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 6, 34, 0.6)',
  },
  pauseBar: { width: 5, height: 18, borderRadius: 2, backgroundColor: UI.cyan },
  sprint: { position: 'absolute', top: 64, alignSelf: 'center', alignItems: 'center' },
  sprintTrack: { width: 180, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 6, overflow: 'hidden' },
  sprintFill: { height: 6, borderRadius: 3, backgroundColor: '#9ef6ff' },
  sprintButtonWrap: { position: 'absolute', bottom: 22, width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  sprintRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#9ef6ff',
  },
  sprintButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f5cff',
    borderWidth: 2,
    borderColor: '#9ef6ff',
    shadowColor: '#3d8bff',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  gauge: { position: 'absolute', bottom: 6, alignSelf: 'center', alignItems: 'center' },
  gaugeLabel: { position: 'absolute', bottom: 2, flexDirection: 'row', alignItems: 'baseline' },
});
