import {
  ACCEL_PER_METER,
  COIN_VALUE,
  DESPAWN_Z,
  ENERGY_SPAWN_CHANCE,
  ENERGY_TO_SPRINT,
  GRAVITY,
  HIT_INVULNERABLE_TIME,
  IDLE_SPEED,
  JUMP_VELOCITY,
  LANE_SWITCH_RATE,
  LANES,
  MAGNET_RANGE,
  MAX_SPEED,
  OBSTACLE_SHAPES,
  ObstacleType,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SLIDE_HEIGHT,
  PowerUpType,
  SLIDE_TIME,
  SPAWN_Z,
  SPRINT_DISTANCE,
  SPRINT_GRACE_TIME,
  SPRINT_SPEED_MULTIPLIER,
  START_LIVES,
  START_SPEED,
  powerUpDuration,
} from './config';

export type GameStatus = 'idle' | 'running' | 'paused' | 'dead';
export type InputAction = 'left' | 'right' | 'jump' | 'slide' | 'sprint';
export type GameEvent =
  | 'jump'
  | 'slide'
  | 'swoosh'
  | 'coin'
  | 'powerup'
  | 'energy'
  | 'energyFull'
  | 'sprint'
  | 'smash'
  | 'hit'
  | 'shield'
  | 'death';

export interface Obstacle {
  active: boolean;
  lane: number;
  z: number;
  prevZ: number;
  /** Seconds since the player crashed into it; -1 if untouched. */
  hitT: number;
}

export interface Coin {
  active: boolean;
  x: number;
  y: number;
  z: number;
  prevZ: number;
  magnetized: boolean;
}

export interface PowerUp {
  active: boolean;
  type: PowerUpType;
  x: number;
  z: number;
  prevZ: number;
}

export interface EnergyCell {
  active: boolean;
  x: number;
  z: number;
  prevZ: number;
}

export type Upgrades = Record<PowerUpType, number>;

const OBSTACLE_TYPES: ObstacleType[] = ['hurdle', 'barrier', 'block'];
const POWERUP_TYPES: PowerUpType[] = ['magnet', 'shield', 'multiplier'];
const POOL_SIZE = { obstacle: 28, coin: 90, powerUp: 4, energy: 4 };

const makePool = <T>(n: number, make: () => T): T[] => Array.from({ length: n }, make);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

export class GameEngine {
  status: GameStatus = 'idle';
  speed = IDLE_SPEED;
  /** Speed before the sprint boost; drives difficulty. */
  baseSpeed = START_SPEED;
  /** Meters run this game. */
  distance = 0;
  /** Total world scroll, keeps moving in menus for decor animation. */
  scroll = 0;
  coins = 0;
  lives = START_LIVES;
  continuesUsed = 0;
  shake = 0;
  /** Collected energy cells; a full meter is a saved sprint the player can trigger. */
  energy = 0;
  /** Meters of sprint left; > 0 while sprinting. */
  sprintLeft = 0;

  player = { lane: 1, x: 0, y: 0, vy: 0, slideTimer: 0, slideQueued: false, invulnerable: 0, runPhase: 0 };
  powerUps: Record<PowerUpType, number> = { magnet: 0, shield: 0, multiplier: 0 };
  powerUpDurations: Record<PowerUpType, number> = { magnet: 6, shield: 6, multiplier: 6 };

  obstacles: Record<ObstacleType, Obstacle[]> = {
    hurdle: makePool(POOL_SIZE.obstacle, () => ({ active: false, lane: 0, z: 0, prevZ: 0, hitT: -1 })),
    barrier: makePool(POOL_SIZE.obstacle, () => ({ active: false, lane: 0, z: 0, prevZ: 0, hitT: -1 })),
    block: makePool(POOL_SIZE.obstacle, () => ({ active: false, lane: 0, z: 0, prevZ: 0, hitT: -1 })),
  };
  coinPool: Coin[] = makePool(POOL_SIZE.coin, () => ({ active: false, x: 0, y: 0, z: 0, prevZ: 0, magnetized: false }));
  powerUpPool: PowerUp[] = makePool(POOL_SIZE.powerUp, () => ({ active: false, type: 'magnet' as PowerUpType, x: 0, z: 0, prevZ: 0 }));
  energyPool: EnergyCell[] = makePool(POOL_SIZE.energy, () => ({ active: false, x: 0, z: 0, prevZ: 0 }));

  private lastRowZ = 0;
  private listeners = new Set<(e: GameEvent) => void>();

