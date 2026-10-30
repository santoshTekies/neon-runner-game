import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncMusic } from '../audio/sound';
import { SaveData, updateSave, useSave } from '../state/save';
import { CoinIcon, formatDistance } from './Hud';
import { NeonButton, NeonText } from './Neon';
import { UI } from './theme';

type SettingKey = keyof SaveData['settings'];
const SETTINGS: { key: SettingKey; label: string }[] = [
  { key: 'music', label: 'MUSIC' },
  { key: 'sfx', label: 'SFX' },
  { key: 'haptics', label: 'VIBRATE' },
];

export function MenuScreen({ onPlay, onShop, onLeaderboard }: { onPlay: () => void; onShop: () => void; onLeaderboard: () => void }) {
  const save = useSave();
  const insets = useSafeAreaInsets();
  const best = save.highScores[0]?.distance ?? 0;

  const toggle = (key: SettingKey) => {
    updateSave((d) => ({ ...d, settings: { ...d.settings, [key]: !d.settings[key] } }));
    if (key === 'music') syncMusic();
  };

  return (
    <View style={[styles.root, { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }]}>
      <View style={styles.topBar}>
        <View style={styles.wallet}>
          <CoinIcon />
          <NeonText size={16} color={UI.gold} glowColor={UI.gold}>
            {save.coins}
          </NeonText>
        </View>
        <View style={styles.settings}>
          {SETTINGS.map((s) => (
            <NeonButton
              key={s.key}
              small
              label={`${s.label} ${save.settings[s.key] ? 'ON' : 'OFF'}`}
              color={save.settings[s.key] ? UI.cyan : UI.dim}
              onPress={() => toggle(s.key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.center}>
        <NeonText size={56} weight="black" color="#e9fbff" glowColor={UI.cyan} style={styles.title}>
          NEON RUN
        </NeonText>
        <NeonText size={14} color={UI.pink} glowColor={UI.pink}>
          BEST: {formatDistance(best)}
        </NeonText>
        <View style={styles.buttons}>
          <NeonButton label="SHOP" color={UI.pink} onPress={onShop} />
          <NeonButton label="▶  RUN" filled onPress={onPlay} style={styles.play} />
          <NeonButton label="SCORES" color={UI.orange} onPress={onLeaderboard} />
        </View>
      </View>

      <NeonText size={11} color={UI.dim} style={styles.hint}>
        SWIPE ↑ JUMP · ↓ SLIDE · ← → CHANGE LANE
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4, 2, 16, 0.35)', paddingVertical: 14 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: UI.gold,
    backgroundColor: 'rgba(10, 6, 34, 0.7)',
  },
  settings: { flexDirection: 'row', gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { letterSpacing: 4 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 },
  play: { paddingHorizontal: 40, paddingVertical: 16 },
  hint: { textAlign: 'center' },
});
