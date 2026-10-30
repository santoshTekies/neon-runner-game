import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CoinIcon, formatDistance } from './Hud';
import { NeonButton, NeonText, Panel, Scrim } from './Neon';
import { UI } from './theme';

export function PauseScreen({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <Scrim>
      <Panel color={UI.cyan} style={styles.panel}>
        <NeonText size={30} weight="black" color={UI.cyan} glowColor={UI.cyan}>
          PAUSED
        </NeonText>
        <View style={styles.buttons}>
          <NeonButton label="QUIT" color={UI.pink} onPress={onQuit} />
          <NeonButton label="▶  RESUME" filled onPress={onResume} />
        </View>
      </Panel>
    </Scrim>
  );
}

const CONTINUE_SECONDS = 6;
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

export function ContinueScreen({
  distance,
  onWatchAd,
  onDecline,
}: {
  distance: number;
  onWatchAd: () => void;
  onDecline: () => void;
}) {
  const [left, setLeft] = useState(CONTINUE_SECONDS);
  const declined = useRef(false);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, CONTINUE_SECONDS - (Date.now() - start) / 1000);
      setLeft(remaining);
      if (remaining <= 0 && !declined.current) {
        declined.current = true;
        clearInterval(id);
        onDecline();
      }
    }, 50);
    return () => clearInterval(id);
  }, [onDecline]);

  return (
    <Scrim>
      <Panel color={UI.red} style={styles.panel}>
        <NeonText size={26} weight="black" color={UI.red} glowColor={UI.red}>
          OUT OF LIVES
        </NeonText>
        <NeonText size={14} color={UI.dim}>
          {formatDistance(distance)} — keep running?
        </NeonText>
        <View style={styles.ring}>
          <Svg width={84} height={84}>
            <Circle cx={42} cy={42} r={RING_R} stroke="rgba(255,255,255,0.12)" strokeWidth={6} fill="none" />
            <Circle
              cx={42}
              cy={42}
              r={RING_R}
              stroke={UI.red}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${RING_C} ${RING_C}`}
              strokeDashoffset={RING_C * (1 - left / CONTINUE_SECONDS)}
              transform="rotate(-90 42 42)"
            />
          </Svg>
          <NeonText size={26} weight="black" style={styles.ringText}>
            {Math.ceil(left)}
          </NeonText>
        </View>
        <View style={styles.buttons}>
          <NeonButton
            label="NO THANKS"
            color={UI.dim}
            small
            onPress={() => {
              declined.current = true;
              onDecline();
            }}
          />
          <NeonButton
            label="▶  WATCH AD TO CONTINUE"
            filled
            color={UI.green}
            onPress={() => {
              declined.current = true;
              onWatchAd();
            }}
          />
        </View>
      </Panel>
    </Scrim>
  );
}

export function GameOverScreen({
  distance,
  coins,
  rank,
  canDouble,
  onDouble,
  onRetry,
  onMenu,
}: {
  distance: number;
  coins: number;
  rank: number;
  canDouble: boolean;
  onDouble: () => void;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <Scrim>
      <Panel color={UI.pink} style={styles.panel}>
        <NeonText size={30} weight="black" color={UI.pink} glowColor={UI.pink}>
          GAME OVER
        </NeonText>
        {rank === 0 && (
          <NeonText size={14} color={UI.gold} glowColor={UI.gold}>
            ★ NEW BEST ★
          </NeonText>
        )}
        {rank > 0 && (
          <NeonText size={12} color={UI.orange}>
            #{rank + 1} on your leaderboard
          </NeonText>
        )}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <NeonText size={11} color={UI.dim}>
              DISTANCE
            </NeonText>
            <NeonText size={24} color={UI.cyan} glowColor={UI.cyan}>
              {formatDistance(distance)}
            </NeonText>
          </View>
          <View style={styles.stat}>
            <NeonText size={11} color={UI.dim}>
              COINS
            </NeonText>
            <View style={styles.coinRow}>
              <CoinIcon />
              <NeonText size={24} color={UI.gold} glowColor={UI.gold}>
                {coins}
              </NeonText>
            </View>
          </View>
        </View>
        <View style={styles.buttons}>
          <NeonButton label="MENU" color={UI.cyan} onPress={onMenu} />
          {canDouble && coins > 0 && <NeonButton label="▶  2X COINS" color={UI.green} onPress={onDouble} />}
          <NeonButton label="RUN AGAIN" filled color={UI.pink} onPress={onRetry} />
        </View>
      </Panel>
    </Scrim>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', gap: 8, minWidth: 360, maxWidth: '86%' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  ring: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  ringText: { position: 'absolute' },
  stats: { flexDirection: 'row', gap: 40, marginVertical: 6 },
  stat: { alignItems: 'center', gap: 4 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
