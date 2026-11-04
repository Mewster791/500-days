import * as THREE from 'three';
import {
  BaseStructures,
  WEATHER_CATALOG,
  WeatherType,
  WorldNode,
} from '../types/game';
import {
  SPIRE_DECK,
  SPIRE_RAMP,
  WORLD_BOUNDS,
  getSurfaceHeight,
} from './worldGen';

export interface CharacterPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  stamina: number;
  grounded: boolean;
  coyoteTimer: number;
  peakAirY: number;
  squashY: number;
  stepDistanceAccum: number;
}

export interface PhysicsStepResult {
  jumped: boolean;
  landed: boolean;
  hardLandingDamage: number;
  footstepTriggered: boolean;
}

export function createInitialPhysicsState(): CharacterPhysicsState {
  return {
    x: 0,
    y: 0,
    z: 2,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    stamina: 100,
    grounded: true,
    coyoteTimer: 0,
    peakAirY: 0,
    squashY: 1,
    stepDistanceAccum: 0,
  };
}

// Resolve circle-vs-rotated-box (OBB) pushback in 2D XZ plane
function resolveCircleOBB(
  px: number,
  pz: number,
  radius: number,
  bx: number,
  bz: number,
  halfW: number,
  halfD: number,
  rotY: number
): [number, number] {
  const dx = px - bx;
  const dz = pz - bz;
  const cos = Math.cos(-rotY);
  const sin = Math.sin(-rotY);

  // Transform player center into box local space
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;

  const clampedX = THREE.MathUtils.clamp(lx, -halfW, halfW);
  const clampedZ = THREE.MathUtils.clamp(lz, -halfD, halfD);

  const penX = lx - clampedX;
  const penZ = lz - clampedZ;
  const distSq = penX * penX + penZ * penZ;

  if (distSq >= radius * radius) {
    return [px, pz];
  }

  let pushLocalX = 0;
  let pushLocalZ = 0;

  if (distSq > 0.00001) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    pushLocalX = (penX / dist) * overlap;
    pushLocalZ = (penZ / dist) * overlap;
  } else {
    // Center is inside box; push out along shallowest axis
    const overlapX = halfW + radius - Math.abs(lx);
    const overlapZ = halfD + radius - Math.abs(lz);
    if (overlapX < overlapZ) {
      pushLocalX = lx >= 0 ? overlapX : -overlapX;
    } else {
      pushLocalZ = lz >= 0 ? overlapZ : -overlapZ;
    }
  }

  // Transform push vector back to world space
  const cosW = Math.cos(rotY);
  const sinW = Math.sin(rotY);
  const worldPushX = pushLocalX * cosW - pushLocalZ * sinW;
  const worldPushZ = pushLocalX * sinW + pushLocalZ * cosW;

  return [px + worldPushX, pz + worldPushZ];
}

function resolveSpireStructureWalls(
  nextX: number,
  nextZ: number,
  prevX: number,
  prevZ: number,
  currentY: number
): [number, number] {
  // Prevent walking horizontally *into* the vertical concrete walls of the Spire Deck/Ramp from below,
  // while allowing jumping/walking *off* the top edge freely so real gravity applies!
  const targetSurface = getSurfaceHeight(nextX, nextZ);
  const stepDelta = targetSurface - currentY;

  if (stepDelta > 1.35) {
    // Try sliding along X or Z independently
    const surfSlideX = getSurfaceHeight(nextX, prevZ);
    const surfSlideZ = getSurfaceHeight(prevX, nextZ);
    if (surfSlideX - currentY <= 1.35) {
      return [nextX, prevZ];
    }
    if (surfSlideZ - currentY <= 1.35) {
      return [prevX, nextZ];
    }
    return [prevX, prevZ];
  }

  // Concrete safety curbs on North & South sides of the sloped Ramp when climbing
  if (
    nextX >= SPIRE_RAMP.startX + 1.0 &&
    nextX <= SPIRE_RAMP.endX - 0.4 &&
    currentY > 1.2 &&
    Math.abs(prevZ - SPIRE_RAMP.centerZ) <= SPIRE_RAMP.halfWidth
  ) {
    const guardrailLimit = SPIRE_RAMP.halfWidth - 0.32;
    const clampedZ = THREE.MathUtils.clamp(
      nextZ,
      SPIRE_RAMP.centerZ - guardrailLimit,
      SPIRE_RAMP.centerZ + guardrailLimit
    );
    return [nextX, clampedZ];
  }

  // Intact North/West/South guardrails on Spire Deck (Eastern sheared span left open as dramatic cliff!)
  if (
    prevX >= SPIRE_DECK.minX &&
    prevX <= SPIRE_DECK.maxX &&
    prevZ >= SPIRE_DECK.minZ &&
    prevZ <= SPIRE_DECK.maxZ &&
    currentY >= SPIRE_DECK.topY - 0.6
  ) {
    let rx = nextX;
    let rz = nextZ;
    // North & South intact jersey barriers
    rz = THREE.MathUtils.clamp(
      rz,
      SPIRE_DECK.minZ + 0.45,
      SPIRE_DECK.maxZ - 0.45
    );
    // West wall outside the ramp mouth
    if (
      rx < SPIRE_DECK.minX + 0.35 &&
      Math.abs(rz - SPIRE_RAMP.centerZ) > SPIRE_RAMP.halfWidth - 0.35
    ) {
      rx = SPIRE_DECK.minX + 0.35;
    }
    return [rx, rz];
  }

  return [nextX, nextZ];
}

