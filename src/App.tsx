/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EndScreens } from './components/EndScreens';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { WastelandScene } from './three/WastelandScene';
import {
  BaseStructures,
  DeathCause,
  Difficulty,
  GamePhase,
  HIGH_ALTITUDE_THRESHOLD,
  HazardZone,
  INITIAL_DAYS,
  Inventory,
  NearbyPrompt,
  SECONDS_PER_DAY,
  ToastNotice,
  VictoryMethod,
  WorldNode,
} from './types/game';
import { soundFX } from './utils/audio';
import { BASE_CAMP_SPOTS, generateWastelandData } from './utils/worldGen';

function createInitialNodes(seed: number): {
  nodes: WorldNode[];
  hazards: HazardZone[];
} {
  const { nodes, hazards } = generateWastelandData(seed);

  // Register interactive Base Camp structure nodes (active once constructed)
  nodes.push(
    {
      id: 'base-shelter',
      kind: 'shelter',
      label: 'Reinforced Wasteland Shelter',
      x: BASE_CAMP_SPOTS.shelter.x,
      y: 0,
      z: BASE_CAMP_SPOTS.shelter.z,
      interactRadius: 4.2,
      colliderRadius: 2.1,
      rotationY: BASE_CAMP_SPOTS.shelter.rotationY,
      scale: 1,
      variant: 0,
      cooldownRemaining: 0,
      cooldownDuration: 12,
    },
    {
      id: 'base-purifier',
      kind: 'purifier',
      label: 'Water Purifier Unit',
      x: BASE_CAMP_SPOTS.purifier.x,
      y: 0,
      z: BASE_CAMP_SPOTS.purifier.z,
      interactRadius: 3.4,
      colliderRadius: 1.25,
      rotationY: BASE_CAMP_SPOTS.purifier.rotationY,
      scale: 1,
      variant: 0,
      cooldownRemaining: 0,
      cooldownDuration: 0,
    },
    {
      id: 'base-farm',
      kind: 'farm',
      label: 'Hydroponic Dome Farm',
      x: BASE_CAMP_SPOTS.farm.x,
      y: 0,
      z: BASE_CAMP_SPOTS.farm.z,
      interactRadius: 3.6,
      colliderRadius: 1.65,
      rotationY: BASE_CAMP_SPOTS.farm.rotationY,
      scale: 1,
      variant: 0,
      cooldownRemaining: 0,
      cooldownDuration: 0,
    }
  );

  return { nodes, hazards };
}

const INITIAL_INVENTORY: Inventory = {
  scrapMetal: 4,
  wood: 6,
  cannedFood: 2,
  dirtyWater: 2,
  cleanWater: 1,
  chemicals: 0,
  signalFlare: false,
};

const INITIAL_STRUCTURES: BaseStructures = {
  shelter: false,
  purifierCount: 0,
  farmCount: 0,
  farmTimerSec: 0,
};

