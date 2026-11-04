import { LORE_LOGS } from '../data/lore';
import { HazardZone, WorldNode } from '../types/game';

export const WORLD_BOUNDS = 68;

// High-Altitude Overpass Comms Spire geometry specification:
// Ramp runs along X from x = 10 (y = 0) up to x = 28 (y = 7.4), centered at z = -26.
// Elevated Spire Platform sits at x in [28, 38], z in [-31, -21] at y = 7.4m.
export const SPIRE_RAMP = {
  startX: 10,
  endX: 28,
  centerZ: -26,
  halfWidth: 3.1,
  topY: 7.4,
};

export const SPIRE_DECK = {
  minX: 28,
  maxX: 38,
  minZ: -31,
  maxZ: -21,
  topY: 7.4,
  padX: 33.5,
  padZ: -26,
};

export const BASE_CAMP_SPOTS = {
  shelter: { x: -6.5, z: -7.5, rotationY: 0.35 },
  campfire: { x: -3.2, z: -4.8 },
  purifiers: [
    { x: -1.2, z: -8.6, rotationY: -0.25 },
    { x: 1.4, z: -9.2, rotationY: 0.4 },
  ],
  farms: [
    { x: 4.8, z: -7.5, rotationY: 0.1 },
    { x: 5.2, z: -3.8, rotationY: -0.15 },
    { x: 1.2, z: -4.2, rotationY: 0.25 },
  ],
};

export function isConcreteSurface(x: number, z: number): boolean {
  // Roads, Base Camp pad, or Overpass Spire/Ramp
  if (Math.abs(x) < 3.4 || Math.abs(z) < 3.4) return true;
  if (
    x >= SPIRE_RAMP.startX &&
    x <= SPIRE_DECK.maxX &&
    z >= SPIRE_DECK.minZ &&
    z <= SPIRE_DECK.maxZ
  ) {
    return true;
  }
  return false;
}

