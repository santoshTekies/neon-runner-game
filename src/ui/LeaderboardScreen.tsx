import { ScrollView, StyleSheet, View } from 'react-native';
import { useSave } from '../state/save';
import { formatDistance } from './Hud';
import { NeonButton, NeonText, Panel, Scrim } from './Neon';
import { UI } from './theme';

const RANK_COLORS = [UI.gold, '#d8e2ff', UI.orange];

export function LeaderboardScreen({ onClose }: { onClose: () => void }) {
  const { highScores } = useSave();

  return (
    <Scrim>
      <Panel color={UI.orange} style={styles.panel}>
        <View style={styles.header}>
          <NeonText size={22} weight="black" color={UI.orange} glowColor={UI.orange}>
            TOP RUNS
          </NeonText>
          <NeonButton small label="CLOSE" onPress={onClose} />
        </View>
        {highScores.length === 0 ? (
          <NeonText size={13} color={UI.dim} style={styles.empty}>
            No runs yet. Go set a record!
          </NeonText>
        ) : (
          <ScrollView>
            {highScores.map((s, i) => {
              const color = RANK_COLORS[i] ?? UI.text;
              return (
                <View key={`${s.date}-${i}`} style={styles.row}>
                  <NeonText size={15} weight="black" color={color} glowColor={i < 3 ? color : undefined} style={styles.rank}>
                    #{i + 1}
                  </NeonText>
                  <NeonText size={15} color={color} style={styles.distance}>
                    {formatDistance(s.distance)}
                  </NeonText>
                  <NeonText size={12} color={UI.gold} style={styles.coins}>
                    {s.coins} coins
                  </NeonText>
                  <NeonText size={11} color={UI.dim} weight="regular">
                    {new Date(s.date).toLocaleDateString()}
                  </NeonText>
                </View>
              );
            })}
          </ScrollView>
        )}
      </Panel>
    </Scrim>
  );
}

const styles = StyleSheet.create({
  panel: { width: '70%', maxWidth: 560, maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  rank: { width: 50 },
  distance: { flex: 1 },
  coins: { width: 110 },
});
