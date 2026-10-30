import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { haptic } from '../audio/sound';
import { MAX_UPGRADE_LEVEL, PowerUpType, SKINS, UPGRADE_INFO, powerUpDuration, upgradeCost } from '../game/config';
import { updateSave, useSave } from '../state/save';
import { CoinIcon } from './Hud';
import { NeonButton, NeonText, Panel, Scrim } from './Neon';
import { UI } from './theme';

type Tab = 'runners' | 'upgrades';

export function ShopScreen({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const [tab, setTab] = useState<Tab>('runners');

  const buySkin = (id: string, price: number) => {
    if (save.coins < price) return;
    haptic('success');
    updateSave((d) => ({ ...d, coins: d.coins - price, ownedSkins: [...d.ownedSkins, id], skin: id }));
  };

  const buyUpgrade = (type: PowerUpType) => {
    const level = save.upgrades[type];
    const cost = upgradeCost(level);
    if (level >= MAX_UPGRADE_LEVEL || save.coins < cost) return;
    haptic('success');
    updateSave((d) => ({ ...d, coins: d.coins - cost, upgrades: { ...d.upgrades, [type]: level + 1 } }));
  };

  return (
    <Scrim>
      <Panel color={UI.pink} style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.tabs}>
            <NeonButton small label="RUNNERS" color={tab === 'runners' ? UI.pink : UI.dim} filled={tab === 'runners'} onPress={() => setTab('runners')} />
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

        {tab === 'runners' ? (
          <ScrollView horizontal contentContainerStyle={styles.list} showsHorizontalScrollIndicator={false}>
            {SKINS.map((skin) => {
              const owned = save.ownedSkins.includes(skin.id);
              const selected = save.skin === skin.id;
              return (
                <Pressable
                  key={skin.id}
                  onPress={() => (owned ? updateSave((d) => ({ ...d, skin: skin.id })) : buySkin(skin.id, skin.price))}
                  style={[styles.card, { borderColor: selected ? skin.color : 'rgba(255,255,255,0.15)', shadowColor: skin.color }]}
                >
                  <RunnerIcon color={skin.color} />
                  <NeonText size={13} color={skin.color} glowColor={skin.color}>
                    {skin.name.toUpperCase()}
                  </NeonText>
                  {owned ? (
                    <NeonText size={10} color={selected ? UI.green : UI.dim}>
                      {selected ? 'EQUIPPED' : 'TAP TO EQUIP'}
                    </NeonText>
                  ) : (
                    <View style={[styles.price, save.coins < skin.price && styles.priceLocked]}>
                      <CoinIcon size={12} />
                      <NeonText size={11} color={UI.gold}>
                        {skin.price}
                      </NeonText>
                    </View>
                  )}
                </Pressable>
              );
            })}
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
    width: 108,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceLocked: { opacity: 0.5 },
  upgrades: { gap: 10 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  upgradeInfo: { flex: 1 },
  pips: { flexDirection: 'row', gap: 4 },
  pip: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5 },
  buy: { minWidth: 92 },
});
