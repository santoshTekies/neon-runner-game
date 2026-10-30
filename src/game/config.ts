export const LANE_WIDTH = 2.2;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH] as const;
export const TRACK_HALF_WIDTH = LANE_WIDTH * 1.5 + 0.2;

export const START_SPEED = 14; // m/s
export const MAX_SPEED = 42;
export const ACCEL_PER_METER = 0.01;
export const IDLE_SPEED = 8;

export const GRAVITY = 34;
export const JUMP_VELOCITY = 11.5;
export const SLIDE_TIME = 0.65;
export const LANE_SWITCH_RATE = 16;

export const PLAYER_HALF_WIDTH = 0.35;
export const PLAYER_HEIGHT = 1.7;
export const PLAYER_SLIDE_HEIGHT = 0.75;

export const START_LIVES = 3;
export const HIT_INVULNERABLE_TIME = 1.6;
export const MAX_CONTINUES = 2;

export const SPAWN_Z = -150;
export const DESPAWN_Z = 10;

export const ENERGY_TO_SPRINT = 3;
export const ENERGY_SPAWN_CHANCE = 0.12; // per obstacle row
export const SPRINT_DISTANCE = 250; // meters
export const SPRINT_SPEED_MULTIPLIER = 1.6;
/** Invulnerability after a sprint ends so the player isn't dropped straight into an obstacle. */
export const SPRINT_GRACE_TIME = 1.2;

export const COIN_VALUE = 1;
export const MAGNET_RANGE = 14;

export const POWERUP_BASE_DURATION = 6;
export const POWERUP_DURATION_PER_LEVEL = 2;
export const MAX_UPGRADE_LEVEL = 5;

export const COLORS = {
  background: '#06031a',
  floor: '#0d0a2a',
  laneLine: '#3b2a8f',
  trackEdge: '#22e6ff',
  hurdle: '#ff2bd6',
  barrier: '#ff8a1f',
  block: '#b026ff',
  coin: '#ffd23f',
  magnet: '#ff4d6d',
  shield: '#3df5ff',
  multiplier: '#7dff5a',
  energy: '#3d8bff',
  sprint: '#9ef6ff',
  pillars: ['#ff2bd6', '#ff8a1f', '#22e6ff', '#ff4d6d', '#b026ff'],
};

export type ObstacleType = 'hurdle' | 'barrier' | 'block';
export type PowerUpType = 'magnet' | 'shield' | 'multiplier';

/** Collision boxes, relative to the obstacle's lane center at floor level. */
export const OBSTACLE_SHAPES: Record<ObstacleType, { halfWidth: number; minY: number; maxY: number; halfDepth: number }> = {
  hurdle: { halfWidth: 0.95, minY: 0, maxY: 0.9, halfDepth: 0.15 }, // jump over
  barrier: { halfWidth: 0.95, minY: 1.05, maxY: 1.65, halfDepth: 0.15 }, // slide under
  block: { halfWidth: 0.95, minY: 0, maxY: 2.4, halfDepth: 0.9 }, // change lane
};

export interface Skin {
  id: string;
  name: string;
  color: string;
  price: number;
}

export const SKINS: Skin[] = [
  { id: 'cyan', name: 'Volt', color: '#2ef2ff', price: 0 },
  { id: 'magenta', name: 'Pulse', color: '#ff3df0', price: 300 },
  { id: 'lime', name: 'Toxic', color: '#9dff3a', price: 800 },
  { id: 'orange', name: 'Blaze', color: '#ff8a1f', price: 1500 },
  { id: 'gold', name: 'Aurum', color: '#ffd23f', price: 3000 },
  { id: 'white', name: 'Ghost', color: '#f4f1ff', price: 5000 },
];

export const UPGRADE_INFO: Record<PowerUpType, { name: string; description: string; color: string }> = {
  magnet: { name: 'Magnet', description: 'Pulls in nearby coins', color: COLORS.magnet },
  shield: { name: 'Shield', description: 'Blocks one hit', color: COLORS.shield },
  multiplier: { name: '2x Coins', description: 'Doubles coin pickups', color: COLORS.multiplier },
};

export const upgradeCost = (level: number) => 250 * (level + 1);
export const powerUpDuration = (level: number) => POWERUP_BASE_DURATION + POWERUP_DURATION_PER_LEVEL * level;
