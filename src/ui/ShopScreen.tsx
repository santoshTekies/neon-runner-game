import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { haptic } from '../audio/sound';
import { CHARACTERS, Character } from '../game/characters';
import { MAX_UPGRADE_LEVEL, PowerUpType, UPGRADE_INFO, powerUpDuration, upgradeCost } from '../game/config';
import { updateSave, useSave } from '../state/save';
import { CharacterViewer } from './CharacterViewer';
import { CoinIcon } from './Hud';
import { NeonButton, NeonText, Panel, Scrim } from './Neon';
import { UI } from './theme';

type Tab = 'characters' | 'upgrades';

export function ShopScreen({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const [tab, setTab] = useState<Tab>('characters');
  const [viewing, setViewing] = useState<Character | null>(null);

  const buyCharacter = (id: string, price: number) => {
    if (save.coins < price) return;
    haptic('success');
    updateSave((d) => ({ ...d, coins: d.coins - price, ownedCharacters: [...d.ownedCharacters, id], character: id }));
  };

  const buyUpgrade = (type: PowerUpType) => {
    const level = save.upgrades[type];
    const cost = upgradeCost(level);
    if (level >= MAX_UPGRADE_LEVEL || save.coins < cost) return;
    haptic('success');
    updateSave((d) => ({ ...d, coins: d.coins - cost, upgrades: { ...d.upgrades, [type]: level + 1 } }));
  };

  if (viewing) return <CharacterViewer character={viewing} onClose={() => setViewing(null)} />;

  return (
    <Scrim>
      <Panel color={UI.pink} style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.tabs}>
            <NeonButton
              small
              label="CHARACTERS"
              color={tab === 'characters' ? UI.pink : UI.dim}
              filled={tab === 'characters'}
              onPress={() => setTab('characters')}
            />
            <NeonButton small label="UPGRADES" color={tab === 'upgrades' ? UI.pink : UI.dim} filled={tab === 'upgrades'} onPress={() => setTab('upgrades')} />
          </View>
          <View style={styles.wallet}>
            <CoinIcon />
            <NeonText color={UI.gold} glowColor={UI.gold}>
              {save.coins}
            </NeonText>
          </View>
          <NeonButton small label="CLOSE" color={UI.cyan} onPress={onClose} />
        </View>

        {tab === 'characters' ? (
          <ScrollView horizontal contentContainerStyle={styles.list} showsHorizontalScrollIndicator={false}>
            {CHARACTERS.map((character) => {
              const owned = save.ownedCharacters.includes(character.id);
              const selected = save.character === character.id;
              const color = character.accent;
              return (
                <Pressable
                  key={character.id}
                  onPress={() =>
                    owned ? updateSave((d) => ({ ...d, character: character.id })) : buyCharacter(character.id, character.price)
                  }
                  style={[styles.card, { borderColor: selected ? color : 'rgba(255,255,255,0.15)', shadowColor: color }]}
                >
                  <View style={[styles.portrait, { borderColor: color }]} pointerEvents="none">
                    <Image source={character.portrait} style={styles.portraitImage} resizeMode="cover" />
                  </View>
                  <NeonText size={12} color={color} glowColor={color} style={styles.cardName}>
                    {character.name.toUpperCase()}
                  </NeonText>
                  {owned ? (
                    <NeonText size={10} color={selected ? UI.green : UI.dim}>
                      {selected ? 'SELECTED' : 'TAP TO SELECT'}
                    </NeonText>
                  ) : (
                    <View style={[styles.price, save.coins < character.price && styles.priceLocked]}>
                      <CoinIcon size={12} />
                      <NeonText size={11} color={UI.gold}>
                        {character.price}
                      </NeonText>
                    </View>
                  )}
                  <NeonButton small label="VIEW" color={color} onPress={() => setViewing(character)} style={styles.view} />
                </Pressable>
              );
            })}
            <View style={[styles.card, styles.comingSoon]}>
              <RunnerIcon color="rgba(255,255,255,0.18)" />
              <NeonText size={12} color={UI.dim} style={styles.cardName}>
                MORE SOON
              </NeonText>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.upgrades}>
            {(Object.keys(UPGRADE_INFO) as PowerUpType[]).map((type) => {
              const info = UPGRADE_INFO[type];
              const level = save.upgrades[type];
              const maxed = level >= MAX_UPGRADE_LEVEL;
              const cost = upgradeCost(level);
              return (
                <View key={type} style={styles.upgradeRow}>
                  <View style={styles.upgradeInfo}>
                    <NeonText size={14} color={info.color} glowColor={info.color}>
                      {info.name.toUpperCase()}
                    </NeonText>
                    <NeonText size={10} color={UI.dim} weight="regular">
                      {info.description} · {powerUpDuration(level)}s
                    </NeonText>
                  </View>
                  <View style={styles.pips}>
                    {Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) => (
                      <View key={i} style={[styles.pip, { borderColor: info.color }, i < level && { backgroundColor: info.color }]} />
                    ))}
                  </View>
                  <NeonButton
                    small
                    label={maxed ? 'MAX' : `${cost}`}
                    icon={maxed ? undefined : <CoinIcon size={12} />}
                    color={UI.gold}
                    disabled={maxed || save.coins < cost}
                    onPress={() => buyUpgrade(type)}
                    style={styles.buy}
                  />
                </View>
              );
            })}
          </View>
        )}
      </Panel>
    </Scrim>
  );
}

/** Tiny stick-figure preview built from views. */
function RunnerIcon({ color }: { color: string }) {
  const limb = { position: 'absolute' as const, width: 5, borderRadius: 3, backgroundColor: color };
  return (
    <View style={{ width: 44, height: 58, shadowColor: color, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }}>
      <View style={{ position: 'absolute', left: 15, top: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
      <View style={[limb, { left: 20, top: 15, height: 20, transform: [{ rotate: '12deg' }] }]} />
      <View style={[limb, { left: 11, top: 17, height: 15, transform: [{ rotate: '50deg' }] }]} />
      <View style={[limb, { left: 28, top: 16, height: 15, transform: [{ rotate: '-60deg' }] }]} />
      <View style={[limb, { left: 14, top: 34, height: 22, transform: [{ rotate: '30deg' }] }]} />
      <View style={[limb, { left: 26, top: 34, height: 22, transform: [{ rotate: '-35deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '86%', maxWidth: 680, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  tabs: { flexDirection: 'row', gap: 8 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: 12, paddingVertical: 6, paddingHorizontal: 4 },
  card: {
    width: 132,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  portrait: { width: 104, height: 96, borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  portraitImage: { width: '100%', height: '100%' },
  view: { marginTop: 2 },
  cardName: { textAlign: 'center', paddingHorizontal: 6 },
  comingSoon: { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)', shadowOpacity: 0 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceLocked: { opacity: 0.5 },
  upgrades: { gap: 10 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  upgradeInfo: { flex: 1 },
  pips: { flexDirection: 'row', gap: 4 },
  pip: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5 },
  buy: { minWidth: 92 },
});