export function stepCharacterPhysics(
  state: CharacterPhysicsState,
  dt: number,
  inputDirX: number,
  inputDirZ: number,
  wantsSprint: boolean,
  wantsJump: boolean,
  weather: WeatherType,
  adminSpeedMult: number,
  nodes: WorldNode[],
  structures: BaseStructures
): PhysicsStepResult {
  const result: PhysicsStepResult = {
    jumped: false,
    landed: false,
    hardLandingDamage: 0,
    footstepTriggered: false,
  };

  const weatherSpec = WEATHER_CATALOG[weather];
  const hasMoveInput = inputDirX * inputDirX + inputDirZ * inputDirZ > 0.001;

  // 1. Stamina Management
  let sprintMultiplier = 1.0;
  if (wantsSprint && hasMoveInput && state.stamina > 3) {
    sprintMultiplier = 1.44;
    state.stamina = Math.max(0, state.stamina - dt * 24);
  } else {
    const regenRate = hasMoveInput ? 11 : 22;
    state.stamina = Math.min(100, state.stamina + dt * regenRate);
  }

  // 2. Slope Gradient Estimation (slow slightly uphill, slight momentum downhill)
  let slopeFactor = 1.0;
  if (hasMoveInput && state.grounded) {
    const hHere = getSurfaceHeight(state.x, state.z);
    const hAhead = getSurfaceHeight(
      state.x + inputDirX * 0.8,
      state.z + inputDirZ * 0.8
    );
    const grade = (hAhead - hHere) / 0.8;
    if (grade > 0.08) {
      slopeFactor = THREE.MathUtils.clamp(1.0 - grade * 0.35, 0.76, 1.0);
    } else if (grade < -0.08) {
      slopeFactor = THREE.MathUtils.clamp(1.0 - grade * 0.18, 1.0, 1.12);
    }
  }

  // 3. Horizontal Acceleration, Friction & Weather Crosswind Forces
  const maxSpeed =
    9.2 *
    weatherSpec.moveSpeedMult *
    sprintMultiplier *
    slopeFactor *
    adminSpeedMult;

  const traction = (state.grounded ? 11.5 : 3.2) * weatherSpec.frictionMult;
  const targetVx = inputDirX * maxSpeed + (hasMoveInput ? weatherSpec.windForceX * 0.28 : 0);
  const targetVz = inputDirZ * maxSpeed + (hasMoveInput ? weatherSpec.windForceZ * 0.28 : 0);

  state.vx = THREE.MathUtils.damp(state.vx, targetVx, traction, dt);
  state.vz = THREE.MathUtils.damp(state.vz, targetVz, traction, dt);

  // Subtle passive gale buffeting when standing exposed in Heavy Ash Storm
  if (!hasMoveInput && Math.abs(weatherSpec.windForceX) > 2.5 && state.grounded) {
    state.vx += weatherSpec.windForceX * 0.12 * dt;
    state.vz += weatherSpec.windForceZ * 0.12 * dt;
  }

  // 4. Integrate XZ & Resolve Sliding Collisions (OBB + Radial + Spire Walls)
  const prevX = state.x;
  const prevZ = state.z;
  let nextX = THREE.MathUtils.clamp(
    state.x + state.vx * dt,
    -WORLD_BOUNDS,
    WORLD_BOUNDS
  );
  let nextZ = THREE.MathUtils.clamp(
    state.z + state.vz * dt,
    -WORLD_BOUNDS,
    WORLD_BOUNDS
  );

  [nextX, nextZ] = resolveSpireStructureWalls(
    nextX,
    nextZ,
    prevX,
    prevZ,
    state.y
  );

  const playerRadius = 0.52;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.colliderRadius <= 0) continue;
    if (n.kind === 'shelter' && !structures.shelter) continue;
    if (n.kind === 'purifier' && structures.purifierCount === 0) continue;
    if (n.kind === 'farm' && structures.farmCount === 0) continue;
    if (Math.abs(state.y - n.y) > 3.2) continue;

    // Broadphase skip
    const bdx = nextX - n.x;
    const bdz = nextZ - n.z;
    if (bdx * bdx + bdz * bdz > (n.colliderRadius + 2.2) ** 2) continue;

    if (n.boxHalfW && n.boxHalfD) {
      [nextX, nextZ] = resolveCircleOBB(
        nextX,
        nextZ,
        playerRadius,
        n.x,
        n.z,
        n.boxHalfW,
        n.boxHalfD,
        n.rotationY
      );
    } else {
      const dist = Math.hypot(bdx, bdz);
      const minSep = n.colliderRadius + playerRadius;
      if (dist < minSep && dist > 0.0001) {
        const push = (minSep - dist) / dist;
        nextX += bdx * push;
        nextZ += bdz * push;
      }
    }
  }

  // Update actual velocity after wall slide so player doesn't accumulate ghost speed into walls
  if (dt > 0.0001) {
    state.vx = (nextX - prevX) / dt;
    state.vz = (nextZ - prevZ) / dt;
  }
  state.x = nextX;
  state.z = nextZ;

  // 5. Vertical Ballistic Physics: Gravity, Coyote Time, Jump & Fall Impact
  const floorY = getSurfaceHeight(state.x, state.z);

  if (state.grounded) {
    state.coyoteTimer = 0.12;
  } else {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }

  if (wantsJump && state.coyoteTimer > 0) {
    state.vy = 8.3;
    state.grounded = false;
    state.coyoteTimer = 0;
    state.peakAirY = state.y;
    state.squashY = 1.18;
    result.jumped = true;
  }

  if (!state.grounded) {
    // Track highest altitude reached during jump/fall for fall-damage calculation
    state.vy -= 25.5 * dt;
    state.y += state.vy * dt;
    if (state.y > state.peakAirY) {
      state.peakAirY = state.y;
    }

    if (state.y <= floorY) {
      const dropDistance = state.peakAirY - floorY;
      state.y = floorY;
      state.vy = 0;
      state.grounded = true;
      result.landed = true;

      if (dropDistance > 4.8) {
        // Falling off the 7.4m Overpass cliff deals realistic fall impact damage
        result.hardLandingDamage = Math.round((dropDistance - 4.2) * 11);
        state.squashY = 0.72;
      } else {
        state.squashY = 0.86;
      }
      state.peakAirY = floorY;
    }
  } else {
    // Check if player walked off a ledge > 0.55m drop
    if (state.y - floorY > 0.55) {
      state.grounded = false;
      state.vy = 0;
      state.peakAirY = state.y;
    } else {
      state.y = THREE.MathUtils.damp(state.y, floorY, 22, dt);
      state.peakAirY = state.y;
    }
  }

  // Smoothly recover landing squash-and-stretch
  state.squashY = THREE.MathUtils.damp(state.squashY, 1.0, 14, dt);

  // 6. Character Facing & Footstep Stride Cadence
  const horizSpeed = Math.hypot(state.vx, state.vz);
  if (hasMoveInput) {
    const targetYaw = Math.atan2(inputDirX, inputDirZ);
    let diff = targetYaw - state.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.yaw += diff * Math.min(1, dt * 15);
  }

  if (state.grounded && horizSpeed > 0.8) {
    state.stepDistanceAccum += horizSpeed * dt;
    const strideLen = sprintMultiplier > 1.1 ? 2.15 : 1.75;
    if (state.stepDistanceAccum >= strideLen) {
      state.stepDistanceAccum -= strideLen;
      result.footstepTriggered = true;
    }
  } else {
    state.stepDistanceAccum = 0.9;
  }

  return result;
}
