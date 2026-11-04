/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { EndScreens } from './components/EndScreens';
import { GameHUD } from './components/GameHUD';
import { LoreModal } from './components/LoreModal';
import { MainMenu } from './components/MainMenu';
import { LORE_LOGS } from './data/lore';
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
  PlayerHudTelemetry,
  SECONDS_PER_DAY,
  TeleportCommand,
  ToastNotice,
  VictoryMethod,
  WEATHER_CATALOG,
  WeatherType,
  WorldNode,
} from './types/game';
import { soundFX } from './utils/audio';
import {
  BASE_CAMP_SPOTS,
  SPIRE_DECK,
  generateWastelandData,
} from './utils/worldGen';

const ADMIN_SECRET_DIGITS = ['9', '4', '2', '0', '6', '7', '2', '2'] as const;

const WEATHER_POOL: WeatherType[] = [
  WeatherType.Clear,
  WeatherType.AcidRain,
  WeatherType.AshStorm,
  WeatherType.Heatwave,
];

function extractDigitFromKeyEvent(e: KeyboardEvent): string | null {
  if (/^[0-9]$/.test(e.key)) {
    return e.key;
  }
  if (e.code.startsWith('Digit') && e.code.length === 6) {
    return e.code.slice(5);
  }
  if (e.code.startsWith('Numpad') && e.code.length === 7) {
    const ch = e.code.slice(6);
    if (/^[0-9]$/.test(ch)) return ch;
  }
  return null;
}

