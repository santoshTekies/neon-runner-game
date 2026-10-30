import { Orbitron_500Medium, Orbitron_700Bold, Orbitron_900Black, useFonts } from '@expo-google-fonts/orbitron';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { showRewardedAd } from './src/ads/rewarded';
import { haptic, initAudio, playSound, setMusicPlaying } from './src/audio/sound';
import { getCharacter } from './src/game/characters';
import { MAX_CONTINUES } from './src/game/config';
import { InputAction, game } from './src/game/engine';
import { GameScene } from './src/scene/GameScene';
import { getSave, loadSave, recordRun, updateSave, useSave } from './src/state/save';
import { Hud } from './src/ui/Hud';
import { LeaderboardScreen } from './src/ui/LeaderboardScreen';
import { MenuScreen } from './src/ui/MenuScreen';
import { MockAdOverlay } from './src/ui/MockAdOverlay';
import { ContinueScreen, GameOverScreen, PauseScreen } from './src/ui/RunScreens';
import { ShopScreen } from './src/ui/ShopScreen';
import { SwipeLayer } from './src/ui/SwipeLayer';

type Screen = 'menu' | 'shop' | 'leaderboard' | 'playing' | 'paused' | 'continue' | 'gameover';

interface RunResult {
  distance: number;
  coins: number;
  rank: number;
  doubled: boolean;
}

export default function App() {
  const [fontsLoaded] = useFonts({ Orbitron_500Medium, Orbitron_700Bold, Orbitron_900Black });
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [result, setResult] = useState<RunResult | null>(null);
  const save = useSave();
  const character = getCharacter(save.character);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    Promise.all([loadSave(), initAudio()]).then(() => {
      setMusicPlaying(true);
      setReady(true);
    });
  }, []);

  const finishRun = useCallback(() => {
    const rank = recordRun(game.distance, game.coins);
    setResult({ distance: game.distance, coins: game.coins, rank, doubled: false });
    playSound('gameover');
    setScreen('gameover');
  }, []);

  // Game events -> sound, haptics and screen changes.
  useEffect(
    () =>
      game.on((e) => {
        switch (e) {
          case 'jump':
          case 'slide':
          case 'swoosh':
          case 'coin':
          case 'powerup':
          case 'energy':
          case 'shield':
            playSound(e);
            if (e === 'powerup') haptic('success');
            break;
          case 'energyFull':
            playSound('energy');
            haptic('success');
            break;
          case 'sprint':
            playSound('sprint');
            haptic('success');
            break;
          case 'smash':
            playSound('smash');
            haptic('light');
            break;
          case 'hit':
            playSound('hit');
            haptic('heavy');
            break;
          case 'death':
            if (game.continuesUsed < MAX_CONTINUES) setScreen('continue');
            else finishRun();
            break;
        }
      }),
    [finishRun],
  );

  // Pause when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && game.status === 'running') {
        game.pause();
        setScreen('paused');
      }
    });
    return () => sub.remove();
  }, []);

  const startRun = () => {
    game.start(getSave().upgrades);
    setResult(null);
    setScreen('playing');
  };

  const toMenu = () => {
    game.toIdle();
    setScreen('menu');
  };

  const onInput = useCallback((a: InputAction) => game.input(a), []);

  const watchAdToContinue = useCallback(async () => {
    if (await showRewardedAd()) {
      game.revive();
      setScreen('playing');
    } else {
      finishRun();
    }
  }, [finishRun]);

  const doubleCoins = async () => {
    if (!result || result.doubled) return;
    if (await showRewardedAd()) {
      updateSave((d) => ({ ...d, coins: d.coins + result.coins }));
      setResult({ ...result, coins: result.coins * 2, doubled: true });
      haptic('success');
    }
  };

  const onAdVisible = useCallback((visible: boolean) => setMusicPlaying(!visible), []);

  if (!fontsLoaded || !ready) return <View style={styles.root} />;

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar hidden />
        <GameScene character={character} />

        {screen === 'playing' && (
          <>
            <SwipeLayer onAction={onInput} />
            <Hud
              onPause={() => {
                game.pause();
                setScreen('paused');
              }}
              onSprint={() => onInput('sprint')}
            />
          </>
        )}
        {screen === 'menu' && (
          <MenuScreen onPlay={startRun} onShop={() => setScreen('shop')} onLeaderboard={() => setScreen('leaderboard')} />
        )}
        {screen === 'shop' && <ShopScreen onClose={() => setScreen('menu')} />}
        {screen === 'leaderboard' && <LeaderboardScreen onClose={() => setScreen('menu')} />}
        {screen === 'paused' && (
          <PauseScreen
            onResume={() => {
              game.resume();
              setScreen('playing');
            }}
            onQuit={finishRun}
          />
        )}
        {screen === 'continue' && <ContinueScreen distance={game.distance} onWatchAd={watchAdToContinue} onDecline={finishRun} />}
        {screen === 'gameover' && result && (
          <GameOverScreen
            distance={result.distance}
            coins={result.coins}
            rank={result.rank}
            canDouble={!result.doubled}
            onDouble={doubleCoins}
            onRetry={startRun}
            onMenu={toMenu}
          />
        )}
        <MockAdOverlay onVisibleChange={onAdVisible} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06031a' },
});
