import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Flame,
  Droplets,
  Sprout,
  Home,
  Compass,
  AlertTriangle,
  CloudRain,
  Wind,
  Sun,
  Cloud,
  BookOpen,
} from 'lucide-react';
import {
  BaseStructures,
  Difficulty,
  HIGH_ALTITUDE_THRESHOLD,
  HazardZone,
  Inventory,
  NearbyPrompt,
  PlayerHudTelemetry,
  ToastNotice,
  WEATHER_CATALOG,
  WeatherType,
  WorldNode,
} from '../types/game';
import { BASE_CAMP_SPOTS, SPIRE_DECK } from '../utils/worldGen';

interface GameHUDProps {
  difficulty: Difficulty;
  weather: WeatherType;
  daysRemaining: number;
  dayProgress: number;
  health: number;
  hunger: number;
  thirst: number;
  telemetry: PlayerHudTelemetry;
  inRadiation: boolean;
  isAcidRainExposed: boolean;
  inventory: Inventory;
  flareUnlocked: boolean;
  structures: BaseStructures;
  hazards: HazardZone[];
  terminals: WorldNode[];
  discoveredLoreIds: string[];
  totalLoreCount: number;
  nearbyPrompt: NearbyPrompt | null;
  toasts: ToastNotice[];
  muted: boolean;
  onToggleMute: () => void;
  onOpenJournal: () => void;
  onConsumeFood: () => void;
  onConsumeWater: () => void;
  onBuildShelter: () => void;
  onBuildPurifier: () => void;
  onPurifyWater: () => void;
  onBuildFarm: () => void;
  onCraftFlare: () => void;
  onActivateFlare: () => void;
}

