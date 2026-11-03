import React from 'react';
import {
  DeathCause,
  Difficulty,
  GamePhase,
  VictoryMethod,
} from '../types/game';

interface EndScreensProps {
  phase: GamePhase.Victory | GamePhase.GameOver;
  difficulty: Difficulty;
  daysElapsed: number;
  victoryMethod: VictoryMethod;
  deathCause: DeathCause;
  onRetrySameDifficulty: () => void;
  onReturnToMenu: () => void;
}

export const EndScreens: React.FC<EndScreensProps> = ({
  phase,
  difficulty,
  daysElapsed,
  victoryMethod,
  deathCause,
  onRetrySameDifficulty,
  onReturnToMenu,
}) => {
  if (phase === GamePhase.Victory) {
    const formattedDays = Math.max(1, daysElapsed);
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-stone-950/85">
        <div className="w-full max-w-lg bg-stone-950 border border-amber-500/50 rounded-xl p-8 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <div className="text-xs font-medium text-amber-400">
              {victoryMethod === 'flare'
                ? 'High-Altitude Signal Flare Intercepted'
                : '500-Day Quarantine Countdown Completed'}
            </div>
            <h1 className="font-display text-5xl font-bold text-stone-100 tracking-tight">
              Rescued!
            </h1>
          </div>

          <p className="text-sm text-stone-300 leading-relaxed">
            {victoryMethod === 'flare'
              ? 'An airship from an unknown surviving maritime nation spotted your crimson flare cutting above the nuclear haze and extracted you from the overpass spire.'
              : 'You endured all 500 days in the irradiated ruins until the armored relief convoy breached the city perimeter and brought you to safety.'}
          </p>

          <div className="py-4 px-5 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-around">
            <div>
              <div className="text-xs text-stone-400">Days to Escape</div>
              <div className="font-display text-3xl font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                {formattedDays} {formattedDays === 1 ? 'Day' : 'Days'}
              </div>
            </div>
            <div className="h-8 w-px bg-stone-800" />
            <div>
              <div className="text-xs text-stone-400">Difficulty</div>
              <div className="font-display text-2xl font-bold text-stone-200 capitalize mt-0.5">
                {difficulty}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onRetrySameDifficulty}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={onReturnToMenu}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const deathDescription =
    deathCause === 'radiation'
      ? 'Acute radiation sickness from lingering inside a toxic fallout crater.'
      : deathCause === 'dehydration'
      ? 'Severe dehydration claimed your strength before clean water could be found.'
      : 'Starvation exhausted your last reserves in the ruined city.';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-stone-950/88">
      <div className="w-full max-w-lg bg-stone-950 border border-red-800/60 rounded-xl p-8 shadow-2xl space-y-6 text-center">
        <div className="space-y-2">
          <div className="text-xs font-medium text-red-400 capitalize">
            Day {Math.max(1, daysElapsed)} · {difficulty} Mode
          </div>
          <h1
            className="font-display text-4xl font-bold text-stone-100 tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            You perished in the wasteland. Retry?
          </h1>
        </div>

        <p className="text-sm text-stone-300 leading-relaxed">
          {deathDescription}
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRetrySameDifficulty}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Retry ({difficulty})
          </button>
          <button
            type="button"
            onClick={onReturnToMenu}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