export default function App() {
  const [sessionId, setSessionId] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.Menu);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Normal);
  const [victoryMethod, setVictoryMethod] =
    useState<VictoryMethod>('countdown');
  const [deathCause, setDeathCause] = useState<DeathCause>('starvation');

  const initialWorld = useRef(createInitialNodes(104729));
  const nodesRef = useRef<WorldNode[]>(initialWorld.current.nodes);
  const [hazards, setHazards] = useState<HazardZone[]>(
    initialWorld.current.hazards
  );

  // Display state synced smoothly from simulation ref
  const [daysRemaining, setDaysRemaining] = useState<number>(INITIAL_DAYS);
  const [dayProgress, setDayProgress] = useState<number>(0);
  const [health, setHealth] = useState<number>(100);
  const [hunger, setHunger] = useState<number>(100);
  const [thirst, setThirst] = useState<number>(100);
  const [altitude, setAltitude] = useState<number>(0);
  const [inRadiation, setInRadiation] = useState<boolean>(false);

  const [inventory, setInventory] = useState<Inventory>(INITIAL_INVENTORY);
  const [structures, setStructures] =
    useState<BaseStructures>(INITIAL_STRUCTURES);
  const [nearbyPrompt, setNearbyPrompt] = useState<NearbyPrompt | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [muted, setMuted] = useState<boolean>(false);
  const [flareLaunching, setFlareLaunching] = useState<boolean>(false);

  // High-precision mutable simulation state for exact survival math
  const simRef = useRef({
    elapsedSec: 0,
    health: 100,
    hunger: 100,
    thirst: 100,
    starveDehydrateTimer: 0, // Counts up to 5.0s for -5 HP ticks
    farmTimer: 0,
    geigerTimer: 0,
    hudSyncTimer: 0,
    altitude: 0,
    inRadiation: false,
  });

  const inventoryRef = useRef<Inventory>(INITIAL_INVENTORY);
  inventoryRef.current = inventory;

  const structuresRef = useRef<BaseStructures>(INITIAL_STRUCTURES);
  structuresRef.current = structures;

  const difficultyRef = useRef<Difficulty>(Difficulty.Normal);
  difficultyRef.current = difficulty;

  const toastIdCounter = useRef(1);
  const pushToast = useCallback(
    (message: string, tone: ToastNotice['tone'] = 'neutral') => {
      const id = toastIdCounter.current++;
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    },
    []
  );

  const startNewRun = useCallback(
    (chosenDifficulty: Difficulty) => {
      const newSeed = Math.floor(Date.now() % 1000000) + 17;
      const generated = createInitialNodes(newSeed);
      nodesRef.current = generated.nodes;
      setHazards(generated.hazards);

      simRef.current = {
        elapsedSec: 0,
        health: 100,
        hunger: 100,
        thirst: 100,
        starveDehydrateTimer: 0,
        farmTimer: 0,
        geigerTimer: 0,
        hudSyncTimer: 0,
        altitude: 0,
        inRadiation: false,
      };

      setDifficulty(chosenDifficulty);
      setDaysRemaining(INITIAL_DAYS);
      setDayProgress(0);
      setHealth(100);
      setHunger(100);
      setThirst(100);
      setAltitude(0);
      setInRadiation(false);
      setInventory({ ...INITIAL_INVENTORY });
      setStructures({ ...INITIAL_STRUCTURES });
      setNearbyPrompt(null);
      setToasts([]);
      setFlareLaunching(false);
      setSessionId((prev) => prev + 1);
      setPhase(GamePhase.Playing);

      pushToast(
        'Scavenge ruins with [E]. Reach NE Overpass Spire for high-altitude extraction.',
        'positive'
      );
    },
    [pushToast]
  );

  // Consumables handlers
  const handleConsumeFood = useCallback(() => {
    if (phase !== GamePhase.Playing) return;
    if (inventoryRef.current.cannedFood <= 0) return;

    setInventory((prev) => ({
      ...prev,
      cannedFood: Math.max(0, prev.cannedFood - 1),
    }));
    simRef.current.hunger = Math.min(100, simRef.current.hunger + 20);
    setHunger(simRef.current.hunger);
    soundFX.playConsume('food');
    pushToast('Consumed Canned Food (+20 Hunger)', 'positive');
  }, [phase, pushToast]);

  const handleConsumeWater = useCallback(() => {
    if (phase !== GamePhase.Playing) return;
    if (inventoryRef.current.cleanWater <= 0) return;

    setInventory((prev) => ({
      ...prev,
      cleanWater: Math.max(0, prev.cleanWater - 1),
    }));
    simRef.current.thirst = Math.min(100, simRef.current.thirst + 25);
    setThirst(simRef.current.thirst);
    soundFX.playConsume('water');
    pushToast('Drank Clean Water (+25 Thirst)', 'positive');
  }, [phase, pushToast]);

  // Base Building & Crafting handlers
  const handleBuildShelter = useCallback(() => {
    const inv = inventoryRef.current;
    const st = structuresRef.current;
    if (st.shelter || inv.wood < 20 || inv.scrapMetal < 10) return;

    setInventory((prev) => ({
      ...prev,
      wood: prev.wood - 20,
      scrapMetal: prev.scrapMetal - 10,
    }));
    setStructures((prev) => ({ ...prev, shelter: true }));
    soundFX.playBuild();
    pushToast(
      'Shelter constructed! Water Purifier & Hydroponic Farm unlocked.',
      'positive'
    );
  }, [pushToast]);

  const handleBuildPurifier = useCallback(() => {
    const inv = inventoryRef.current;
    const st = structuresRef.current;
    if (!st.shelter || inv.scrapMetal < 5) return;

    setInventory((prev) => ({
      ...prev,
      scrapMetal: prev.scrapMetal - 5,
    }));
    setStructures((prev) => ({
      ...prev,
      purifierCount: prev.purifierCount + 1,
    }));
    soundFX.playBuild();
    pushToast(
      'Water Purifier built! Convert Dirty Water into Clean Water anytime.',
      'positive'
    );
  }, [pushToast]);

  const handlePurifyWater = useCallback(() => {
    const inv = inventoryRef.current;
    const st = structuresRef.current;
    if (st.purifierCount <= 0 || inv.dirtyWater <= 0) {
      pushToast('No Dirty Water available to purify.', 'warning');
      return;
    }

    setInventory((prev) => ({
      ...prev,
      dirtyWater: prev.dirtyWater - 1,
      cleanWater: prev.cleanWater + 1,
    }));
    soundFX.playConsume('water');
    pushToast('Purified 1x Dirty Water → 1x Clean Water', 'positive');
  }, [pushToast]);

  const handleBuildFarm = useCallback(() => {
    const inv = inventoryRef.current;
    const st = structuresRef.current;
    if (!st.shelter || inv.wood < 10 || inv.cannedFood < 5) return;

    setInventory((prev) => ({
      ...prev,
      wood: prev.wood - 10,
      cannedFood: prev.cannedFood - 5,
    }));
    setStructures((prev) => ({
      ...prev,
      farmCount: prev.farmCount + 1,
    }));
    soundFX.playBuild();
    pushToast(
      'Hydroponic Farm online! Producing +1 Canned Food every 60s.',
      'positive'
    );
  }, [pushToast]);

  const handleCraftFlare = useCallback(() => {
    const inv = inventoryRef.current;
    if (inv.signalFlare || inv.scrapMetal < 100 || inv.chemicals < 1) return;

    setInventory((prev) => ({
      ...prev,
      scrapMetal: prev.scrapMetal - 100,
      chemicals: prev.chemicals - 1,
      signalFlare: true,
    }));
    soundFX.playRareFind();
    pushToast(
      'Signal Flare crafted! Climb the NE Overpass Spire (≥6.0m) to fire it!',
      'rare'
    );
  }, [pushToast]);

  const triggerFlareExtraction = useCallback(
    (currentAlt: number) => {
      if (!inventoryRef.current.signalFlare || flareLaunching) return;
      if (currentAlt < HIGH_ALTITUDE_THRESHOLD) {
        pushToast(
          `Altitude too low (${currentAlt.toFixed(
            1
          )}m). Climb the North-East Overpass Spire (≥6.0m)!`,
          'warning'
        );
        return;
      }

      setFlareLaunching(true);
      soundFX.playFlareLaunch();
      pushToast('Signal Flare ignited! Extraction airship inbound!', 'rare');

      window.setTimeout(() => {
        setVictoryMethod('flare');
        setPhase(GamePhase.Victory);
      }, 950);
    },
    [flareLaunching, pushToast]
  );

  // Hotkeys [1] Eat Food, [2] Drink Clean Water
  useEffect(() => {
    const onHotkey = (e: KeyboardEvent) => {
      if (phase !== GamePhase.Playing || e.repeat) return;
      if (e.code === 'Digit1') {
        handleConsumeFood();
      } else if (e.code === 'Digit2') {
        handleConsumeWater();
      }
    };
    window.addEventListener('keydown', onHotkey);
    return () => window.removeEventListener('keydown', onHotkey);
  }, [phase, handleConsumeFood, handleConsumeWater]);

  // Scavenging & 3D Node Interaction (E Key)
  const handleInteractNode = useCallback(
    (nodeId: string, playerAltitude: number) => {
      if (phase !== GamePhase.Playing) return;
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;

      // High-altitude Signal Flare launch pad
      if (node.kind === 'spire_pad') {
        if (inventoryRef.current.signalFlare) {
          triggerFlareExtraction(playerAltitude);
        } else {
          pushToast(
            'High-Altitude Pad (7.4m): Craft a Signal Flare (100 Scrap + 1 Chemicals) to call rescue.',
            'neutral'
          );
        }
        return;
      }

      // Built Water Purifier interaction
      if (node.kind === 'purifier') {
        handlePurifyWater();
        return;
      }

      // Built Shelter interaction
      if (node.kind === 'shelter') {
        if (node.cooldownRemaining > 0) {
          pushToast(
            `Shelter stove warming (${Math.ceil(node.cooldownRemaining)}s)`,
            'neutral'
          );
          return;
        }
        node.cooldownRemaining = node.cooldownDuration;
        simRef.current.health = Math.min(100, simRef.current.health + 10);
        setHealth(simRef.current.health);
        soundFX.playBuild();
        pushToast('Rested inside Shelter (+10 Health)', 'positive');
        return;
      }

      // Built Farm inspection
      if (node.kind === 'farm') {
        const rem = Math.max(0, Math.ceil(60 - simRef.current.farmTimer));
        pushToast(
          `Hydroponic Farm active · Next Canned Food harvest in ${rem}s`,
          'positive'
        );
        return;
      }

      // Scavenging City Ruins, Vehicles, Scrap Piles, Timber
      if (node.cooldownRemaining > 0) {
        pushToast(
          `Already scavenged · Wait ${Math.ceil(
            node.cooldownRemaining
          )}s for shifting rubble`,
          'neutral'
        );
        return;
      }

      node.cooldownRemaining = node.cooldownDuration;

      let scrapGain = 0;
      let woodGain = 0;
      let foodGain = 0;
      let dirtyWaterGain = 0;
      let chemGain = 0;

      if (node.kind === 'building') {
        scrapGain = 2 + Math.floor(Math.random() * 4); // 2–5 Scrap Metal
        woodGain = Math.random() < 0.65 ? 1 + Math.floor(Math.random() * 3) : 0;
        if (Math.random() < 0.45) foodGain = 1;
        if (Math.random() < 0.5) dirtyWaterGain = 1;
        // Exact 2% spawn rate for [Chemicals] in Ruined Buildings
        if (Math.random() < 0.02) {
          chemGain = 1;
        }
      } else if (node.kind === 'vehicle') {
        scrapGain = 2 + Math.floor(Math.random() * 4); // 2–5 Scrap Metal
        if (Math.random() < 0.5) dirtyWaterGain = 1;
        if (Math.random() < 0.25) foodGain = 1;
      } else if (node.kind === 'scrap') {
        scrapGain = 3 + Math.floor(Math.random() * 4); // 3–6 Scrap Metal
        woodGain = 1 + Math.floor(Math.random() * 2);
      } else if (node.kind === 'timber') {
        woodGain = 3 + Math.floor(Math.random() * 4); // 3–6 Wood
        if (Math.random() < 0.35) dirtyWaterGain = 1;
      }

      setInventory((prev) => ({
        ...prev,
        scrapMetal: prev.scrapMetal + scrapGain,
        wood: prev.wood + woodGain,
        cannedFood: prev.cannedFood + foodGain,
        dirtyWater: prev.dirtyWater + dirtyWaterGain,
        chemicals: prev.chemicals + chemGain,
      }));

      const parts: string[] = [];
      if (scrapGain > 0) parts.push(`+${scrapGain} Scrap Metal`);
      if (woodGain > 0) parts.push(`+${woodGain} Wood`);
      if (foodGain > 0) parts.push(`+${foodGain} Canned Food`);
      if (dirtyWaterGain > 0) parts.push(`+${dirtyWaterGain} Dirty Water`);
      if (chemGain > 0) parts.push(`+${chemGain} Chemicals!`);

      if (chemGain > 0) {
        soundFX.playRareFind();
        pushToast(`RARE SALVAGE: ${parts.join(', ')}`, 'rare');
      } else {
        soundFX.playScavenge();
        pushToast(`Scavenged: ${parts.join(', ')}`, 'neutral');
      }
    },
    [phase, handlePurifyWater, pushToast, triggerFlareExtraction]
  );

  // Per-frame Survival Math & Day/Night Countdown Simulation
  const handleFrameTick = useCallback(
    (
      dt: number,
      _px: number,
      py: number,
      _pz: number,
      inRadiationZone: boolean
    ) => {
      const sim = simRef.current;
      sim.elapsedSec += dt;
      sim.altitude = py;
      sim.inRadiation = inRadiationZone;

      // 1. Countdown 500 In-Game Days (1 Day = 60 real-world seconds)
      const daysPassed = Math.floor(sim.elapsedSec / SECONDS_PER_DAY);
      const remaining = Math.max(0, INITIAL_DAYS - daysPassed);
      if (remaining <= 0) {
        setDaysRemaining(0);
        setVictoryMethod('countdown');
        setPhase(GamePhase.Victory);
        return;
      }

      // 2. Hunger & Thirst Decay based on Difficulty
      const diff = difficultyRef.current;
      if (diff === Difficulty.Easy) {
        sim.hunger = 100;
        sim.thirst = 100;
        sim.starveDehydrateTimer = 0;
      } else {
        const decayInterval = diff === Difficulty.Normal ? 60 : 40;
        const decayAmount = dt / decayInterval;
        sim.hunger = Math.max(0, sim.hunger - decayAmount);
        sim.thirst = Math.max(0, sim.thirst - decayAmount);

        // Health Decay Rule (Normal & Hard Only):
        // If Hunger OR Thirst hits 0, Health decays by 5 points every 5 real-world seconds
        if (sim.hunger <= 0 || sim.thirst <= 0) {
          sim.starveDehydrateTimer += dt;
          while (sim.starveDehydrateTimer >= 5.0) {
            sim.starveDehydrateTimer -= 5.0;
            sim.health = Math.max(0, sim.health - 5);
          }
        } else {
          sim.starveDehydrateTimer = 0;
        }
      }

      // 3. Environmental Hazard: Radioactive Fallout Craters
      if (inRadiationZone) {
        sim.health = Math.max(0, sim.health - dt * 6.5);
        sim.geigerTimer += dt;
        if (sim.geigerTimer >= 0.16) {
          sim.geigerTimer = 0;
          soundFX.playGeigerClick();
        }
      } else {
        sim.geigerTimer = 0;
      }

      // Check Lose Condition (Health <= 0)
      if (sim.health <= 0) {
        setHealth(0);
        if (inRadiationZone) {
          setDeathCause('radiation');
        } else if (sim.thirst <= 0) {
          setDeathCause('dehydration');
        } else {
          setDeathCause('starvation');
        }
        setPhase(GamePhase.GameOver);
        return;
      }

      // 4. Hydroponic Farm Self-Sustainment Loop (+1 Canned Food every 60s per farm)
      const farmCount = structuresRef.current.farmCount;
      if (farmCount > 0) {
        sim.farmTimer += dt;
        if (sim.farmTimer >= 60) {
          sim.farmTimer -= 60;
          setInventory((prev) => ({
            ...prev,
            cannedFood: prev.cannedFood + farmCount,
          }));
          pushToast(
            `Hydroponic Farm harvested +${farmCount} Canned Food`,
            'positive'
          );
        }
      }

      // 5. Throttle HUD React state updates (~8 times/sec) for zero UI jank
      sim.hudSyncTimer += dt;
      if (sim.hudSyncTimer >= 0.12) {
        sim.hudSyncTimer = 0;
        setDaysRemaining(remaining);
        setDayProgress((sim.elapsedSec % SECONDS_PER_DAY) / SECONDS_PER_DAY);
        setHealth(sim.health);
        setHunger(sim.hunger);
        setThirst(sim.thirst);
        setAltitude(sim.altitude);
        setInRadiation(sim.inRadiation);
        if (farmCount > 0) {
          setStructures((prev) => ({ ...prev, farmTimerSec: sim.farmTimer }));
        }
      }
    },
    [pushToast]
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFX.muted = next;
      return next;
    });
  }, []);

  const daysElapsedForReport = Math.min(
    INITIAL_DAYS,
    Math.floor(simRef.current.elapsedSec / SECONDS_PER_DAY) +
      (victoryMethod === 'flare' ? 1 : 0)
  );

  return (
    <main className="relative w-full h-full overflow-hidden bg-stone-950">
      <WastelandScene
        sessionId={sessionId}
        phase={phase}
        nodesRef={nodesRef}
        hazards={hazards}
        structures={structures}
        hasSignalFlare={inventory.signalFlare}
        flareLaunching={flareLaunching}
        onFrameTick={handleFrameTick}
        onNearbyChange={setNearbyPrompt}
        onInteractNode={handleInteractNode}
      />

      {phase === GamePhase.Menu && (
        <MainMenu onSelectDifficulty={startNewRun} />
      )}

      {phase === GamePhase.Playing && (
        <GameHUD
          difficulty={difficulty}
          daysRemaining={daysRemaining}
          dayProgress={dayProgress}
          health={health}
          hunger={hunger}
          thirst={thirst}
          altitude={altitude}
          inRadiation={inRadiation}
          inventory={inventory}
          structures={structures}
          nearbyPrompt={nearbyPrompt}
          toasts={toasts}
          muted={muted}
          onToggleMute={handleToggleMute}
          onConsumeFood={handleConsumeFood}
          onConsumeWater={handleConsumeWater}
          onBuildShelter={handleBuildShelter}
          onBuildPurifier={handleBuildPurifier}
          onPurifyWater={handlePurifyWater}
          onBuildFarm={handleBuildFarm}
          onCraftFlare={handleCraftFlare}
          onActivateFlare={() => triggerFlareExtraction(altitude)}
        />
      )}

      {(phase === GamePhase.Victory || phase === GamePhase.GameOver) && (
        <EndScreens
          phase={phase}
          difficulty={difficulty}
          daysElapsed={daysElapsedForReport}
          victoryMethod={victoryMethod}
          deathCause={deathCause}
          onRetrySameDifficulty={() => startNewRun(difficulty)}
          onReturnToMenu={() => setPhase(GamePhase.Menu)}
        />
      )}
    </main>
  );
}