function formatSolarClock(dayProgress: number): string {
  // 0.0 -> 06:00 Dawn, 0.25 -> 12:00 Noon, 0.5 -> 18:00 Dusk, 0.75 -> 00:00 Midnight
  const totalMinutes = Math.floor(((dayProgress + 0.25) % 1) * 24 * 60);
  const hh = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const mm = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  difficulty,
  weather,
  daysRemaining,
  dayProgress,
  health,
  hunger,
  thirst,
  telemetry,
  inRadiation,
  isAcidRainExposed,
  inventory,
  flareUnlocked,
  structures,
  hazards,
  terminals,
  discoveredLoreIds,
  totalLoreCount,
  nearbyPrompt,
  toasts,
  muted,
  onToggleMute,
  onOpenJournal,
  onConsumeFood,
  onConsumeWater,
  onBuildShelter,
  onBuildPurifier,
  onPurifyWater,
  onBuildFarm,
  onCraftFlare,
  onActivateFlare,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isEasy = difficulty === Difficulty.Easy;
  const altitude = telemetry.y;
  const atHighAltitude = altitude >= HIGH_ALTITUDE_THRESHOLD;
  const weatherInfo = WEATHER_CATALOG[weather];

  const canBuildShelter =
    !structures.shelter &&
    inventory.wood >= 20 &&
    inventory.scrapMetal >= 10;

  const maxPurifiersReached = structures.purifierCount >= 2;
  const canBuildPurifier =
    structures.shelter &&
    !maxPurifiersReached &&
    inventory.scrapMetal >= 5;

  const canPurifyWater =
    structures.purifierCount > 0 && inventory.dirtyWater >= 1;

  const maxFarmsReached = structures.farmCount >= 3;
  const canBuildFarm =
    structures.shelter &&
    !maxFarmsReached &&
    inventory.wood >= 10 &&
    inventory.cannedFood >= 5;

  // Signal Flare option ONLY shows up once the player has had 100 scraps and 1 chemicals
  const showSignalFlareOption =
    flareUnlocked ||
    inventory.signalFlare ||
    (inventory.scrapMetal >= 100 && inventory.chemicals >= 1);

  const canCraftFlare =
    !inventory.signalFlare &&
    inventory.scrapMetal >= 100 &&
    inventory.chemicals >= 1;

  const WeatherIcon =
    weather === WeatherType.AcidRain
      ? CloudRain
      : weather === WeatherType.AshStorm
      ? Wind
      : weather === WeatherType.Heatwave
      ? Sun
      : Cloud;

  const weatherColorClass =
    weather === WeatherType.AcidRain
      ? 'text-lime-400'
      : weather === WeatherType.AshStorm
      ? 'text-stone-300'
      : weather === WeatherType.Heatwave
      ? 'text-orange-400'
      : 'text-amber-300';

  // Project world XZ onto compact 96x96 radar centered on player (range = 60m)
  const radarRange = 60;
  const toRadarXY = (wx: number, wz: number): [number, number] | null => {
    const dx = (wx - telemetry.x) / radarRange;
    const dz = (wz - telemetry.z) / radarRange;
    const dist = Math.hypot(dx, dz);
    if (dist > 1.0) {
      return [48 + (dx / dist) * 42, 48 + (dz / dist) * 42];
    }
    return [48 + dx * 42, 48 + dz * 42];
  };

  const baseRadar = toRadarXY(BASE_CAMP_SPOTS.shelter.x, BASE_CAMP_SPOTS.shelter.z);
  const spireRadar = toRadarXY(SPIRE_DECK.padX, SPIRE_DECK.padZ);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* TOP BAR: Day Countdown + Weather Status + Inventory Slots */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-stone-950/92 border-b border-stone-800">
        {/* Countdown Clock, Solar Time, Weather & Altitude */}
        <div className="flex flex-wrap items-center gap-5 shrink-0">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tight text-amber-400 font-mono tabular-nums">
                {daysRemaining}
              </span>
              <span className="text-xs font-semibold text-stone-300 whitespace-nowrap">
                Days Left
              </span>
              <span className="text-xs font-mono tabular-nums text-stone-400">
                · {formatSolarClock(dayProgress)}
              </span>
            </div>
            <div className="w-40 h-1.5 bg-stone-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-amber-500 transition-none"
                style={{
                  transform: `scaleX(${Math.max(0.02, dayProgress)})`,
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>

          <div className="hidden xl:flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs font-medium">
              <WeatherIcon className={`w-3.5 h-3.5 shrink-0 ${weatherColorClass}`} />
              <span className={weatherColorClass}>{weatherInfo.label}</span>
              <span className="text-stone-600" aria-hidden="true">
                ·
              </span>
              <Compass className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span
                className={`font-mono tabular-nums ${
                  atHighAltitude
                    ? 'text-amber-300 font-semibold'
                    : 'text-stone-300'
                }`}
              >
                Alt {altitude.toFixed(1)}m
              </span>
              <span className="text-stone-600" aria-hidden="true">
                ·
              </span>
              <span className="text-stone-400 capitalize">{difficulty}</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {weatherInfo.effectsSummary}
            </div>
          </div>
        </div>

        {/* Inventory Slots & Journal */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-md text-xs">
            <span className="text-stone-400">Scrap </span>
            <span className="font-mono font-semibold text-stone-100 tabular-nums">
              {inventory.scrapMetal}
            </span>
          </div>

          <div className="px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-md text-xs">
            <span className="text-stone-400">Wood </span>
            <span className="font-mono font-semibold text-stone-100 tabular-nums">
              {inventory.wood}
            </span>
          </div>

          <button
            type="button"
            onClick={onConsumeFood}
            disabled={inventory.cannedFood <= 0}
            title="Click or press [1] to Eat Canned Food (+20 Hunger)"
            className={`px-2.5 py-1.5 rounded-md text-xs border transition-colors whitespace-nowrap shrink-0 ${
              inventory.cannedFood > 0
                ? 'bg-stone-900 border-amber-600/60 hover:bg-stone-800 text-stone-100 cursor-pointer'
                : 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span className="text-amber-300/90">[1] Food </span>
            <span className="font-mono font-semibold tabular-nums">
              {inventory.cannedFood}
            </span>
          </button>

          <div className="px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-md text-xs">
            <span className="text-stone-400">Dirty H₂O </span>
            <span className="font-mono font-semibold text-stone-100 tabular-nums">
              {inventory.dirtyWater}
            </span>
          </div>

          <button
            type="button"
            onClick={onConsumeWater}
            disabled={inventory.cleanWater <= 0}
            title="Click or press [2] to Drink Clean Water (+25 Thirst)"
            className={`px-2.5 py-1.5 rounded-md text-xs border transition-colors whitespace-nowrap shrink-0 ${
              inventory.cleanWater > 0
                ? 'bg-stone-900 border-sky-600/60 hover:bg-stone-800 text-stone-100 cursor-pointer'
                : 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span className="text-sky-300/90">[2] Clean H₂O </span>
            <span className="font-mono font-semibold tabular-nums">
              {inventory.cleanWater}
            </span>
          </button>

          <div
            className={`px-2.5 py-1.5 rounded-md text-xs border ${
              inventory.chemicals > 0
                ? 'bg-lime-950/60 border-lime-500/60 text-lime-200'
                : 'bg-stone-900 border-stone-800 text-stone-400'
            }`}
          >
            <span>Chemicals </span>
            <span className="font-mono font-semibold tabular-nums">
              {inventory.chemicals}
            </span>
          </div>

          {inventory.signalFlare && (
            <button
              type="button"
              onClick={onActivateFlare}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                weatherInfo.blocksFlare
                  ? 'bg-stone-800 border-stone-600 text-stone-300'
                  : atHighAltitude
                  ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white'
                  : 'bg-red-950/80 hover:bg-red-900/80 border-red-700/70 text-red-200'
              }`}
            >
              {weatherInfo.blocksFlare
                ? 'Flare Blocked by Ash Storm'
                : atHighAltitude
                ? 'Fire Signal Flare!'
                : 'Flare Ready (Climb NE Spire)'}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenJournal}
            title="Open Sector 09 Field Journal [J]"
            className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-md text-xs font-medium text-stone-200 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>[J] Logs</span>
            <span className="font-mono tabular-nums text-amber-300">
              {discoveredLoreIds.length}/{totalLoreCount}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-md text-stone-300 cursor-pointer transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* CENTER-BOTTOM INTERACTION PROMPT & TOASTS */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-md w-full px-4">
        {inRadiation && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-950/95 border border-lime-500 text-lime-200 text-xs font-semibold shadow-lg">
            <AlertTriangle className="w-4 h-4 text-lime-400 shrink-0" />
            <span>Radiation Hazard — Leave the fallout crater immediately!</span>
          </div>
        )}

        {isAcidRainExposed && !inRadiation && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-950/95 border border-lime-600/80 text-lime-200 text-xs font-medium shadow-lg">
            <CloudRain className="w-4 h-4 text-lime-400 shrink-0" />
            <span>
              Acid Rain Exposure — Stay near your Shelter for overhead cover
            </span>
          </div>
        )}

        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium border shadow-md ${
              t.tone === 'rare'
                ? 'bg-lime-950/95 border-lime-400 text-lime-200'
                : t.tone === 'warning'
                ? 'bg-red-950/95 border-red-500/80 text-red-200'
                : t.tone === 'positive'
                ? 'bg-stone-900/95 border-amber-500/60 text-amber-200'
                : 'bg-stone-900/95 border-stone-700 text-stone-200'
            }`}
          >
            {t.message}
          </div>
        ))}

        {nearbyPrompt && (
          <div className="px-4 py-2.5 rounded-lg bg-stone-950/95 border border-stone-700 text-center shadow-xl">
            <div className="text-xs font-semibold text-stone-100">
              {nearbyPrompt.label}
            </div>
            <div
              className={`text-xs mt-0.5 ${
                nearbyPrompt.onCooldown ? 'text-stone-400' : 'text-amber-400'
              }`}
            >
              {nearbyPrompt.actionHint}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM-LEFT CORNER: Status Bars + Tactical Sector Radar */}
      <div className="pointer-events-auto fixed bottom-5 left-5 flex items-end gap-3">
        <div className="w-68 bg-stone-950/92 border border-stone-800 rounded-xl p-4 shadow-xl space-y-2.5">
          {/* Health (Red) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-200">Health</span>
              <span className="font-mono tabular-nums text-red-400 font-semibold">
                {Math.ceil(health)} / 100
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-transform duration-150"
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(1, health / 100))})`,
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>

          {/* Hunger (Yellow) - Grayed out in Easy Mode */}
          <div
            className={`space-y-1 ${
              isEasy ? 'opacity-40 grayscale select-none' : ''
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-200">Hunger</span>
              <span className="font-mono tabular-nums text-amber-300 font-semibold">
                {isEasy ? '100 · Locked' : `${Math.ceil(hunger)} / 100`}
              </span>
            </div>
            <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-transform duration-150"
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(1, hunger / 100))})`,
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>

          {/* Thirst (Blue) - Grayed out in Easy Mode */}
          <div
            className={`space-y-1 ${
              isEasy ? 'opacity-40 grayscale select-none' : ''
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-200">
                Thirst
                {!isEasy && weather === WeatherType.Heatwave ? ' (1.75x)' : ''}
              </span>
              <span className="font-mono tabular-nums text-sky-400 font-semibold">
                {isEasy ? '100 · Locked' : `${Math.ceil(thirst)} / 100`}
              </span>
            </div>
            <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-transform duration-150"
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(1, thirst / 100))})`,
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>

          {/* Sprint Stamina */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-stone-400">
                Stamina (Shift)
              </span>
              <span className="font-mono tabular-nums text-stone-300">
                {Math.round(telemetry.stamina)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-transform duration-100"
                style={{
                  transform: `scaleX(${Math.max(
                    0,
                    Math.min(1, telemetry.stamina / 100)
                  )})`,
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>

          <div className="pt-1 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-center justify-between">
            <span>WASD · Space: Jump</span>
            <span>E: Scavenge</span>
          </div>
        </div>

        {/* Compact Tactical Sector Radar */}
        <div className="hidden sm:flex flex-col items-center bg-stone-950/92 border border-stone-800 rounded-xl p-2.5 shadow-xl">
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            className="rounded-full bg-stone-900/90 border border-stone-800"
            aria-label="Sector 09 Tactical Radar"
          >
            {/* Crosshairs & Range Ring */}
            <circle
              cx="48"
              cy="48"
              r="28"
              fill="none"
              stroke="rgba(120,113,108,0.2)"
              strokeWidth="1"
            />
            <line
              x1="48"
              y1="4"
              x2="48"
              y2="92"
              stroke="rgba(120,113,108,0.2)"
              strokeWidth="1"
            />
            <line
              x1="4"
              y1="48"
              x2="92"
              y2="48"
              stroke="rgba(120,113,108,0.2)"
              strokeWidth="1"
            />

            {/* Fallout Craters (Lime Rings) */}
            {hazards.map((hz) => {
              const pt = toRadarXY(hz.x, hz.z);
              if (!pt) return null;
              return (
                <circle
                  key={hz.id}
                  cx={pt[0]}
                  cy={pt[1]}
                  r="3"
                  fill="rgba(132,204,22,0.35)"
                  stroke="#84cc16"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Unread Civil Defense Lore Terminals (Cyan Pings) */}
            {terminals.map((term) => {
              if (term.loreId && discoveredLoreIds.includes(term.loreId)) {
                return null;
              }
              const pt = toRadarXY(term.x, term.z);
              if (!pt) return null;
              return (
                <rect
                  key={term.id}
                  x={pt[0] - 2}
                  y={pt[1] - 2}
                  width="4"
                  height="4"
                  fill="#38bdf8"
                />
              );
            })}

            {/* Base Camp Marker (Amber Square) */}
            {baseRadar && (
              <rect
                x={baseRadar[0] - 3}
                y={baseRadar[1] - 3}
                width="6"
                height="6"
                rx="1"
                fill="#f59e0b"
              />
            )}

            {/* North-East Overpass Spire Marker (Red/Amber Triangle) */}
            {spireRadar && (
              <polygon
                points={`${spireRadar[0]},${spireRadar[1] - 4} ${
                  spireRadar[0] - 3.5
                },${spireRadar[1] + 3} ${spireRadar[0] + 3.5},${
                  spireRadar[1] + 3
                }`}
                fill={showSignalFlareOption ? '#ef4444' : '#d6d3d1'}
              />
            )}

            {/* Player Center & Facing Tick */}
            <circle cx="48" cy="48" r="2.8" fill="#fafaf9" />
            <line
              x1="48"
              y1="48"
              x2={48 + Math.sin(telemetry.yaw) * 7}
              y2={48 + Math.cos(telemetry.yaw) * 7}
              stroke="#fafaf9"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <div className="mt-1.5 text-[10px] text-stone-400 flex items-center gap-2 font-mono">
            <span className="text-amber-400">■ Base</span>
            <span className="text-sky-400">■ Log</span>
            <span className="text-stone-300">▲ Spire</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: Crafting & Base Building Menu */}
      <div className="pointer-events-auto fixed top-20 right-4 flex items-start">
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="mt-2 px-2.5 py-2 bg-stone-950/95 hover:bg-stone-900 border border-stone-800 border-r-0 rounded-l-lg text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer shadow-lg"
          title={sidebarOpen ? 'Collapse Crafting Menu' : 'Open Crafting Menu'}
        >
          {sidebarOpen ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="whitespace-nowrap">Crafting</span>
            </>
          )}
        </button>

        {sidebarOpen && (
          <aside className="w-80 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-stone-950/95 border border-stone-800 rounded-b-xl rounded-tr-xl p-4 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <h2 className="font-display text-lg font-bold tracking-wide text-stone-100">
                Base & Crafting
              </h2>
              <span className="text-xs text-stone-400">
                {structures.shelter ? 'Self-Sustainment Active' : 'Build Shelter First'}
              </span>
            </div>

            {/* 1. Shelter */}
            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-stone-100">
                    Shelter
                  </span>
                </div>
                <span className="text-xs text-stone-400">
                  {structures.shelter ? 'Built' : 'Required'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Unlocks Purifier & Farm. Shields against Acid Rain and restores
                health when resting (E).
              </p>
              <div className="text-xs text-stone-300 font-mono tabular-nums">
                <span
                  className={
                    inventory.wood >= 20 ? 'text-lime-400' : 'text-stone-400'
                  }
                >
                  Wood {inventory.wood}/20
                </span>
                <span className="mx-1.5 text-stone-600">·</span>
                <span
                  className={
                    inventory.scrapMetal >= 10
                      ? 'text-lime-400'
                      : 'text-stone-400'
                  }
                >
                  Scrap {inventory.scrapMetal}/10
                </span>
              </div>
              <button
                type="button"
                onClick={onBuildShelter}
                disabled={!canBuildShelter}
                className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  structures.shelter
                    ? 'bg-stone-800 text-stone-400 cursor-default'
                    : canBuildShelter
                    ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer'
                    : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                }`}
              >
                {structures.shelter ? 'Shelter Constructed' : 'Build Shelter'}
              </button>
            </div>

            {/* 2. Water Purifier */}
            <div
              className={`p-3 bg-stone-900/90 border border-stone-800 rounded-lg space-y-2 ${
                !structures.shelter ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-sm font-semibold text-stone-100">
                    Water Purifier
                  </span>
                </div>
                <span className="text-xs text-stone-400 font-mono tabular-nums">
                  Built: {structures.purifierCount}/2
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Converts Dirty Water → Clean Water (+25 Thirst) instantly or
                auto-distills every 30s. Catches Acid Rain.
              </p>

              {structures.purifierCount > 0 && (
                <button
                  type="button"
                  onClick={onPurifyWater}
                  disabled={!canPurifyWater}
                  className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    canPurifyWater
                      ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                      : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  Purify Dirty Water ({inventory.dirtyWater} available)
                </button>
              )}

              {!maxPurifiersReached && (
                <>
                  <div className="text-xs font-mono tabular-nums">
                    <span
                      className={
                        inventory.scrapMetal >= 5
                          ? 'text-lime-400'
                          : 'text-stone-400'
                      }
                    >
                      Scrap {inventory.scrapMetal}/5
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onBuildPurifier}
                    disabled={!canBuildPurifier}
                    className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      canBuildPurifier
                        ? 'bg-stone-800 hover:bg-stone-700 border border-sky-500/50 text-sky-200 cursor-pointer'
                        : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {!structures.shelter
                      ? 'Requires Shelter'
                      : structures.purifierCount === 0
                      ? 'Build Water Purifier'
                      : 'Build 2nd Purifier'}
                  </button>
                </>
              )}
            </div>

            {/* 3. Hydroponic Farm */}
            <div
              className={`p-3 bg-stone-900/90 border border-stone-800 rounded-lg space-y-2 ${
                !structures.shelter ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-lime-400 shrink-0" />
                  <span className="text-sm font-semibold text-stone-100">
                    Hydroponic Farm
                  </span>
                </div>
                <span className="text-xs text-stone-400 font-mono tabular-nums">
                  Built: {structures.farmCount}/3
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Generates 1x Canned Food every 60s per dome (
                {weatherInfo.farmSpeedMult}x weather speed).
              </p>
              {structures.farmCount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-lime-300 font-mono tabular-nums">
                    <span>Next Harvest</span>
                    <span>
                      {Math.max(
                        0,
                        Math.ceil(
                          (60 - structures.farmTimerSec) /
                            weatherInfo.farmSpeedMult
                        )
                      )}
                      s
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-lime-500"
                      style={{
                        transform: `scaleX(${Math.min(
                          1,
                          structures.farmTimerSec / 60
                        )})`,
                        transformOrigin: 'left',
                      }}
                    />
                  </div>
                </div>
              )}

              {!maxFarmsReached && (
                <>
                  <div className="text-xs font-mono tabular-nums">
                    <span
                      className={
                        inventory.wood >= 10 ? 'text-lime-400' : 'text-stone-400'
                      }
                    >
                      Wood {inventory.wood}/10
                    </span>
                    <span className="mx-1.5 text-stone-600">·</span>
                    <span
                      className={
                        inventory.cannedFood >= 5
                          ? 'text-lime-400'
                          : 'text-stone-400'
                      }
                    >
                      Food {inventory.cannedFood}/5
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onBuildFarm}
                    disabled={!canBuildFarm}
                    className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      canBuildFarm
                        ? 'bg-lime-600 hover:bg-lime-500 text-stone-950 cursor-pointer'
                        : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {!structures.shelter
                      ? 'Requires Shelter'
                      : structures.farmCount === 0
                      ? 'Build Hydroponic Farm'
                      : `Add Farm Dome (${structures.farmCount + 1}/3)`}
                  </button>
                </>
              )}
            </div>

            {/* 4. Signal Flare — ONLY visible once player has had 100 Scrap Metal and 1 Chemicals */}
            {showSignalFlareOption && (
              <div className="p-3 bg-stone-900/95 border border-red-500/60 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm font-semibold text-stone-100">
                      Signal Flare
                    </span>
                  </div>
                  <span className="text-xs text-red-300">Early Rescue</span>
                </div>
                <p className="text-xs text-stone-400">
                  Fire from High Altitude (NE Overpass Spire, ≥6.0m) in clear
                  visibility for immediate extraction.
                </p>
                <div className="text-xs font-mono tabular-nums">
                  <span
                    className={
                      inventory.scrapMetal >= 100
                        ? 'text-lime-400'
                        : 'text-stone-400'
                    }
                  >
                    Scrap {inventory.scrapMetal}/100
                  </span>
                  <span className="mx-1.5 text-stone-600">·</span>
                  <span
                    className={
                      inventory.chemicals >= 1
                        ? 'text-lime-400'
                        : 'text-stone-400'
                    }
                  >
                    Chemicals {inventory.chemicals}/1
                  </span>
                </div>
                {!inventory.signalFlare ? (
                  <button
                    type="button"
                    onClick={onCraftFlare}
                    disabled={!canCraftFlare}
                    className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      canCraftFlare
                        ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
                        : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    Craft Signal Flare
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onActivateFlare}
                    className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      weatherInfo.blocksFlare
                        ? 'bg-stone-800 text-stone-300'
                        : atHighAltitude
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-amber-700/80 hover:bg-amber-600 text-stone-100'
                    }`}
                  >
                    {weatherInfo.blocksFlare
                      ? 'Blocked by Heavy Ash Storm'
                      : atHighAltitude
                      ? 'Activate Signal Flare (7.4m)'
                      : `Climb NE Spire (${altitude.toFixed(1)}m / 6.0m)`}
                  </button>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