export function getSurfaceHeight(x: number, z: number): number {
  // Elevated spire deck
  if (
    x >= SPIRE_DECK.minX &&
    x <= SPIRE_DECK.maxX &&
    z >= SPIRE_DECK.minZ &&
    z <= SPIRE_DECK.maxZ
  ) {
    return SPIRE_DECK.topY;
  }

  // Sloped overpass ramp
  if (
    x >= SPIRE_RAMP.startX &&
    x <= SPIRE_RAMP.endX &&
    Math.abs(z - SPIRE_RAMP.centerZ) <= SPIRE_RAMP.halfWidth
  ) {
    const t = (x - SPIRE_RAMP.startX) / (SPIRE_RAMP.endX - SPIRE_RAMP.startX);
    return t * SPIRE_RAMP.topY;
  }

  // Subtle undulating wasteland ground outside main roads & base clearing
  const distFromOrigin = Math.hypot(x, z);
  if (distFromOrigin < 14 || Math.abs(x) < 3.6 || Math.abs(z) < 3.6) return 0;
  return Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.22;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateWastelandData(seed: number): {
  nodes: WorldNode[];
  hazards: HazardZone[];
} {
  const rand = seededRandom(seed);
  const nodes: WorldNode[] = [];
  const hazards: HazardZone[] = [];

  const isReservedArea = (x: number, z: number, minClearance: number): boolean => {
    // Player spawn & Base Camp zone
    if (x > -12.5 && x < 11.5 && z > -13.5 && z < 8.5) return true;

    // Spire ramp & deck footprint
    if (x > 6.5 && x < 42.5 && z > -35.5 && z < -16.5) return true;

    // Main cross-streets kept walkable
    if (minClearance > 2.2 && (Math.abs(x) < 3.8 || Math.abs(z) < 3.8)) {
      return true;
    }

    for (const n of nodes) {
      const dist = Math.hypot(x - n.x, z - n.z);
      if (dist < n.colliderRadius + minClearance + 1.4) return true;
    }
    for (const h of hazards) {
      const dist = Math.hypot(x - h.x, z - h.z);
      if (dist < h.radius + minClearance + 1.5) return true;
    }

    return false;
  };

  // 1. High-Altitude Spire Flare Pad node
  nodes.push({
    id: 'spire-flare-pad',
    kind: 'spire_pad',
    label: 'High-Altitude Broadcast Spire (7.4m)',
    x: SPIRE_DECK.padX,
    y: SPIRE_DECK.topY,
    z: SPIRE_DECK.padZ,
    interactRadius: 4.2,
    colliderRadius: 0.4,
    rotationY: 0,
    scale: 1,
    variant: 0,
    cooldownRemaining: 0,
    cooldownDuration: 0,
  });

  // 2. Place 6 Civil Defense Emergency Terminals across key landmarks
  const terminalPlacements: {
    x: number;
    z: number;
    rot: number;
    label: string;
    loreId: string;
  }[] = [
    {
      x: 5.5,
      z: 4.8,
      rot: -0.6,
      label: 'Civil Defense Relay #01 (Crossroads)',
      loreId: LORE_LOGS[0].id,
    },
    {
      x: 8.6,
      z: -21.2,
      rot: 0.3,
      label: 'DOT Overpass Terminal #02',
      loreId: LORE_LOGS[4].id,
    },
    {
      x: 30.2,
      z: -22.4,
      rot: -0.4,
      label: 'Spire Watchman Console #03',
      loreId: LORE_LOGS[5].id,
    },
    {
      x: -28.5,
      z: 5.2,
      rot: 1.2,
      label: 'West Avenue Weather Relay #04',
      loreId: LORE_LOGS[7].id,
    },
    {
      x: 4.8,
      z: 34.0,
      rot: -2.1,
      label: 'South Perimeter Telemetry Box #05',
      loreId: LORE_LOGS[9].id,
    },
    {
      x: -24.0,
      z: -32.0,
      rot: 0.75,
      label: 'Meridian Recon Terminal #06',
      loreId: LORE_LOGS[11].id,
    },
  ];

  terminalPlacements.forEach((tp, idx) => {
    const ty = getSurfaceHeight(tp.x, tp.z);
    nodes.push({
      id: `terminal-${idx}`,
      kind: 'terminal',
      label: tp.label,
      x: tp.x,
      y: ty,
      z: tp.z,
      interactRadius: 3.6,
      colliderRadius: 0.85,
      rotationY: tp.rot,
      scale: 1,
      variant: idx % 2,
      cooldownRemaining: 0,
      cooldownDuration: 60,
      loreId: tp.loreId,
    });
  });

  // 3. Generate 9 Radioactive Fallout Craters
  let hazardAttempts = 0;
  while (hazards.length < 9 && hazardAttempts < 320) {
    hazardAttempts++;
    const x = (rand() - 0.5) * 116;
    const z = (rand() - 0.5) * 116;
    if (Math.hypot(x, z) < 19) continue;
    if (isReservedArea(x, z, 4.2)) continue;
    hazards.push({
      id: `hazard-${hazards.length}`,
      x,
      z,
      radius: 3.2 + rand() * 1.1,
    });
  }

  // 4. Generate 42 Ruined Buildings with Oriented Bounding Box (OBB) dimensions
  let buildingAttempts = 0;
  let buildingCount = 0;
  const buildingNames = [
    'Collapsed Apartment Block',
    'Ruined Pharmacy Annex',
    'Shattered Civic Office',
    'Scorched Industrial Lab',
    'Crumbling Corner Tenement',
    'Bombed Department Store',
  ];
  while (buildingCount < 42 && buildingAttempts < 950) {
    buildingAttempts++;
    const x = (rand() - 0.5) * 124;
    const z = (rand() - 0.5) * 124;
    if (isReservedArea(x, z, 4.0)) continue;
    const variant = Math.floor(rand() * 4);
    const scale = 0.9 + rand() * 0.28;
    nodes.push({
      id: `building-${buildingCount}`,
      kind: 'building',
      label: buildingNames[buildingCount % buildingNames.length],
      x,
      y: getSurfaceHeight(x, z),
      z,
      interactRadius: 5.4,
      colliderRadius: 2.9 * scale,
      boxHalfW: 2.65 * scale,
      boxHalfD: 2.55 * scale,
      rotationY: Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.14,
      scale,
      variant,
      cooldownRemaining: 0,
      cooldownDuration: 55,
    });
    buildingCount++;
  }

  // 5. Generate 32 Rusted Vehicles with OBB hull dimensions
  let vehicleAttempts = 0;
  let vehicleCount = 0;
  const vehicleNames = [
    'Rusted Sedan Wreck',
    'Burned Transit Van',
    'Abandoned Armored Truck',
    'Overturned Station Wagon',
  ];
  while (vehicleCount < 32 && vehicleAttempts < 700) {
    vehicleAttempts++;
    const nearRoad = rand() < 0.55;
    let x = (rand() - 0.5) * 120;
    let z = (rand() - 0.5) * 120;
    if (nearRoad) {
      if (rand() < 0.5) {
        x = (rand() < 0.5 ? -1 : 1) * (2.3 + rand() * 2.4);
      } else {
        z = (rand() < 0.5 ? -1 : 1) * (2.3 + rand() * 2.4);
      }
    }
    if (isReservedArea(x, z, 2.0)) continue;
    const scale = 0.92 + rand() * 0.2;
    nodes.push({
      id: `vehicle-${vehicleCount}`,
      kind: 'vehicle',
      label: vehicleNames[vehicleCount % vehicleNames.length],
      x,
      y: getSurfaceHeight(x, z),
      z,
      interactRadius: 3.8,
      colliderRadius: 1.65 * scale,
      boxHalfW: 0.92 * scale,
      boxHalfD: 1.78 * scale,
      rotationY: rand() * Math.PI * 2,
      scale,
      variant: Math.floor(rand() * 3),
      cooldownRemaining: 0,
      cooldownDuration: 50,
    });
    vehicleCount++;
  }

  // 6. Generate 40 Salvageable Scrap Piles
  let scrapAttempts = 0;
  let scrapCount = 0;
  while (scrapCount < 40 && scrapAttempts < 800) {
    scrapAttempts++;
    const x = (rand() - 0.5) * 122;
    const z = (rand() - 0.5) * 122;
    if (isReservedArea(x, z, 1.6)) continue;
    nodes.push({
      id: `scrap-${scrapCount}`,
      kind: 'scrap',
      label: 'Twisted Scrap Pile',
      x,
      y: getSurfaceHeight(x, z),
      z,
      interactRadius: 3.5,
      colliderRadius: 1.15,
      rotationY: rand() * Math.PI * 2,
      scale: 0.85 + rand() * 0.35,
      variant: Math.floor(rand() * 3),
      cooldownRemaining: 0,
      cooldownDuration: 45,
    });
    scrapCount++;
  }

  // 7. Generate 38 Dead Timber / Scorched Tree Groves
  let timberAttempts = 0;
  let timberCount = 0;
  while (timberCount < 38 && timberAttempts < 800) {
    timberAttempts++;
    const x = (rand() - 0.5) * 124;
    const z = (rand() - 0.5) * 124;
    if (isReservedArea(x, z, 1.6)) continue;
    nodes.push({
      id: `timber-${timberCount}`,
      kind: 'timber',
      label: 'Charred Timber Deadfall',
      x,
      y: getSurfaceHeight(x, z),
      z,
      interactRadius: 3.5,
      colliderRadius: 1.05,
      rotationY: rand() * Math.PI * 2,
      scale: 0.85 + rand() * 0.4,
      variant: Math.floor(rand() * 3),
      cooldownRemaining: 0,
      cooldownDuration: 40,
    });
    timberCount++;
  }

  return { nodes, hazards };
}
