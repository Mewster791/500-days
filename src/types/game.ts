export enum Difficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
}

export enum GamePhase {
  Menu = 'menu',
  Playing = 'playing',
  Victory = 'victory',
  GameOver = 'gameover',
}

export enum WeatherType {
  Clear = 'clear',
  AcidRain = 'acid_rain',
  AshStorm = 'ash_storm',
  Heatwave = 'heatwave',
}

export interface WeatherInfo {
  id: WeatherType;
  label: string;
  effectsSummary: string;
  moveSpeedMult: number;
  frictionMult: number;
  windForceX: number;
  windForceZ: number;
  thirstDecayMult: number;
  farmSpeedMult: number;
  cooldownRecoveryMult: number;
  blocksFlare: boolean;
}

export const WEATHER_CATALOG: Record<WeatherType, WeatherInfo> = {
  [WeatherType.Clear]: {
    id: WeatherType.Clear,
    label: 'Clear Nuclear Haze',
    effectsSummary: 'Clear visibility · Normal vitals & crop growth',
    moveSpeedMult: 1.0,
    frictionMult: 1.0,
    windForceX: 0,
    windForceZ: 0,
    thirstDecayMult: 1.0,
    farmSpeedMult: 1.0,
    cooldownRecoveryMult: 1.0,
    blocksFlare: false,
  },
  [WeatherType.AcidRain]: {
    id: WeatherType.AcidRain,
    label: 'Acid Rain',
    effectsSummary:
      'Slick ground · Unsheltered corrosion (-HP) · Purifiers catch Dirty Water',
    moveSpeedMult: 0.93,
    frictionMult: 0.58,
    windForceX: -1.1,
    windForceZ: 0.4,
    thirstDecayMult: 0.85,
    farmSpeedMult: 1.15,
    cooldownRecoveryMult: 1.0,
    blocksFlare: false,
  },
  [WeatherType.AshStorm]: {
    id: WeatherType.AshStorm,
    label: 'Heavy Ash Storm',
    effectsSummary:
      'Strong crosswind & -25% speed · 2x Debris Uncover · Blocks Signal Flare',
    moveSpeedMult: 0.75,
    frictionMult: 0.9,
    windForceX: 5.4,
    windForceZ: 2.5,
    thirstDecayMult: 1.1,
    farmSpeedMult: 0.75,
    cooldownRecoveryMult: 2.0,
    blocksFlare: true,
  },
  [WeatherType.Heatwave]: {
    id: WeatherType.Heatwave,
    label: 'Rad Heatwave',
    effectsSummary: '1.75x Thirst Decay · 1.5x Hydroponic Farm Speed',
    moveSpeedMult: 1.0,
    frictionMult: 1.08,
    windForceX: 0,
    windForceZ: 0,
    thirstDecayMult: 1.75,
    farmSpeedMult: 1.5,
    cooldownRecoveryMult: 1.0,
    blocksFlare: false,
  },
};

export type VictoryMethod = 'countdown' | 'flare';
export type DeathCause =
  | 'starvation'
  | 'dehydration'
  | 'radiation'
  | 'acid_rain'
  | 'fall_impact';

export interface Inventory {
  scrapMetal: number;
  wood: number;
  cannedFood: number;
  dirtyWater: number;
  cleanWater: number;
  chemicals: number;
  signalFlare: boolean;
}

export interface BaseStructures {
  shelter: boolean;
  purifierCount: number;
  purifierAutoTimerSec: number;
  farmCount: number;
  farmTimerSec: number;
}

export type NodeKind =
  | 'building'
  | 'vehicle'
  | 'scrap'
  | 'timber'
  | 'terminal'
  | 'shelter'
  | 'purifier'
  | 'farm'
  | 'spire_pad';

export interface WorldNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  z: number;
  interactRadius: number;
  colliderRadius: number;
  boxHalfW?: number;
  boxHalfD?: number;
  rotationY: number;
  scale: number;
  variant: number;
  cooldownRemaining: number;
  cooldownDuration: number;
  loreId?: string;
}

export interface HazardZone {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface NearbyPrompt {
  nodeId: string;
  kind: NodeKind;
  label: string;
  actionHint: string;
  onCooldown: boolean;
  cooldownSec: number;
}

export interface ToastNotice {
  id: number;
  message: string;
  tone: 'neutral' | 'positive' | 'rare' | 'warning';
}

export interface TeleportCommand {
  nonce: number;
  x: number;
  z: number;
}

export interface LoreLog {
  id: string;
  code: string;
  title: string;
  author: string;
  dateStamp: string;
  location: string;
  body: string;
}

export interface PlayerHudTelemetry {
  x: number;
  y: number;
  z: number;
  yaw: number;
  stamina: number;
}

export const INITIAL_DAYS = 500;
export const SECONDS_PER_DAY = 60;
export const HIGH_ALTITUDE_THRESHOLD = 6.0;