  on(listener: (e: GameEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(e: GameEvent) {
    this.listeners.forEach((l) => l(e));
  }

  get difficulty() {
    return Math.min(1, Math.max(0, (this.baseSpeed - START_SPEED) / (MAX_SPEED - START_SPEED)));
  }

  get playerHeight() {
    return this.player.slideTimer > 0 ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT;
  }

  get grounded() {
    return this.player.y <= 0.0001;
  }

  get sprinting() {
    return this.sprintLeft > 0;
  }

  get sprintReady() {
    return this.energy >= ENERGY_TO_SPRINT && !this.sprinting;
  }

  start(upgrades: Upgrades) {
    this.clearEntities();
    this.status = 'running';
    this.speed = START_SPEED;
    this.baseSpeed = START_SPEED;
    this.distance = 0;
    this.coins = 0;
    this.lives = START_LIVES;
    this.continuesUsed = 0;
    this.shake = 0;
    this.energy = 0;
    this.sprintLeft = 0;
    Object.assign(this.player, { lane: 1, x: 0, y: 0, vy: 0, slideTimer: 0, slideQueued: false, invulnerable: 0 });
    for (const t of POWERUP_TYPES) {
      this.powerUps[t] = 0;
      this.powerUpDurations[t] = powerUpDuration(upgrades[t]);
    }
    // Pre-fill the track ahead; first row appears a little in front of the player.
    this.lastRowZ = -45 + this.rowGap();
    this.spawnRows();
  }

  /** Back to the menu attract mode. */
  toIdle() {
    this.clearEntities();
    this.status = 'idle';
    this.speed = IDLE_SPEED;
    this.energy = 0;
    this.sprintLeft = 0;
    Object.assign(this.player, { lane: 1, y: 0, vy: 0, slideTimer: 0, invulnerable: 0 });
    for (const t of POWERUP_TYPES) this.powerUps[t] = 0;
  }

  pause() {
    if (this.status === 'running') this.status = 'paused';
  }

  resume() {
    if (this.status === 'paused') this.status = 'running';
  }

  /** Continue after death (e.g. after a rewarded ad). */
  revive() {
    if (this.status !== 'dead') return;
    this.continuesUsed++;
    this.lives = 1;
    this.player.invulnerable = 2.5;
    // Clear anything right in front of the player.
    for (const type of OBSTACLE_TYPES) {
      for (const o of this.obstacles[type]) if (o.active && o.z > -35) o.active = false;
    }
    this.status = 'running';
  }

  input(action: InputAction) {
    if (this.status !== 'running') return;
    const p = this.player;
    switch (action) {
      case 'left':
        if (p.lane > 0) {
          p.lane--;
          this.emit('swoosh');
        }
        break;
      case 'right':
        if (p.lane < LANES.length - 1) {
          p.lane++;
          this.emit('swoosh');
        }
        break;
      case 'jump':
        if (this.grounded) {
          p.slideTimer = 0;
          p.slideQueued = false;
          p.vy = JUMP_VELOCITY;
          this.emit('jump');
        }
        break;
      case 'slide':
        if (this.grounded) {
          p.slideTimer = SLIDE_TIME;
        } else {
          // Slam down and slide on landing.
          p.vy = Math.min(p.vy, -JUMP_VELOCITY * 1.3);
          p.slideQueued = true;
        }
        this.emit('slide');
        break;
      case 'sprint':
        if (this.sprintReady) {
          this.energy = 0;
          this.sprintLeft = SPRINT_DISTANCE;
          this.emit('sprint');
        }
        break;
    }
  }

  update(rawDt: number) {
    const dt = Math.min(rawDt, 1 / 20);
    this.shake = Math.max(0, this.shake - dt * 1.5);

    if (this.status === 'idle') {
      this.speed = IDLE_SPEED;
      this.scroll += this.speed * dt;
      this.player.runPhase += dt * 9;
      this.player.x = lerp(this.player.x, 0, Math.min(1, dt * 5));
      return;
    }
    if (this.status !== 'running') return;

    this.baseSpeed = Math.min(MAX_SPEED, START_SPEED + this.distance * ACCEL_PER_METER);
    this.speed = this.sprinting ? this.baseSpeed * SPRINT_SPEED_MULTIPLIER : this.baseSpeed;
    const move = this.speed * dt;
    this.distance += move;
    this.scroll += move;

    if (this.sprinting) {
      this.sprintLeft = Math.max(0, this.sprintLeft - move);
      if (!this.sprinting) this.player.invulnerable = Math.max(this.player.invulnerable, SPRINT_GRACE_TIME);
    }

    this.updatePlayer(dt);
    for (const t of POWERUP_TYPES) this.powerUps[t] = Math.max(0, this.powerUps[t] - dt);

    this.updateObstacles(dt, move);
    if (this.status !== 'running') return;
    this.updateCoins(dt, move);
    this.updatePowerUps(move);
    this.updateEnergy(move);

    this.lastRowZ += move;
    this.spawnRows();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    p.x = lerp(p.x, LANES[p.lane], Math.min(1, dt * LANE_SWITCH_RATE));
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.runPhase += dt * (6 + this.speed * 0.35);

    if (!this.grounded || p.vy > 0) {
      p.vy -= GRAVITY * dt;
      p.y = Math.max(0, p.y + p.vy * dt);
      if (p.y === 0) {
        p.vy = 0;
        if (p.slideQueued) {
          p.slideQueued = false;
          p.slideTimer = SLIDE_TIME;
        }
      }
    }
    p.slideTimer = Math.max(0, p.slideTimer - dt);
  }

  private updateObstacles(dt: number, move: number) {
    const p = this.player;
    const h = this.playerHeight;
    for (const type of OBSTACLE_TYPES) {
      const shape = OBSTACLE_SHAPES[type];
      for (const o of this.obstacles[type]) {
        if (!o.active) continue;
        o.prevZ = o.z;
        o.z += move;
        if (o.hitT >= 0) o.hitT += dt;
        if (o.z > DESPAWN_Z) {
          o.active = false;
          continue;
        }
        if (o.hitT >= 0) continue;

        const hitX = Math.abs(p.x - LANES[o.lane]) < PLAYER_HALF_WIDTH + shape.halfWidth;
        const hitY = p.y < shape.maxY && p.y + h > shape.minY;
        const hitZ = o.prevZ - shape.halfDepth < PLAYER_HALF_WIDTH && o.z + shape.halfDepth > -PLAYER_HALF_WIDTH;
        if (hitX && hitY && hitZ) {
          o.hitT = 0;
          this.onCrash();
          if (this.status !== 'running') return;
        }
      }
    }
  }

  private onCrash() {
    if (this.sprinting) {
      // Sprinting smashes straight through.
      this.shake = Math.max(this.shake, 0.2);
      this.emit('smash');
      return;
    }
    if (this.player.invulnerable > 0) return;
    if (this.powerUps.shield > 0) {
      this.powerUps.shield = 0;
      this.player.invulnerable = 0.6;
      this.shake = 0.25;
      this.emit('shield');
      return;
    }
    this.lives--;
    this.player.invulnerable = HIT_INVULNERABLE_TIME;
    this.shake = 0.6;
    this.emit('hit');
    if (this.lives <= 0) {
      this.status = 'dead';
      this.emit('death');
    }
  }

  private updateCoins(dt: number, move: number) {
    const p = this.player;
    const h = this.playerHeight;
    const magnet = this.powerUps.magnet > 0;
    for (const c of this.coinPool) {
      if (!c.active) continue;
      c.prevZ = c.z;
      c.z += move;
      if (magnet && c.z > -MAGNET_RANGE && c.z < 1) c.magnetized = true;
      if (c.magnetized) {
        const k = Math.min(1, dt * 14);
        c.x = lerp(c.x, p.x, k);
        c.y = lerp(c.y, p.y + 1, k);
        c.z = lerp(c.z, 0, k);
      }
      if (c.z > DESPAWN_Z) {
        c.active = false;
        continue;
      }
      const near =
        Math.abs(p.x - c.x) < 0.85 &&
        c.y > p.y - 0.3 &&
        c.y < p.y + h + 0.3 &&
        Math.min(c.prevZ, c.z) < 0.6 &&
        Math.max(c.prevZ, c.z) > -0.6;
      if (near) {
        c.active = false;
        this.coins += COIN_VALUE * (this.powerUps.multiplier > 0 ? 2 : 1);
        this.emit('coin');
      }
    }
  }

  private updatePowerUps(move: number) {
    const p = this.player;
    for (const u of this.powerUpPool) {
      if (!u.active) continue;
      u.prevZ = u.z;
      u.z += move;
      if (u.z > DESPAWN_Z) {
        u.active = false;
        continue;
      }
      const near = Math.abs(p.x - u.x) < 0.9 && p.y < 2 && Math.min(u.prevZ, u.z) < 0.7 && Math.max(u.prevZ, u.z) > -0.7;
      if (near) {
        u.active = false;
        this.powerUps[u.type] = this.powerUpDurations[u.type];
        this.emit('powerup');
      }
    }
  }

  private updateEnergy(move: number) {
    const p = this.player;
    for (const e of this.energyPool) {
      if (!e.active) continue;
      e.prevZ = e.z;
      e.z += move;
      if (e.z > DESPAWN_Z) {
        e.active = false;
        continue;
      }
      const near = Math.abs(p.x - e.x) < 0.9 && p.y < 2 && Math.min(e.prevZ, e.z) < 0.7 && Math.max(e.prevZ, e.z) > -0.7;
      if (near) {
        e.active = false;
        this.energy = Math.min(ENERGY_TO_SPRINT, this.energy + 1);
        this.emit(this.energy >= ENERGY_TO_SPRINT ? 'energyFull' : 'energy');
      }
    }
  }

  // ---------- spawning ----------

  private rowGap() {
    return lerp(24, 14, this.difficulty) + Math.random() * 4;
  }

  private spawnRows() {
    let gap = this.rowGap();
    while (this.lastRowZ - gap > SPAWN_Z) {
      this.lastRowZ -= gap;
      this.spawnRow(this.lastRowZ, gap);
      gap = this.rowGap();
    }
  }

  private spawnRow(z: number, gap: number) {
    const d = this.difficulty;
    const r = Math.random();
    const count = r < 0.5 - d * 0.25 ? 1 : r < 0.92 - d * 0.1 ? 2 : 3;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, count);

    const types: (ObstacleType | null)[] = [null, null, null];
    let blocks = 0;
    const maxBlocks = count === 3 ? 1 : 2;
    for (const lane of lanes) {
      let type = rand(OBSTACLE_TYPES);
      if (type === 'block' && blocks >= maxBlocks) type = Math.random() < 0.5 ? 'hurdle' : 'barrier';
      if (type === 'block') blocks++;
      types[lane] = type;
      this.spawnObstacle(type, lane, z);
    }

    // Pickups go in a lane the player can actually use.
    const openLanes = [0, 1, 2].filter((l) => types[l] !== 'block');
    const lane = rand(openLanes.length ? openLanes : [0, 1, 2]);
    // No energy during a sprint or with a full meter, and at most one cell on screen at a time.
    const wantsEnergy = !this.sprinting && this.energy < ENERGY_TO_SPRINT;
    if (wantsEnergy && !this.energyPool.some((e) => e.active) && Math.random() < ENERGY_SPAWN_CHANCE) {
      this.spawnEnergy(lane, z + gap * 0.5);
      return;
    }
    const anyPowerUpActive = this.powerUpPool.some((u) => u.active);
    if (!anyPowerUpActive && Math.random() < 0.08) {
      this.spawnPowerUp(rand(POWERUP_TYPES), lane, z + gap * 0.5);
      return;
    }
    if (Math.random() < 0.15) return;

    if (types[lane] === 'hurdle' && Math.random() < 0.6) {
      // Arc of coins over the hurdle.
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        this.spawnCoin(LANES[lane], 0.9 + Math.sin(t * Math.PI) * 1.4, z + 4.5 - t * 9);
      }
    } else {
      const n = 5;
      for (let i = 0; i < n; i++) {
        this.spawnCoin(LANES[lane], 1, z + gap * (0.25 + (0.5 * i) / (n - 1)));
      }
    }
  }

