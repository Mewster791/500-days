import React from 'react';
import { X } from 'lucide-react';
import {
  Difficulty,
  WEATHER_CATALOG,
  WeatherType,
} from '../types/game';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  weather: WeatherType;
  weatherLocked: boolean;
  godMode: boolean;
  speedBoost: boolean;
  difficulty: Difficulty;
  daysRemaining: number;
  flareUnlocked: boolean;
  logsCount: number;
  totalLogs: number;
  onSetWeather: (w: WeatherType) => void;
  onToggleWeatherLock: () => void;
  onToggleGodMode: () => void;
  onToggleSpeedBoost: () => void;
  onGrantFlareMaterials: () => void;
  onGrantAllResources: () => void;
  onClearResources: () => void;
  onUnlockAllLore: () => void;
  onRefillVitals: () => void;
  onSetStarving: () => void;
  onSetDehydrated: () => void;
  onSkipDays: (days: number) => void;
  onSetDifficulty: (d: Difficulty) => void;
  onTeleportBase: () => void;
  onTeleportSpire: () => void;
  onTeleportCrater: () => void;
  onBuildAllStructures: () => void;
  onResetScavengeCooldowns: () => void;
  onForceVictory: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  open,
  onClose,
  weather,
  weatherLocked,
  godMode,
  speedBoost,
  difficulty,
  daysRemaining,
  flareUnlocked,
  logsCount,
  totalLogs,
  onSetWeather,
  onToggleWeatherLock,
  onToggleGodMode,
  onToggleSpeedBoost,
  onGrantFlareMaterials,
  onGrantAllResources,
  onClearResources,
  onUnlockAllLore,
  onRefillVitals,
  onSetStarving,
  onSetDehydrated,
  onSkipDays,
  onSetDifficulty,
  onTeleportBase,
  onTeleportSpire,
  onTeleportCrater,
  onBuildAllStructures,
  onResetScavengeCooldowns,
  onForceVictory,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-stone-950/98 border border-amber-500/60 rounded-xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-amber-400 tracking-wide">
              Admin Sandbox Panel
            </h2>
            <p className="text-xs text-stone-400">
              Test resources, weather physics, lore archives, teleportation, vitals, and endgame triggers
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Admin Panel"
            className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Resources, Lore & Signal Flare Unlock Testing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-200">
              Inventory, Lore ({logsCount}/{totalLogs}) & Flare Unlock
            </span>
            <span className="text-stone-400">
              Flare Option: {flareUnlocked ? 'Visible' : 'Hidden (<100 Scrap / <1 Chem)'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onGrantFlareMaterials}
              className="py-2 px-3 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              +100 Scrap & +1 Chem
            </button>
            <button
              type="button"
              onClick={onGrantAllResources}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              +50 All Resources
            </button>
            <button
              type="button"
              onClick={onUnlockAllLore}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-sky-700/60 text-sky-300 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Unlock All 12 Logs
            </button>
            <button
              type="button"
              onClick={onClearResources}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-red-300 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Zero Inv & Hide Flare
            </button>
          </div>
        </div>

        {/* 2. Weather Control */}
        <div className="space-y-2 border-t border-stone-800/90 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-200">
              Weather Control ({WEATHER_CATALOG[weather].label})
            </span>
            <button
              type="button"
              onClick={onToggleWeatherLock}
              className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer transition-colors ${
                weatherLocked
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              {weatherLocked ? 'Weather Locked' : 'Auto-Cycling Weather'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.values(WEATHER_CATALOG).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSetWeather(w.id)}
                className={`py-2 px-3 rounded-md text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap ${
                  weather === w.id
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400">
            Active effect: {WEATHER_CATALOG[weather].effectsSummary}
          </p>
        </div>

        {/* 3. Player Cheats, Vitals & Difficulty */}
        <div className="space-y-2 border-t border-stone-800/90 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-200">
              Player Vitals, Movement & Difficulty
            </span>
            <span className="text-stone-400 capitalize">
              Active: {difficulty}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onToggleGodMode}
              className={`py-2 px-3 rounded-md text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap ${
                godMode
                  ? 'bg-lime-500 text-stone-950 border-lime-400 font-semibold'
                  : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
              }`}
            >
              God Mode: {godMode ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={onToggleSpeedBoost}
              className={`py-2 px-3 rounded-md text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap ${
                speedBoost
                  ? 'bg-sky-500 text-stone-950 border-sky-400 font-semibold'
                  : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
              }`}
            >
              2.5x Speed: {speedBoost ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={onRefillVitals}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Heal & Refill Vitals
            </button>
            <button
              type="button"
              onClick={onSetStarving}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-300 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Test 0 Hunger
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onSetDehydrated}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-sky-300 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Test 0 Thirst
            </button>
            {([Difficulty.Easy, Difficulty.Normal, Difficulty.Hard] as const).map(
              (d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onSetDifficulty(d)}
                  className={`py-1.5 px-3 rounded-md text-xs font-medium border capitalize cursor-pointer transition-colors whitespace-nowrap ${
                    difficulty === d
                      ? 'bg-stone-200 text-stone-950 border-stone-100 font-semibold'
                      : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
                  }`}
                >
                  {d} Mode
                </button>
              )
            )}
          </div>
        </div>

        {/* 4. Teleportation, Base & Day Countdown */}
        <div className="space-y-2 border-t border-stone-800/90 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-200">
              Teleport, Base & Countdown ({daysRemaining} Days Left)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onTeleportSpire}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-amber-600/60 text-amber-300 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Teleport to Spire (7.4m)
            </button>
            <button
              type="button"
              onClick={onTeleportBase}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Teleport to Base Camp
            </button>
            <button
              type="button"
              onClick={onTeleportCrater}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-lime-700/60 text-lime-300 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Teleport to Fallout Crater
            </button>
            <button
              type="button"
              onClick={onBuildAllStructures}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Instant Build Base
            </button>
            <button
              type="button"
              onClick={onResetScavengeCooldowns}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Reset Scavenge Nodes
            </button>
            <button
              type="button"
              onClick={() => onSkipDays(25)}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Skip -25 Days
            </button>
            <button
              type="button"
              onClick={() => onSkipDays(100)}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Skip -100 Days
            </button>
            <button
              type="button"
              onClick={onForceVictory}
              className="py-2 px-3 bg-lime-600 hover:bg-lime-500 text-stone-950 text-xs font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Instant Rescue Win
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
