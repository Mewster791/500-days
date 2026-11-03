import React from 'react';
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
    subtitle: 'Exploration & Base Building',
    decayNote: 'Hunger & Thirst decay disabled · Locked at 100',
    accentClass:
      'hover:border-lime-500/70 focus-visible:ring-lime-500/70 group-hover:text-lime-300',
  },
  {
    id: Difficulty.Normal,
    title: 'Normal',
    subtitle: 'Balanced Wasteland Survival',
    decayNote: 'Hunger & Thirst lose 1 pt every 60s · Standard rations',
    accentClass:
      'hover:border-amber-500/80 focus-visible:ring-amber-500/80 group-hover:text-amber-300',
  },
  {
    id: Difficulty.Hard,
    title: 'Hard',
    subtitle: 'Relentless Scarcity',
    decayNote: 'Hunger & Thirst lose 1 pt every 40s · Tight rationing',
    accentClass:
      'hover:border-red-500/80 focus-visible:ring-red-500/80 group-hover:text-red-300',
  },
];

export const MainMenu: React.FC<MainMenuProps> = ({ onSelectDifficulty }) => {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-6 bg-stone-950/75">
      <div className="w-full max-w-3xl bg-stone-950/95 border border-stone-800 rounded-xl p-8 md:p-10 shadow-2xl">
        <div className="space-y-4 border-b border-stone-800/90 pb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-stone-400">
            <span>Sector 09 Quarantine Zone</span>
            <span aria-hidden="true">·</span>
            <span>Emergency Broadcast Active</span>
            <span aria-hidden="true">·</span>
            <span>60s Day Cycle</span>
          </div>

          <h1
            className="font-display text-5xl md:text-6xl font-bold tracking-tight text-stone-100"
            style={{ textWrap: 'balance' }}
          >
            500 Days After
          </h1>

          <p className="text-sm md:text-base text-stone-300 leading-relaxed max-w-2xl">
            Following the strategic exchange that turned the metropolis to ash,
            a distant coalition broadcast confirmed a heavy recovery convoy will
            reach your sector in{' '}
            <span className="text-amber-400 font-semibold">500 days</span>.
            Scavenge shattered ruins and rusted wrecks, construct a
            self-sustaining shelter, or salvage rare{' '}
            <span className="text-lime-400 font-semibold">Chemicals</span> and
            scrap to fire a{' '}
            <span className="text-red-400 font-semibold">Signal Flare</span>{' '}
            from the North-East Overpass Spire for immediate extraction.
          </p>
        </div>

        <div className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-200">
              Select Survival Difficulty
            </h2>
            <span className="text-xs text-stone-400">
              WASD / Arrows to Move · E to Scavenge
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
                    Start →
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
