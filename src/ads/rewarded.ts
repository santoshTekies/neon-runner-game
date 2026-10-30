/**
 * Rewarded-ad facade. The game only calls `showRewardedAd()` and awaits whether
 * the player earned the reward.
 *
 * Right now this is backed by <MockAdOverlay/> so the flow works in Expo Go.
 * To ship real ads, install `react-native-google-mobile-ads` (needs a development
 * build, not Expo Go), then register a handler that loads a RewardedAd, shows it
 * and resolves `true` on the EARNED_REWARD event.
 */
type RewardedAdHandler = () => Promise<boolean>;

let handler: RewardedAdHandler | null = null;

export function registerRewardedAdHandler(h: RewardedAdHandler | null) {
  handler = h;
}

export async function showRewardedAd(): Promise<boolean> {
  if (!handler) return false;
  try {
    return await handler();
  } catch (e) {
    console.warn('Rewarded ad failed', e);
    return false;
  }
}
