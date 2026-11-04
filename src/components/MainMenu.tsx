import React from 'react';
import { SECTOR_LORE_SUMMARY } from '../data/lore';
import { Difficulty } from '../types/game';

interface MainMenuProps {
  onSelectDifficulty: (difficulty: Difficulty) => void;
}

const DIFFICULTY_OPTIONS: {
  id: Difficulty;
  title: string;
  subtitle: string;
  decayNote: string;
  accentClass: string;
}[] = [
  {
    id: Difficulty.Easy,
    title: 'Easy',
    subtitle: 'Exploration & Settlement Building',
    decayNote: 'Hunger & Thirst locked at 100 · Explore & scavenge freely',
    accentClass:
      'hover:border-lime-500/70 focus-visible:ring-lime-500/70 group-hover:text-lime-300',
  },
  {
    id: Difficulty.Normal,
    title: 'Normal',
    subtitle: 'Balanced Wasteland Survival',
    decayNote: 'Hunger & Thirst lose 1 pt every 60s · Standard rationing',
    accentClass:
      'hover:border-amber-500/80 focus-visible:ring-amber-500/80 group-hover:text-amber-300',
  },
  {
    id: Difficulty.Hard,
    title: 'Hard',
    subtitle: 'Relentless Scarcity',
    decayNote: 'Hunger & Thirst lose 1 pt every 40s · Unforgiving weather',
    accentClass:
      'hover:border-red-500/80 focus-visible:ring-red-500/80 group-hover:text-red-300',
  },
];

export const MainMenu: React.FC<MainMenuProps> = ({ onSelectDifficulty }) => {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-6 bg-stone-950/75">
      <div className="w-full max-w-3xl bg-stone-950/95 border border-stone-800 rounded-xl p-8 md:p-10 shadow-2xl">
        <div className="space-y-4 border-b border-stone-800/90 pb-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-400">
            <span>{SECTOR_LORE_SUMMARY.cityTitle}</span>
            <span aria-hidden="true">·</span>
            <span>Beacon 142.8 MHz</span>
            <span aria-hidden="true">·</span>
            <span>Operation Longshore</span>
          </div>

          <h1
            className="font-display text-5xl md:text-6xl font-bold tracking-tight text-stone-100"
            style={{ textWrap: 'balance' }}
          >
            500 Days After
          </h1>

          <p className="text-sm md:text-base text-stone-300 leading-relaxed max-w-2xl">
            After <span className="text-stone-100 font-medium">The Seven-Minute Autumn</span>{' '}
            reduced New Vespera to vitrified ash, Offshore Flotilla{' '}
            <span className="text-stone-100 font-medium">Meridian</span> locked an
            automated repeater onto 142.8 MHz: armored recovery crawlers will
            breach Sector 09 in{' '}
            <span className="text-amber-400 font-semibold">500 days</span> once
            atmospheric Cobalt-60 particulates settle. Scavenge the ruins,
            recover Civil Defense logs, weather acid rain and ash squalls, and
            build a self-sustaining homestead to survive.
          </p>
        </div>

        <div className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-stone-200">
              Select Survival Difficulty
            </h2>
            <span className="text-xs text-stone-400">
              WASD: Move · Shift: Sprint · Space: Jump · Right-Drag: Orbit · E: Scavenge
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectDifficulty(opt.id)}
                className={`group text-left bg-stone-900/95 border border-stone-800 rounded-lg p-5 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 ${opt.accentClass}`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-display text-2xl font-bold text-stone-100 tracking-wide transition-colors">
                    {opt.title}
                  </span>
                  <span className="text-xs font-medium text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                    Deploy →
                  </span>
                </div>
                <p className="text-xs font-medium text-stone-300 mb-2">
                  {opt.subtitle}
                </p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  {opt.decayNote}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
