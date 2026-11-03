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

export type VictoryMethod = 'countdown' | 'flare';
export type DeathCause = 'starvation' | 'dehydration' | 'radiation';

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
  farmCount: number;
  farmTimerSec: number; // Counts 0 -> 60s for automatic Canned Food generation
}

export type NodeKind =
  | 'building'
  | 'vehicle'
  | 'scrap'
  | 'timber'
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
  rotationY: number;
  scale: number;
  variant: number;
  cooldownRemaining: number;
  cooldownDuration: number;
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

export const INITIAL_DAYS = 500;
export const SECONDS_PER_DAY = 60;
export const HIGH_ALTITUDE_THRESHOLD = 6.0;
