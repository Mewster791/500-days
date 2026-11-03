import { HazardZone, WorldNode } from '../types/game';

export const WORLD_BOUNDS = 68;

// High-Altitude Overpass Comms Spire geometry specification:
// Located in the North-East quadrant so the player can visibly see it and climb the highway ramp.
// Ramp runs along X from x = 10 (y = 0) up to x = 28 (y = 7.4), centered at z = -26 (width 6.4m: z in [-29.2, -22.8]).
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
  purifier: { x: -1.2, z: -8.5, rotationY: -0.25 },
  farm: { x: 4.5, z: -7.5, rotationY: 0.1 },
};

export function getSurfaceHeight(x: number, z: number): number {
  // Check elevated spire deck
  if (
    x >= SPIRE_DECK.minX &&
    x <= SPIRE_DECK.maxX &&
    z >= SPIRE_DECK.minZ &&
    z <= SPIRE_DECK.maxZ
  ) {
    return SPIRE_DECK.topY;
  }

  // Check sloped overpass ramp
  if (
    x >= SPIRE_RAMP.startX &&
    x <= SPIRE_RAMP.endX &&
    Math.abs(z - SPIRE_RAMP.centerZ) <= SPIRE_RAMP.halfWidth
  ) {
    const t = (x - SPIRE_RAMP.startX) / (SPIRE_RAMP.endX - SPIRE_RAMP.startX);
    return t * SPIRE_RAMP.topY;
  }

  // Subtle undulating wasteland ground outside main roads
  const distFromOrigin = Math.hypot(x, z);
  if (distFromOrigin < 13) return 0;
  return (Math.sin(x * 0.08) * Math.cos(z * 0.08)) * 0.18;
}

export function isPositionBlockedBySpireWalls(
  x: number,
  z: number,
  currentY: number
): boolean {
  // Prevent walking through the vertical side walls of the elevated spire deck from ground level
  const inDeckXZ =
    x >= SPIRE_DECK.minX - 0.7 &&
    x <= SPIRE_DECK.maxX + 0.7 &&
    z >= SPIRE_DECK.minZ - 0.7 &&
    z <= SPIRE_DECK.maxZ + 0.7;

  if (inDeckXZ && currentY < SPIRE_DECK.topY - 1.6) {
    return true;
  }

  const inRampXZ =
    x >= SPIRE_RAMP.startX + 2.0 &&
    x <= SPIRE_RAMP.endX &&
    Math.abs(z - SPIRE_RAMP.centerZ) <= SPIRE_RAMP.halfWidth + 0.6;

  if (inRampXZ) {
    const rampY =
      ((x - SPIRE_RAMP.startX) / (SPIRE_RAMP.endX - SPIRE_RAMP.startX)) *
      SPIRE_RAMP.topY;
    if (rampY - currentY > 1.8) {
      return true;
    }
  }

  return false;
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
    // Player spawn & Base Camp zone around (0, 0) and (-8..8, -12..6)
    if (x > -12 && x < 11 && z > -13 && z < 8) return true;

    // Spire ramp & deck footprint
    if (x > 7 && x < 42 && z > -35 && z < -17) return true;

    // Main cross-streets kept walkable (with vehicles/scrap allowed near curbs)
    if (minClearance > 2.4 && (Math.abs(x) < 3.6 || Math.abs(z) < 3.6)) {
      return true;
    }

    // Existing nodes spacing
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

  // 1. Add the High-Altitude Spire Flare Pad node
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

  // 2. Generate 9 Radioactive Fallout Craters (away from spawn & main crossroad center)
  let hazardAttempts = 0;
  while (hazards.length < 9 && hazardAttempts < 300) {
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

  // 3. Generate 42 Ruined Buildings across city blocks (2% chance of Chemicals per scavenge!)
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
  while (buildingCount < 42 && buildingAttempts < 900) {
    buildingAttempts++;
    const x = (rand() - 0.5) * 124;
    const z = (rand() - 0.5) * 124;
    if (isReservedArea(x, z, 4.0)) continue;
    const variant = Math.floor(rand() * 4);
    nodes.push({
      id: `building-${buildingCount}`,
      kind: 'building',
      label: buildingNames[buildingCount % buildingNames.length],
      x,
      y: getSurfaceHeight(x, z),
      z,
      interactRadius: 5.2,
      colliderRadius: 2.9,
      rotationY: Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.15,
      scale: 0.9 + rand() * 0.3,
      variant,
      cooldownRemaining: 0,
      cooldownDuration: 55, // Replenishes shifting rubble roughly every ~1 in-game day
    });
    buildingCount++;
  }

  // 4. Generate 32 Rusted Vehicles along streets and intersections
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
    // Bias vehicles somewhat near roads or open avenues
    const nearRoad = rand() < 0.55;
    let x = (rand() - 0.5) * 120;
    let z = (rand() - 0.5) * 120;
    if (nearRoad) {
      if (rand() < 0.5) {
        x = (rand() < 0.5 ? -1 : 1) * (2.2 + rand() * 2.5);
      } else {
        z = (rand() < 0.5 ? -1 : 1) * (2.2 + rand() * 2.5);
      }
    }
    if (isReservedArea(x, z, 2.0)) continue;
    nodes.push({
      id: `vehicle-${vehicleCount}`,
      kind: 'vehicle',
      label: vehicleNames[vehicleCount % vehicleNames.length],
      x,
      y: getSurfaceHeight(x, z),
      z,
      interactRadius: 3.8,
      colliderRadius: 1.55,
      rotationY: rand() * Math.PI * 2,
      scale: 0.92 + rand() * 0.2,
      variant: Math.floor(rand() * 3),
      cooldownRemaining: 0,
      cooldownDuration: 50,
    });
    vehicleCount++;
  }

  // 5. Generate 40 Salvageable Scrap Piles
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

  // 6. Generate 38 Dead Timber / Scorched Tree Groves (natural wood resource nodes)
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