  private spawnObstacle(type: ObstacleType, lane: number, z: number) {
    const o = this.obstacles[type].find((x) => !x.active);
    if (!o) return;
    Object.assign(o, { active: true, lane, z, prevZ: z, hitT: -1 });
  }

  private spawnCoin(x: number, y: number, z: number) {
    const c = this.coinPool.find((x) => !x.active);
    if (!c) return;
    Object.assign(c, { active: true, x, y, z, prevZ: z, magnetized: false });
  }

  private spawnPowerUp(type: PowerUpType, lane: number, z: number) {
    const u = this.powerUpPool.find((x) => !x.active);
    if (!u) return;
    Object.assign(u, { active: true, type, x: LANES[lane], z, prevZ: z });
  }

  private spawnEnergy(lane: number, z: number) {
    const e = this.energyPool.find((x) => !x.active);
    if (!e) return;
    Object.assign(e, { active: true, x: LANES[lane], z, prevZ: z });
  }

  private clearEntities() {
    for (const type of OBSTACLE_TYPES) for (const o of this.obstacles[type]) o.active = false;
    for (const c of this.coinPool) c.active = false;
    for (const u of this.powerUpPool) u.active = false;
    for (const e of this.energyPool) e.active = false;
  }
}

export const game = new GameEngine();