function createInitialNodes(seed: number): {
  nodes: WorldNode[];
  hazards: HazardZone[];
} {
  const { nodes, hazards } = generateWastelandData(seed);

  nodes.push(
    {
      id: 'base-shelter',
      kind: 'shelter',
      label: 'Reinforced Wasteland Shelter',
      x: BASE_CAMP_SPOTS.shelter.x,
      y: 0,
      z: BASE_CAMP_SPOTS.shelter.z,
      interactRadius: 4.4,
      colliderRadius: 2.2,
      boxHalfW: 2.15,
      boxHalfD: 1.85,
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
      x: BASE_CAMP_SPOTS.purifiers[0].x,
      y: 0,
      z: BASE_CAMP_SPOTS.purifiers[0].z,
      interactRadius: 3.6,
      colliderRadius: 1.25,
      rotationY: BASE_CAMP_SPOTS.purifiers[0].rotationY,
      scale: 1,
      variant: 0,
      cooldownRemaining: 0,
      cooldownDuration: 0,
    },
    {
      id: 'base-farm',
      kind: 'farm',
      label: 'Hydroponic Dome Farm',
      x: BASE_CAMP_SPOTS.farms[0].x,
      y: 0,
      z: BASE_CAMP_SPOTS.farms[0].z,
      interactRadius: 3.8,
      colliderRadius: 1.65,
      boxHalfW: 1.6,
      boxHalfD: 1.1,
      rotationY: BASE_CAMP_SPOTS.farms[0].rotationY,
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
  purifierAutoTimerSec: 0,
  farmCount: 0,
  farmTimerSec: 0,
};

export default function App() {
  const [sessionId, setSessionId] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.Menu);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Normal);
  const [weather, setWeather] = useState<WeatherType>(WeatherType.Clear);
  const [victoryMethod, setVictoryMethod] =
    useState<VictoryMethod>('countdown');
  const [deathCause, setDeathCause] = useState<DeathCause>('starvation');
  const [finalDaysSurvived, setFinalDaysSurvived] = useState<number>(1);

  const initialWorld = useRef(createInitialNodes(104729));
  const nodesRef = useRef<WorldNode[]>(initialWorld.current.nodes);
  const [hazards, setHazards] = useState<HazardZone[]>(
    initialWorld.current.hazards
  );
  const [terminalsSnapshot, setTerminalsSnapshot] = useState<WorldNode[]>(() =>
    initialWorld.current.nodes.filter((n) => n.kind === 'terminal')
  );

  // Display state synced smoothly from simulation ref
  const [daysRemaining, setDaysRemaining] = useState<number>(INITIAL_DAYS);
  const [dayProgress, setDayProgress] = useState<number>(0);
  const [health, setHealth] = useState<number>(100);
  const [hunger, setHunger] = useState<number>(100);
  const [thirst, setThirst] = useState<number>(100);
  const [telemetry, setTelemetry] = useState<PlayerHudTelemetry>({
    x: 0,
    y: 0,
    z: 2,
    yaw: 0,
    stamina: 100,
  });
  const [inRadiation, setInRadiation] = useState<boolean>(false);
  const [isAcidRainExposed, setIsAcidRainExposed] = useState<boolean>(false);

  const [inventory, setInventory] = useState<Inventory>(INITIAL_INVENTORY);
  const [flareUnlocked, setFlareUnlocked] = useState<boolean>(false);
  const [discoveredLoreIds, setDiscoveredLoreIds] = useState<string[]>([]);
  const [journalOpen, setJournalOpen] = useState<boolean>(false);
  const [structures, setStructures] =
    useState<BaseStructures>(INITIAL_STRUCTURES);
  const [nearbyPrompt, setNearbyPrompt] = useState<NearbyPrompt | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [muted, setMuted] = useState<boolean>(false);
  const [flareLaunching, setFlareLaunching] = useState<boolean>(false);

  // Admin Panel & Debug state
  const [adminOpen, setAdminOpen] = useState<boolean>(false);
  const [weatherLocked, setWeatherLocked] = useState<boolean>(false);
  const [godMode, setGodMode] = useState<boolean>(false);
  const [speedBoost, setSpeedBoost] = useState<boolean>(false);
  const [teleportCommand, setTeleportCommand] =
    useState<TeleportCommand | null>(null);

  // Shared refs with Three.js loop
  const elapsedSecRef = useRef<number>(0);
  const scavengeBurstRef = useRef<{ nonce: number; nodeId: string } | null>(
    null
  );

  // Secret Q + 9-4-2-0-6-7-2-2 combo tracking refs
  const isHoldingQRef = useRef<boolean>(false);
  const secretComboIdxRef = useRef<number>(0);

  // High-precision mutable simulation state
  const simRef = useRef({
    elapsedSec: 0,
    health: 100,
    hunger: 100,
    thirst: 100,
    starveDehydrateTimer: 0,
    farmTimer: 0,
    purifierAutoTimer: 0,
    rainCatchTimer: 0,
    weatherCycleTimer: 0,
    nextWeatherDuration: 52,
    geigerTimer: 0,
    hudSyncTimer: 0,
    inRadiation: false,
    acidRainExposed: false,
  });

  const inventoryRef = useRef<Inventory>(INITIAL_INVENTORY);
  inventoryRef.current = inventory;

  const structuresRef = useRef<BaseStructures>(INITIAL_STRUCTURES);
  structuresRef.current = structures;

  const difficultyRef = useRef<Difficulty>(Difficulty.Normal);
  difficultyRef.current = difficulty;

  const weatherRef = useRef<WeatherType>(WeatherType.Clear);
  weatherRef.current = weather;

  const weatherLockedRef = useRef<boolean>(false);
  weatherLockedRef.current = weatherLocked;

  const godModeRef = useRef<boolean>(false);
  godModeRef.current = godMode;

  const discoveredLoreRef = useRef<string[]>([]);
  discoveredLoreRef.current = discoveredLoreIds;

  const toastIdCounter = useRef(1);
  const pushToast = useCallback(
    (message: string, tone: ToastNotice['tone'] = 'neutral') => {
      const id = toastIdCounter.current++;
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3400);
    },
    []
  );

  const unlockLoreEntry = useCallback(
    (specificLoreId?: string) => {
      const current = discoveredLoreRef.current;
      let targetId = specificLoreId;

      if (!targetId || current.includes(targetId)) {
        const remaining = LORE_LOGS.filter((l) => !current.includes(l.id));
        if (remaining.length === 0) return null;
        targetId = remaining[0].id;
      }

      const found = LORE_LOGS.find((l) => l.id === targetId);
      if (!found || current.includes(found.id)) return null;

      setDiscoveredLoreIds((prev) =>
        prev.includes(found.id) ? prev : [...prev, found.id]
      );
      return found;
    },
    []
  );

  // Unlock Signal Flare option the moment player holds >=100 Scrap Metal and >=1 Chemicals
  useEffect(() => {
    if (
      !flareUnlocked &&
      inventory.scrapMetal >= 100 &&
      inventory.chemicals >= 1
    ) {
      setFlareUnlocked(true);
      soundFX.playRareFind();
      pushToast(
        'Signal Flare option unlocked in Base & Crafting!',
        'rare'
      );
    }
  }, [flareUnlocked, inventory.scrapMetal, inventory.chemicals, pushToast]);

  // Secret Admin Combo Listener: Hold Q and press 9 -> 4 -> 2 -> 0 -> 6 -> 7 -> 2 -> 2
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setJournalOpen(false);
        setAdminOpen(false);
        return;
      }

      const isQ = e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q';
      if (isQ) {
        if (!isHoldingQRef.current) {
          isHoldingQRef.current = true;
          secretComboIdxRef.current = 0;
        }
        return;
      }

      if (!isHoldingQRef.current || e.repeat) return;

      if (
        e.key === 'Shift' ||
        e.key === 'Control' ||
        e.key === 'Alt' ||
        e.key === 'Meta'
      ) {
        return;
      }

      const digit = extractDigitFromKeyEvent(e);
      const expected = ADMIN_SECRET_DIGITS[secretComboIdxRef.current];

      if (digit !== null && digit === expected) {
        secretComboIdxRef.current += 1;
        if (secretComboIdxRef.current >= ADMIN_SECRET_DIGITS.length) {
          secretComboIdxRef.current = 0;
          setAdminOpen((prev) => !prev);
          soundFX.playRareFind();
        }
      } else {
        secretComboIdxRef.current =
          digit === ADMIN_SECRET_DIGITS[0] ? 1 : 0;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const isQ = e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q';
      if (isQ) {
        isHoldingQRef.current = false;
        secretComboIdxRef.current = 0;
      }
    };

    const onWindowBlur = () => {
      isHoldingQRef.current = false;
      secretComboIdxRef.current = 0;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, []);

  const startNewRun = useCallback(
    (chosenDifficulty: Difficulty) => {
      const newSeed = Math.floor(Date.now() % 1000000) + 17;
      const generated = createInitialNodes(newSeed);
      nodesRef.current = generated.nodes;
      setHazards(generated.hazards);
      setTerminalsSnapshot(
        generated.nodes.filter((n) => n.kind === 'terminal')
      );

      elapsedSecRef.current = 0;
      scavengeBurstRef.current = null;
      simRef.current = {
        elapsedSec: 0,
        health: 100,
        hunger: 100,
        thirst: 100,
        starveDehydrateTimer: 0,
        farmTimer: 0,
        purifierAutoTimer: 0,
        rainCatchTimer: 0,
        weatherCycleTimer: 0,
        nextWeatherDuration: 52,
        geigerTimer: 0,
        hudSyncTimer: 0,
        inRadiation: false,
        acidRainExposed: false,
      };

      setDifficulty(chosenDifficulty);
      setWeather(WeatherType.Clear);
      setDaysRemaining(INITIAL_DAYS);
      setDayProgress(0);
      setFinalDaysSurvived(1);
      setHealth(100);
      setHunger(100);
      setThirst(100);
      setTelemetry({ x: 0, y: 0, z: 2, yaw: 0, stamina: 100 });
      setInRadiation(false);
      setIsAcidRainExposed(false);
      setInventory({ ...INITIAL_INVENTORY });
      setFlareUnlocked(false);
      setDiscoveredLoreIds([]);
      setJournalOpen(false);
      setStructures({ ...INITIAL_STRUCTURES });
      setNearbyPrompt(null);
      setToasts([]);
      setFlareLaunching(false);
      setTeleportCommand(null);
      setSessionId((prev) => prev + 1);
      setPhase(GamePhase.Playing);

      pushToast(
        'Entered Quarantine Sector 09. Press [E] near terminals & ruins to scavenge.',
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
      'Shelter & Campfire constructed! Purifier, Farm & Acid Rain cover active.',
      'positive'
    );
  }, [pushToast]);

  const handleBuildPurifier = useCallback(() => {
    const inv = inventoryRef.current;
    const st = structuresRef.current;
    if (!st.shelter || st.purifierCount >= 2 || inv.scrapMetal < 5) return;

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
      'Water Purifier online! Instant purify + auto-distills Dirty Water every 30s.',
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
    if (
      !st.shelter ||
      st.farmCount >= 3 ||
      inv.wood < 10 ||
      inv.cannedFood < 5
    ) {
      return;
    }

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
      'Hydroponic Farm dome constructed! Producing +1 Canned Food per cycle.',
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

      const weatherSpec = WEATHER_CATALOG[weatherRef.current];
      if (weatherSpec.blocksFlare) {
        pushToast(
          'Heavy Ash Storm blocks aerial flare visibility — wait for clearer skies!',
          'warning'
        );
        return;
      }

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

      const escapedDays = Math.max(
        1,
        Math.ceil(simRef.current.elapsedSec / SECONDS_PER_DAY)
      );
      window.setTimeout(() => {
        setFinalDaysSurvived(escapedDays);
        setVictoryMethod('flare');
        setPhase(GamePhase.Victory);
      }, 950);
    },
    [flareLaunching, pushToast]
  );

  // Hotkeys [1] Eat Food, [2] Drink Clean Water, [J] Toggle Field Journal
  useEffect(() => {
    const onHotkey = (e: KeyboardEvent) => {
      if (phase !== GamePhase.Playing || e.repeat || isHoldingQRef.current) {
        return;
      }
      if (e.code === 'Digit1') {
        handleConsumeFood();
      } else if (e.code === 'Digit2') {
        handleConsumeWater();
      } else if (e.code === 'KeyJ') {
        setJournalOpen((prev) => !prev);
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

      if (node.kind === 'spire_pad') {
        if (inventoryRef.current.signalFlare) {
          triggerFlareExtraction(playerAltitude);
        } else if (flareUnlocked) {
          pushToast(
            'High-Altitude Pad (7.4m): Craft your Signal Flare in the Sidebar to launch!',
            'neutral'
          );
        }
        return;
      }

      if (node.kind === 'purifier') {
        handlePurifyWater();
        return;
      }

      if (node.kind === 'shelter') {
        if (node.cooldownRemaining > 0) {
          pushToast(
            `Shelter stove warming (${Math.ceil(node.cooldownRemaining)}s)`,
            'neutral'
          );
          return;
        }
        node.cooldownRemaining = node.cooldownDuration;
        simRef.current.health = Math.min(100, simRef.current.health + 12);
        setHealth(simRef.current.health);
        soundFX.playBuild();
        pushToast('Rested by Shelter hearth (+12 Health)', 'positive');
        return;
      }

      if (node.kind === 'farm') {
        const mult = WEATHER_CATALOG[weatherRef.current].farmSpeedMult;
        const rem = Math.max(
          0,
          Math.ceil((60 - simRef.current.farmTimer) / mult)
        );
        pushToast(
          `Hydroponic Farm active · Next Canned Food harvest in ${rem}s`,
          'positive'
        );
        return;
      }

      // Civil Defense Terminal Interaction (Always unlocks its assigned Lore Log on first visit!)
      if (node.kind === 'terminal') {
        const unlockedEntry = unlockLoreEntry(node.loreId);
        if (unlockedEntry) {
          node.cooldownRemaining = node.cooldownDuration;
          scavengeBurstRef.current = {
            nonce: (scavengeBurstRef.current?.nonce ?? 0) + 1,
            nodeId: node.id,
          };
          setInventory((prev) => ({
            ...prev,
            scrapMetal: prev.scrapMetal + 4,
            cleanWater: prev.cleanWater + 1,
          }));
          soundFX.playLoreTerminal();
          pushToast(
            `Archived [${unlockedEntry.code}] "${unlockedEntry.title}" (+4 Scrap, +1 Clean H₂O) — Press [J]`,
            'rare'
          );
          return;
        }
      }

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
      scavengeBurstRef.current = {
        nonce: (scavengeBurstRef.current?.nonce ?? 0) + 1,
        nodeId: node.id,
      };

      const activeWeather = weatherRef.current;

      let scrapGain = 0;
      let woodGain = 0;
      let foodGain = 0;
      let dirtyWaterGain = 0;
      let chemGain = 0;

      if (node.kind === 'terminal') {
        scrapGain = 3 + Math.floor(Math.random() * 3);
      } else if (node.kind === 'building') {
        scrapGain = 2 + Math.floor(Math.random() * 4);
        woodGain = Math.random() < 0.65 ? 1 + Math.floor(Math.random() * 3) : 0;
        if (Math.random() < 0.45) foodGain = 1;
        if (
          Math.random() <
          (activeWeather === WeatherType.AcidRain ? 0.8 : 0.5)
        ) {
          dirtyWaterGain = 1;
        }
        // Exact 2% spawn rate for [Chemicals] in Ruined Buildings
        if (Math.random() < 0.02) {
          chemGain = 1;
        }
      } else if (node.kind === 'vehicle') {
        scrapGain = 2 + Math.floor(Math.random() * 4);
        if (
          Math.random() <
          (activeWeather === WeatherType.AcidRain ? 0.8 : 0.5)
        ) {
          dirtyWaterGain = 1;
        }
        if (Math.random() < 0.25) foodGain = 1;
      } else if (node.kind === 'scrap') {
        scrapGain =
          3 +
          Math.floor(Math.random() * 4) +
          (activeWeather === WeatherType.AshStorm ? 2 : 0);
        woodGain = 1 + Math.floor(Math.random() * 2);
      } else if (node.kind === 'timber') {
        woodGain = 3 + Math.floor(Math.random() * 4);
        if (
          Math.random() <
          (activeWeather === WeatherType.AcidRain ? 0.65 : 0.35)
        ) {
          dirtyWaterGain = 1;
        }
      }

      setInventory((prev) => ({
        ...prev,
        scrapMetal: prev.scrapMetal + scrapGain,
        wood: prev.wood + woodGain,
        cannedFood: prev.cannedFood + foodGain,
        dirtyWater: prev.dirtyWater + dirtyWaterGain,
        chemicals: prev.chemicals + chemGain,
      }));

      // 16% chance when scavenging buildings or vehicles to also uncover an uncollected survivor Field Log
      let bonusLoreTitle: string | null = null;
      if (
        (node.kind === 'building' || node.kind === 'vehicle') &&
        Math.random() < 0.16
      ) {
        const entry = unlockLoreEntry();
        if (entry) {
          bonusLoreTitle = entry.title;
        }
      }

      const parts: string[] = [];
      if (scrapGain > 0) parts.push(`+${scrapGain} Scrap`);
      if (woodGain > 0) parts.push(`+${woodGain} Wood`);
      if (foodGain > 0) parts.push(`+${foodGain} Food`);
      if (dirtyWaterGain > 0) parts.push(`+${dirtyWaterGain} Dirty H₂O`);
      if (chemGain > 0) parts.push(`+${chemGain} Chemicals!`);

      if (chemGain > 0) {
        soundFX.playRareFind();
        pushToast(`RARE SALVAGE: ${parts.join(', ')}`, 'rare');
      } else if (bonusLoreTitle) {
        soundFX.playLoreTerminal();
        pushToast(
          `${parts.join(', ')} · Found Field Log: "${bonusLoreTitle}" [J]`,
          'positive'
        );
      } else {
        soundFX.playScavenge();
        pushToast(`Scavenged: ${parts.join(', ')}`, 'neutral');
      }
    },
    [
      flareUnlocked,
      phase,
      handlePurifyWater,
      pushToast,
      triggerFlareExtraction,
      unlockLoreEntry,
    ]
  );

  // Per-frame Survival Math, Weather Simulation, Fall Impact & Countdown
  const handleFrameTick = useCallback(
    (
      dt: number,
      px: number,
      py: number,
      pz: number,
      pyaw: number,
      pstamina: number,
      inRadiationZone: boolean,
      fallDamage: number
    ) => {
      const sim = simRef.current;
      sim.elapsedSec += dt;
      elapsedSecRef.current = sim.elapsedSec;
      sim.inRadiation = inRadiationZone;

      const invincible = godModeRef.current;

      // Apply ballistic fall damage if player leaped off high overpass cliff
      if (fallDamage > 0 && !invincible) {
        sim.health = Math.max(0, sim.health - fallDamage);
        pushToast(`Hard fall impact (-${fallDamage} Health)`, 'warning');
        if (sim.health <= 0) {
          setHealth(0);
          setFinalDaysSurvived(
            Math.max(1, Math.ceil(sim.elapsedSec / SECONDS_PER_DAY))
          );
          setDeathCause('fall_impact');
          setPhase(GamePhase.GameOver);
          return;
        }
      }

      // 1. Dynamic Weather Auto-Cycle (every ~48-68s when not locked)
      if (!weatherLockedRef.current) {
        sim.weatherCycleTimer += dt;
        if (sim.weatherCycleTimer >= sim.nextWeatherDuration) {
          sim.weatherCycleTimer = 0;
          sim.nextWeatherDuration = 48 + Math.random() * 20;

          const current = weatherRef.current;
          const candidates = WEATHER_POOL.filter((w) => w !== current);
          const nextW =
            candidates[Math.floor(Math.random() * candidates.length)];
          weatherRef.current = nextW;
          setWeather(nextW);
          if (
            nextW === WeatherType.AcidRain ||
            nextW === WeatherType.AshStorm
          ) {
            soundFX.playWeatherRumble();
          }
          pushToast(
            `Weather Shift: ${WEATHER_CATALOG[nextW].label} (${WEATHER_CATALOG[nextW].effectsSummary})`,
            nextW === WeatherType.Clear ? 'positive' : 'warning'
          );
        }
      }

      const activeWeather = weatherRef.current;
      const weatherSpec = WEATHER_CATALOG[activeWeather];

      // 2. Countdown 500 In-Game Days (1 Day = 60 real-world seconds)
      const daysPassed = Math.floor(sim.elapsedSec / SECONDS_PER_DAY);
      const remaining = Math.max(0, INITIAL_DAYS - daysPassed);
      if (remaining <= 0) {
        setDaysRemaining(0);
        setFinalDaysSurvived(INITIAL_DAYS);
        setVictoryMethod('countdown');
        setPhase(GamePhase.Victory);
        return;
      }

      // 3. Hunger & Thirst Decay
      const diff = difficultyRef.current;
      if (diff === Difficulty.Easy || invincible) {
        if (diff === Difficulty.Easy) {
          sim.hunger = 100;
          sim.thirst = 100;
        }
        if (invincible) {
          sim.health = 100;
          sim.hunger = 100;
          sim.thirst = 100;
        }
        sim.starveDehydrateTimer = 0;
      } else {
        const decayInterval = diff === Difficulty.Normal ? 60 : 40;
        const baseDecay = dt / decayInterval;
        sim.hunger = Math.max(0, sim.hunger - baseDecay);
        sim.thirst = Math.max(
          0,
          sim.thirst - baseDecay * weatherSpec.thirstDecayMult
        );

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

      // 4. Acid Rain Mechanics + Passive Water Purifier Auto-Distillation
      let exposedToAcidRain = false;
      const pCount = structuresRef.current.purifierCount;

      if (activeWeather === WeatherType.AcidRain) {
        const shelteredByBase =
          structuresRef.current.shelter &&
          Math.hypot(
            px - BASE_CAMP_SPOTS.shelter.x,
            pz - BASE_CAMP_SPOTS.shelter.z
          ) <= 9.0;

        if (!shelteredByBase && !invincible) {
          exposedToAcidRain = true;
          sim.health = Math.max(0, sim.health - dt * 0.35);
        }

        if (pCount > 0) {
          sim.rainCatchTimer += dt;
          if (sim.rainCatchTimer >= 20) {
            sim.rainCatchTimer -= 20;
            setInventory((prev) => ({
              ...prev,
              dirtyWater: prev.dirtyWater + pCount,
            }));
            pushToast(
              `Acid Rain Catchment: +${pCount} Dirty Water collected at Purifier`,
              'positive'
            );
          }
        }
      } else {
        sim.rainCatchTimer = 0;
      }
      sim.acidRainExposed = exposedToAcidRain;

      // Passive Water Purifier Auto-Distillation (1 Dirty -> 1 Clean every 30s per unit)
      if (pCount > 0 && inventoryRef.current.dirtyWater > 0) {
        sim.purifierAutoTimer += dt * pCount;
        if (sim.purifierAutoTimer >= 30) {
          sim.purifierAutoTimer -= 30;
          setInventory((prev) => {
            if (prev.dirtyWater <= 0) return prev;
            return {
              ...prev,
              dirtyWater: prev.dirtyWater - 1,
              cleanWater: prev.cleanWater + 1,
            };
          });
        }
      } else {
        sim.purifierAutoTimer = 0;
      }

      // 5. Radioactive Fallout Crater Hazard
      if (inRadiationZone) {
        if (!invincible) {
          sim.health = Math.max(0, sim.health - dt * 6.5);
        }
        sim.geigerTimer += dt;
        if (sim.geigerTimer >= 0.16) {
          sim.geigerTimer = 0;
          soundFX.playGeigerClick();
        }
      } else {
        sim.geigerTimer = 0;
      }

      // Check Lose Condition
      if (sim.health <= 0 && !invincible) {
        setHealth(0);
        setFinalDaysSurvived(
          Math.max(1, Math.ceil(sim.elapsedSec / SECONDS_PER_DAY))
        );
        if (inRadiationZone) {
          setDeathCause('radiation');
        } else if (exposedToAcidRain && sim.hunger > 0 && sim.thirst > 0) {
          setDeathCause('acid_rain');
        } else if (sim.thirst <= 0) {
          setDeathCause('dehydration');
        } else {
          setDeathCause('starvation');
        }
        setPhase(GamePhase.GameOver);
        return;
      }

      // 6. Hydroponic Farm Loop
      const farmCount = structuresRef.current.farmCount;
      if (farmCount > 0) {
        sim.farmTimer += dt * weatherSpec.farmSpeedMult;
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

      // 7. Throttle HUD state sync (~10 Hz)
      sim.hudSyncTimer += dt;
      if (sim.hudSyncTimer >= 0.1) {
        sim.hudSyncTimer = 0;
        setDaysRemaining(remaining);
        setDayProgress((sim.elapsedSec % SECONDS_PER_DAY) / SECONDS_PER_DAY);
        setHealth(sim.health);
        setHunger(sim.hunger);
        setThirst(sim.thirst);
        setTelemetry({
          x: px,
          y: py,
          z: pz,
          yaw: pyaw,
          stamina: pstamina,
        });
        setInRadiation(sim.inRadiation);
        setIsAcidRainExposed(sim.acidRainExposed);
        if (farmCount > 0 || pCount > 0) {
          setStructures((prev) => ({
            ...prev,
            farmTimerSec: sim.farmTimer,
            purifierAutoTimerSec: sim.purifierAutoTimer,
          }));
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

  const issueTeleport = useCallback(
    (x: number, z: number, label: string) => {
      setTeleportCommand((prev) => ({
        nonce: (prev?.nonce ?? 0) + 1,
        x,
        z,
      }));
      if (phase !== GamePhase.Playing) {
        setPhase(GamePhase.Playing);
      }
      pushToast(`Teleported to ${label}`, 'positive');
    },
    [phase, pushToast]
  );

  const allLoreIds = useMemo(() => LORE_LOGS.map((l) => l.id), []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-stone-950">
      <WastelandScene
        sessionId={sessionId}
        phase={phase}
        weather={weather}
        elapsedSecRef={elapsedSecRef}
        scavengeBurstRef={scavengeBurstRef}
        adminSpeedMult={speedBoost ? 2.5 : 1.0}
        teleportCommand={teleportCommand}
        nodesRef={nodesRef}
        hazards={hazards}
        structures={structures}
        discoveredLoreIds={discoveredLoreIds}
        flareUnlocked={flareUnlocked}
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
          weather={weather}
          daysRemaining={daysRemaining}
          dayProgress={dayProgress}
          health={health}
          hunger={hunger}
          thirst={thirst}
          telemetry={telemetry}
          inRadiation={inRadiation}
          isAcidRainExposed={isAcidRainExposed}
          inventory={inventory}
          flareUnlocked={flareUnlocked}
          structures={structures}
          hazards={hazards}
          terminals={terminalsSnapshot}
          discoveredLoreIds={discoveredLoreIds}
          totalLoreCount={LORE_LOGS.length}
          nearbyPrompt={nearbyPrompt}
          toasts={toasts}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenJournal={() => setJournalOpen(true)}
          onConsumeFood={handleConsumeFood}
          onConsumeWater={handleConsumeWater}
          onBuildShelter={handleBuildShelter}
          onBuildPurifier={handleBuildPurifier}
          onPurifyWater={handlePurifyWater}
          onBuildFarm={handleBuildFarm}
          onCraftFlare={handleCraftFlare}
          onActivateFlare={() => triggerFlareExtraction(telemetry.y)}
        />
      )}

      <LoreModal
        open={journalOpen && phase === GamePhase.Playing}
        onClose={() => setJournalOpen(false)}
        discoveredLoreIds={discoveredLoreIds}
      />

      {(phase === GamePhase.Victory || phase === GamePhase.GameOver) && (
        <EndScreens
          phase={phase}
          difficulty={difficulty}
          daysElapsed={finalDaysSurvived}
          logsRecovered={discoveredLoreIds.length}
          totalLogs={LORE_LOGS.length}
          victoryMethod={victoryMethod}
          deathCause={deathCause}
          onRetrySameDifficulty={() => startNewRun(difficulty)}
          onReturnToMenu={() => setPhase(GamePhase.Menu)}
        />
      )}

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        weather={weather}
        weatherLocked={weatherLocked}
        godMode={godMode}
        speedBoost={speedBoost}
        difficulty={difficulty}
        daysRemaining={daysRemaining}
        flareUnlocked={
          flareUnlocked ||
          inventory.signalFlare ||
          (inventory.scrapMetal >= 100 && inventory.chemicals >= 1)
        }
        logsCount={discoveredLoreIds.length}
        totalLogs={LORE_LOGS.length}
        onSetWeather={(w) => {
          weatherRef.current = w;
          setWeather(w);
          setWeatherLocked(true);
          if (w === WeatherType.AcidRain || w === WeatherType.AshStorm) {
            soundFX.playWeatherRumble();
          }
          pushToast(
            `Admin forced weather: ${WEATHER_CATALOG[w].label}`,
            'positive'
          );
        }}
        onToggleWeatherLock={() => setWeatherLocked((prev) => !prev)}
        onToggleGodMode={() => setGodMode((prev) => !prev)}
        onToggleSpeedBoost={() => setSpeedBoost((prev) => !prev)}
        onGrantFlareMaterials={() => {
          setInventory((prev) => ({
            ...prev,
            scrapMetal: prev.scrapMetal + 100,
            chemicals: prev.chemicals + 1,
          }));
          pushToast('Granted +100 Scrap Metal & +1 Chemicals', 'rare');
        }}
        onGrantAllResources={() => {
          setInventory((prev) => ({
            ...prev,
            scrapMetal: prev.scrapMetal + 50,
            wood: prev.wood + 50,
            cannedFood: prev.cannedFood + 50,
            dirtyWater: prev.dirtyWater + 50,
            cleanWater: prev.cleanWater + 50,
            chemicals: prev.chemicals + 5,
          }));
          pushToast('Granted +50 of all survival resources', 'positive');
        }}
        onUnlockAllLore={() => {
          setDiscoveredLoreIds(allLoreIds);
          soundFX.playLoreTerminal();
          pushToast('Unlocked all 12 Sector 09 Field Logs [J]', 'rare');
        }}
        onClearResources={() => {
          setInventory({
            scrapMetal: 0,
            wood: 0,
            cannedFood: 0,
            dirtyWater: 0,
            cleanWater: 0,
            chemicals: 0,
            signalFlare: false,
          });
          setFlareUnlocked(false);
          pushToast('Cleared inventory & hid Signal Flare option', 'neutral');
        }}
        onRefillVitals={() => {
          simRef.current.health = 100;
          simRef.current.hunger = 100;
          simRef.current.thirst = 100;
          simRef.current.starveDehydrateTimer = 0;
          setHealth(100);
          setHunger(100);
          setThirst(100);
          pushToast('Restored Health, Hunger & Thirst to 100', 'positive');
        }}
        onSetStarving={() => {
          simRef.current.hunger = 0;
          setHunger(0);
          pushToast('Set Hunger to 0', 'warning');
        }}
        onSetDehydrated={() => {
          simRef.current.thirst = 0;
          setThirst(0);
          pushToast('Set Thirst to 0', 'warning');
        }}
        onSkipDays={(days) => {
          simRef.current.elapsedSec += days * SECONDS_PER_DAY;
          elapsedSecRef.current = simRef.current.elapsedSec;
          const passed = Math.floor(
            simRef.current.elapsedSec / SECONDS_PER_DAY
          );
          const rem = Math.max(0, INITIAL_DAYS - passed);
          setDaysRemaining(rem);
          pushToast(`Skipped forward ${days} days (${rem} remaining)`, 'neutral');
        }}
        onSetDifficulty={(d) => {
          setDifficulty(d);
          if (d === Difficulty.Easy) {
            simRef.current.hunger = 100;
            simRef.current.thirst = 100;
            setHunger(100);
            setThirst(100);
          }
          pushToast(`Switched difficulty to ${d}`, 'positive');
        }}
        onTeleportBase={() => issueTeleport(0, 2, 'Base Camp')}
        onTeleportSpire={() =>
          issueTeleport(
            SPIRE_DECK.padX - 1.2,
            SPIRE_DECK.padZ,
            'High-Altitude Overpass Spire (7.4m)'
          )
        }
        onTeleportCrater={() => {
          if (hazards.length > 0) {
            issueTeleport(hazards[0].x, hazards[0].z, 'Radioactive Crater');
          }
        }}
        onBuildAllStructures={() => {
          setStructures((prev) => ({
            ...prev,
            shelter: true,
            purifierCount: 2,
            farmCount: 3,
          }));
          soundFX.playBuild();
          pushToast(
            'Constructed Shelter, 2 Water Purifiers & 3 Hydroponic Farms',
            'positive'
          );
        }}
        onResetScavengeCooldowns={() => {
          nodesRef.current.forEach((n) => {
            n.cooldownRemaining = 0;
          });
          pushToast('Reset all world scavenging node cooldowns', 'positive');
        }}
        onForceVictory={() => {
          setAdminOpen(false);
          setFinalDaysSurvived(INITIAL_DAYS);
          setVictoryMethod('countdown');
          setPhase(GamePhase.Victory);
        }}
      />
    </main>
  );
}
