import React, { useState } from 'react';
import { BookOpen, Lock, X } from 'lucide-react';
import { LORE_LOGS, SECTOR_LORE_SUMMARY } from '../data/lore';
import { WEATHER_CATALOG } from '../types/game';

interface LoreModalProps {
  open: boolean;
  onClose: () => void;
  discoveredLoreIds: string[];
}

export const LoreModal: React.FC<LoreModalProps> = ({
  open,
  onClose,
  discoveredLoreIds,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'almanac'>('logs');
  const [selectedLogId, setSelectedLogId] = useState<string>(LORE_LOGS[0].id);

  if (!open) return null;

  const selectedLog =
    LORE_LOGS.find((l) => l.id === selectedLogId) ?? LORE_LOGS[0];
  const isSelectedUnlocked = discoveredLoreIds.includes(selectedLog.id);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-stone-950/85">
      <div className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-stone-950 border border-stone-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-100 tracking-wide">
                Sector 09 Field Journal
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span>{SECTOR_LORE_SUMMARY.cityTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-amber-400">
                  {discoveredLoreIds.length} / {LORE_LOGS.length} Logs Recovered
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Functional Segmented Tab Control */}
            <div className="flex items-center gap-1 p-1 bg-stone-900 border border-stone-800 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'bg-stone-800 text-stone-100'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Recovered Logs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('almanac')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'almanac'
                    ? 'bg-stone-800 text-stone-100'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Survival Almanac
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Field Journal"
              className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-stone-300 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeTab === 'logs' ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
            {/* Left Index List */}
            <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-stone-800 overflow-y-auto p-3 space-y-1.5 max-h-60 md:max-h-none">
              {LORE_LOGS.map((entry) => {
                const unlocked = discoveredLoreIds.includes(entry.id);
                const active = entry.id === selectedLog.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedLogId(entry.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-stone-900 border-amber-500/60 text-stone-100'
                        : 'bg-stone-950 hover:bg-stone-900/70 border-stone-800/70 text-stone-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-stone-400">
                        {entry.code} · {entry.dateStamp}
                      </div>
                      <div className="text-xs font-semibold truncate mt-0.5">
                        {unlocked ? entry.title : 'Encrypted / Undiscovered Record'}
                      </div>
                    </div>
                    {!unlocked && (
                      <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Document Reader */}
            <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between space-y-6">
              {isSelectedUnlocked ? (
                <div className="space-y-4">
                  <div className="space-y-1 border-b border-stone-800 pb-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-mono">
                      <span>{selectedLog.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedLog.dateStamp}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedLog.location}</span>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-stone-100">
                      {selectedLog.title}
                    </h3>
                    <div className="text-xs text-stone-400">
                      Logged by {selectedLog.author}
                    </div>
                  </div>

                  <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-line">
                    {selectedLog.body}
                  </p>
                </div>
              ) : (
                <div className="my-auto text-center py-12 space-y-2">
                  <Lock className="w-7 h-7 text-stone-600 mx-auto" />
                  <div className="text-sm font-semibold text-stone-300">
                    Record Not Yet Recovered
                  </div>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
                    Download archives from glowing cyan Civil Defense Terminals
                    or scavenge ruined buildings and vehicles across New Vespera
                    to recover this transcript.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-stone-800/80 text-xs text-stone-400">
                {SECTOR_LORE_SUMMARY.convoyOperation}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Prologue Lore */}
            <div className="space-y-2 border-b border-stone-800 pb-5">
              <div className="text-xs font-medium text-amber-400">
                {SECTOR_LORE_SUMMARY.cataclysmName}
              </div>
              <h3 className="font-display text-2xl font-bold text-stone-100">
                Historical Context: Quarantine Sector 09
              </h3>
              <p className="text-sm text-stone-300 leading-relaxed">
                {SECTOR_LORE_SUMMARY.prologue}
              </p>
            </div>

            {/* Weather Mechanics Guide */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-stone-200">
                Meteorological Patterns & Survival Physics
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(WEATHER_CATALOG).map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-lg space-y-1"
                  >
                    <div className="text-sm font-semibold text-stone-100">
                      {w.label}
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      {w.effectsSummary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Controls Reference */}
            <div className="space-y-2 border-t border-stone-800 pt-5">
              <h4 className="text-sm font-semibold text-stone-200">
                Field Controls & Traversal
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-stone-300">
                <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-md">
                  <span className="text-amber-400 font-mono">WASD / Arrows</span>{' '}
                  · Move
                </div>
                <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-md">
                  <span className="text-amber-400 font-mono">Shift</span> ·
                  Sprint (Stamina)
                </div>
                <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-md">
                  <span className="text-amber-400 font-mono">Space</span> · Jump
                  / Vault
                </div>
                <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-md">
                  <span className="text-amber-400 font-mono">Right-Drag / [ ]</span>{' '}
                  · Orbit Cam
                </div>
                <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-md">
                  <span className="text-amber-400 font-mono">E</span> · Scavenge
                  / Use
                </div>
                <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-md">
                  <span className="text-amber-400 font-mono">1 / 2 / J</span> ·
                  Eat / Drink / Journal
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
