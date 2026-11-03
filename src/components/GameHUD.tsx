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
} from 'lucide-react';
import {
  BaseStructures,
  Difficulty,
  HIGH_ALTITUDE_THRESHOLD,
  Inventory,
  NearbyPrompt,
  ToastNotice,
} from '../types/game';

interface GameHUDProps {
  difficulty: Difficulty;
  daysRemaining: number;
  dayProgress: number; // 0..1 within current 60s day
  health: number;
  hunger: number;
  thirst: number;
  altitude: number;
  inRadiation: boolean;
  inventory: Inventory;
  structures: BaseStructures;
  nearbyPrompt: NearbyPrompt | null;
  toasts: ToastNotice[];
  muted: boolean;
  onToggleMute: () => void;
  onConsumeFood: () => void;
  onConsumeWater: () => void;
  onBuildShelter: () => void;
  onBuildPurifier: () => void;
  onPurifyWater: () => void;
  onBuildFarm: () => void;
  onCraftFlare: () => void;
  onActivateFlare: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  difficulty,
  daysRemaining,
  dayProgress,
  health,
  hunger,
  thirst,
  altitude,
  inRadiation,
  inventory,
  structures,
  nearbyPrompt,
  toasts,
  muted,
  onToggleMute,
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
  const atHighAltitude = altitude >= HIGH_ALTITUDE_THRESHOLD;

  const canBuildShelter =
    !structures.shelter &&
    inventory.wood >= 20 &&
    inventory.scrapMetal >= 10;

  const canBuildPurifier =
    structures.shelter && inventory.scrapMetal >= 5;

  const canPurifyWater =
    structures.purifierCount > 0 && inventory.dirtyWater >= 1;

  const canBuildFarm =
    structures.shelter &&
    inventory.wood >= 10 &&
    inventory.cannedFood >= 5;

  const canCraftFlare =
    !inventory.signalFlare &&
    inventory.scrapMetal >= 100 &&
    inventory.chemicals >= 1;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* TOP BAR: Day Countdown + Inventory Slots */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-stone-950/92 border-b border-stone-800">
        {/* Countdown Clock & Altitude */}
        <div className="flex items-center gap-5 shrink-0">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tight text-amber-400 font-mono tabular-nums">
                {daysRemaining}
              </span>
              <span className="text-xs font-semibold text-stone-300 whitespace-nowrap">
                Days Until Rescue
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

          <div className="hidden sm:flex items-center gap-2 text-xs text-stone-400 font-mono tabular-nums">
            <Compass className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span
              className={
                atHighAltitude ? 'text-amber-300 font-semibold' : 'text-stone-300'
              }
            >
              Alt {altitude.toFixed(1)}m
            </span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{difficulty} Mode</span>
          </div>
        </div>

        {/* Inventory Slots */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-md text-xs">
            <span className="text-stone-400">Scrap Metal </span>
            <span className="font-mono font-semibold text-stone-100 tabular-nums">
              {inventory.scrapMetal}
            </span>
          </div>

          <div className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-md text-xs">
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
            className={`px-3 py-1.5 rounded-md text-xs border transition-colors whitespace-nowrap shrink-0 ${
              inventory.cannedFood > 0
                ? 'bg-stone-900 border-amber-600/60 hover:bg-stone-800 text-stone-100 cursor-pointer'
                : 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span className="text-amber-300/90">[1] Canned Food </span>
            <span className="font-mono font-semibold tabular-nums">
              {inventory.cannedFood}
            </span>
          </button>

          <div className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-md text-xs">
            <span className="text-stone-400">Dirty Water </span>
            <span className="font-mono font-semibold text-stone-100 tabular-nums">
              {inventory.dirtyWater}
            </span>
          </div>

          <button
            type="button"
            onClick={onConsumeWater}
            disabled={inventory.cleanWater <= 0}
            title="Click or press [2] to Drink Clean Water (+25 Thirst)"
            className={`px-3 py-1.5 rounded-md text-xs border transition-colors whitespace-nowrap shrink-0 ${
              inventory.cleanWater > 0
                ? 'bg-stone-900 border-sky-600/60 hover:bg-stone-800 text-stone-100 cursor-pointer'
                : 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span className="text-sky-300/90">[2] Clean Water </span>
            <span className="font-mono font-semibold tabular-nums">
              {inventory.cleanWater}
            </span>
          </button>

          <div
            className={`px-3 py-1.5 rounded-md text-xs border ${
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
                atHighAltitude
                  ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white'
                  : 'bg-red-950/80 hover:bg-red-900/80 border-red-700/70 text-red-200'
              }`}
            >
              {atHighAltitude
                ? 'Fire Signal Flare Now!'
                : 'Signal Flare Ready (Climb NE Spire)'}
            </button>
          )}

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

      {/* BOTTOM-LEFT CORNER: Status Bars (Health, Hunger, Thirst) */}
      <div className="pointer-events-auto fixed bottom-5 left-5 w-72 bg-stone-950/92 border border-stone-800 rounded-xl p-4 shadow-xl space-y-3">
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
            <span className="font-semibold text-stone-200">Thirst</span>
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

        <div className="pt-1 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-center justify-between">
          <span>WASD / Arrows: Move</span>
          <span>E: Scavenge</span>
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
                Unlocks Water Purifier & Hydroponic Farm. Press E at Shelter to rest.
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
                  {structures.purifierCount > 0 ? 'Online' : 'Locked'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Converts Dirty Water into Clean Water (+25 Thirst).
              </p>
              {structures.purifierCount === 0 ? (
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
                        ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                        : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {structures.shelter
                      ? 'Build Water Purifier'
                      : 'Requires Shelter'}
                  </button>
                </>
              ) : (
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
                  Built: {structures.farmCount}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Automatically generates 1x Canned Food every 60s per farm.
              </p>
              {structures.farmCount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-lime-300 font-mono tabular-nums">
                    <span>Next Harvest</span>
                    <span>{Math.max(0, Math.ceil(60 - structures.farmTimerSec))}s</span>
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
                {structures.shelter ? 'Build Hydroponic Farm' : 'Requires Shelter'}
              </button>
            </div>

            {/* 4. Signal Flare (Endgame Early Rescue) */}
            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm font-semibold text-stone-100">
                    Signal Flare
                  </span>
                </div>
                <span className="text-xs text-stone-400">Early Rescue</span>
              </div>
              <p className="text-xs text-stone-400">
                2% Chemicals drop in Ruined Buildings. Fire from High Altitude
                (NE Overpass Spire, ≥6.0m) for instant rescue.
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
                    atHighAltitude
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-amber-700/80 hover:bg-amber-600 text-stone-100'
                  }`}
                >
                  {atHighAltitude
                    ? 'Activate Signal Flare (7.4m)'
                    : `Climb NE Spire (${altitude.toFixed(1)}m / 6.0m)`}
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
