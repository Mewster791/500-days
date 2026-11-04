import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BaseStructures,
  GamePhase,
  HazardZone,
  NearbyPrompt,
  SECONDS_PER_DAY,
  TeleportCommand,
  WEATHER_CATALOG,
  WeatherType,
  WorldNode,
} from '../types/game';
import { soundFX } from '../utils/audio';
import {
  createInitialPhysicsState,
  stepCharacterPhysics,
} from '../utils/physics';
import {
  BASE_CAMP_SPOTS,
  WORLD_BOUNDS,
  getSurfaceHeight,
  isConcreteSurface,
} from '../utils/worldGen';
import {
  createCampfireBrazier,
  createCivilDefenseTerminal,
  createDeadTimber,
  createFarmStructure,
  createGroundTexture,
  createHazardCrater,
  createHighAltitudeSpire,
  createMaterialPalette,
  createPurifierStructure,
  createRuinedBuilding,
  createRustedVehicle,
  createScrapPile,
  createShelterStructure,
  createStreetLamp,
  createSurvivorRig,
} from './models';

// Pre-allocated math helpers outside the render loop (Zero GC)
const _moveDir = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _daySunColor = new THREE.Color(0xffe1b5);
const _duskSunColor = new THREE.Color(0xd96b38);
const _nightSunColor = new THREE.Color(0x475569);
const _dayFogColor = new THREE.Color(0x413c35);
const _duskFogColor = new THREE.Color(0x362822);
const _nightFogColor = new THREE.Color(0x16181d);
const _acidTint = new THREE.Color(0x2f3b26);
const _ashTint = new THREE.Color(0x34312e);
const _heatTint = new THREE.Color(0x5c3a21);
const _workColor = new THREE.Color();
const _workColor2 = new THREE.Color();
const _debrisDummy = new THREE.Object3D();

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

interface DebrisParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  vSpin: number;
  scale: number;
  life: number;
  maxLife: number;
}

interface WastelandSceneProps {
  sessionId: number;
  phase: GamePhase;
  weather: WeatherType;
  elapsedSecRef: React.MutableRefObject<number>;
  scavengeBurstRef: React.MutableRefObject<{
    nonce: number;
    nodeId: string;
  } | null>;
  adminSpeedMult: number;
  teleportCommand: TeleportCommand | null;
  nodesRef: React.MutableRefObject<WorldNode[]>;
  hazards: HazardZone[];
  structures: BaseStructures;
  discoveredLoreIds: string[];
  flareUnlocked: boolean;
  hasSignalFlare: boolean;
  flareLaunching: boolean;
  onFrameTick: (
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    playerYaw: number,
    stamina: number,
    inRadiation: boolean,
    fallDamage: number
  ) => void;
  onNearbyChange: (prompt: NearbyPrompt | null) => void;
  onInteractNode: (nodeId: string, playerAltitude: number) => void;
}

export const WastelandScene: React.FC<WastelandSceneProps> = ({
  sessionId,
  phase,
  weather,
  elapsedSecRef,
  scavengeBurstRef,
  adminSpeedMult,
  teleportCommand,
  nodesRef,
  hazards,
  structures,
  discoveredLoreIds,
  flareUnlocked,
  hasSignalFlare,
  flareLaunching,
  onFrameTick,
  onNearbyChange,
  onInteractNode,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  const adminSpeedMultRef = useRef(adminSpeedMult);
  adminSpeedMultRef.current = adminSpeedMult;

  const teleportRef = useRef<TeleportCommand | null>(teleportCommand);
  teleportRef.current = teleportCommand;

  const discoveredLoreRef = useRef<string[]>(discoveredLoreIds);
  discoveredLoreRef.current = discoveredLoreIds;

  const flareUnlockedRef = useRef(flareUnlocked);
  flareUnlockedRef.current = flareUnlocked;

  const hasFlareRef = useRef(hasSignalFlare);
  hasFlareRef.current = hasSignalFlare;

  const flareLaunchingRef = useRef(flareLaunching);
  flareLaunchingRef.current = flareLaunching;

  const structuresRef = useRef(structures);
  structuresRef.current = structures;

  const callbacksRef = useRef({
    onFrameTick,
    onNearbyChange,
    onInteractNode,
  });
  callbacksRef.current = { onFrameTick, onNearbyChange, onInteractNode };

  const baseMeshesRef = useRef<{
    shelterGroup: THREE.Group | null;
    campfireGroup: THREE.Group | null;
    purifierGroups: THREE.Group[];
    farmGroups: THREE.Group[];
  }>({
    shelterGroup: null,
    campfireGroup: null,
    purifierGroups: [],
    farmGroups: [],
  });

  // Sync built base structures visibility immediately when crafted
  useEffect(() => {
    const bm = baseMeshesRef.current;
    if (bm.shelterGroup) bm.shelterGroup.visible = structures.shelter;
    if (bm.campfireGroup) bm.campfireGroup.visible = structures.shelter;
    bm.purifierGroups.forEach((grp, idx) => {
      grp.visible = structures.purifierCount > idx;
    });
    bm.farmGroups.forEach((grp, idx) => {
      grp.visible = structures.farmCount > idx;
    });
  }, [structures.shelter, structures.purifierCount, structures.farmCount]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3a352f);
    const fog = new THREE.FogExp2(0x3a352f, 0.0115);
    scene.fog = fog;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.5, 220);
    camera.position.set(22, 24, 22);
    camera.lookAt(0, 0, 0);

    // 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x9ca3af, 0x3b3129, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe1b5, 1.85);
    keyLight.position.set(28, 38, 18);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(2048, 2048);
      const d = 38;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 115;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);
    scene.add(keyLight.target);

    const rimLight = new THREE.DirectionalLight(0x6ee7b7, 0.42);
    rimLight.position.set(-24, 18, -26);
    scene.add(rimLight);

    const mats = createMaterialPalette(isSoftwareGl);
    const groundTex = createGroundTexture(renderer);

    // Expansive Wasteland Terrain Plane
    const groundGeo = new THREE.PlaneGeometry(280, 280, 56, 56);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(
        i,
        vx > 8 && vx < 40 && vz > -34 && vz < -18
          ? 0
          : getSurfaceHeight(vx, vz)
      );
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.94,
      metalness: 0.04,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Cracked City Crossroads Asphalt Strips + Dashed Lane Lines
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x232220,
      roughness: 0.9,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(160, 6.6), roadMat);
    roadEW.rotation.x = -Math.PI / 2;
    roadEW.position.y = 0.03;
    roadEW.receiveShadow = true;
    scene.add(roadEW);

    const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 160), roadMat);
    roadNS.rotation.x = -Math.PI / 2;
    roadNS.position.y = 0.035;
    roadNS.receiveShadow = true;
    scene.add(roadNS);

    // Weathered Avenue Streetlamps along Main Crossroads
    const lampPositions: [number, number, number][] = [
      [-18, -4.1, 0],
      [18, 4.1, Math.PI],
      [-38, 4.1, Math.PI],
      [42, -4.1, 0],
      [-4.1, 20, Math.PI / 2],
      [4.1, -20, -Math.PI / 2],
      [-4.1, -42, Math.PI / 2],
      [4.1, 44, -Math.PI / 2],
    ];
    lampPositions.forEach(([lx, lz, lrot], idx) => {
      const lamp = createStreetLamp(mats, idx % 3 === 0);
      lamp.position.set(lx, getSurfaceHeight(lx, lz), lz);
      lamp.rotation.y = lrot;
      scene.add(lamp);
    });

    // Base Camp Clearing Marker Pad
    const campRing = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 7.55, 32),
      new THREE.MeshBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    campRing.rotation.x = -Math.PI / 2;
    campRing.position.set(-0.6, 0.05, -6.5);
    scene.add(campRing);

    // Outer Natural Rocky Crags Perimeter via InstancedMesh (> 20 instances)
    const cragCount = 68;
    const cragGeo = new THREE.DodecahedronGeometry(3.6, 0);
    cragGeo.translate(0, 1.4, 0);
    const cragMat = new THREE.MeshStandardMaterial({
      color: 0x4b4640,
      roughness: 0.92,
      metalness: 0.06,
      flatShading: true,
    });
    const cragInstanced = new THREE.InstancedMesh(cragGeo, cragMat, cragCount);
    cragInstanced.castShadow = !isSoftwareGl;
    cragInstanced.receiveShadow = true;
    for (let i = 0; i < cragCount; i++) {
      const angle = (i / cragCount) * Math.PI * 2;
      const dist = WORLD_BOUNDS + 5.5 + (i % 3) * 2.4;
      _debrisDummy.position.set(
        Math.cos(angle) * dist,
        -0.3,
        Math.sin(angle) * dist
      );
      _debrisDummy.rotation.set(
        (i % 5) * 0.12,
        angle + i * 0.5,
        ((i + 2) % 4) * 0.1
      );
      const s = 0.85 + (i % 5) * 0.22;
      _debrisDummy.scale.set(s * 1.2, s * (1.1 + (i % 3) * 0.45), s);
      _debrisDummy.updateMatrix();
      cragInstanced.setMatrixAt(i, _debrisDummy.matrix);

      const shade = 0.82 + (i % 4) * 0.08;
      _workColor.setRGB(0.32 * shade, 0.3 * shade, 0.27 * shade);
      cragInstanced.setColorAt(i, _workColor);
    }
    cragInstanced.instanceMatrix.needsUpdate = true;
    if (cragInstanced.instanceColor) cragInstanced.instanceColor.needsUpdate = true;
    cragInstanced.computeBoundingSphere();
    scene.add(cragInstanced);

    // High-Altitude Overpass Comms Spire Landmark
    const spireGroup = createHighAltitudeSpire(mats);
    scene.add(spireGroup);

    // Radioactive Fallout Craters
    hazards.forEach((hz) => {
      const crater = createHazardCrater(mats, hz.radius);
      crater.position.set(hz.x, getSurfaceHeight(hz.x, hz.z), hz.z);
      scene.add(crater);
    });

    // Populate Scavengeable World Nodes & Civil Defense Terminals
    const nodeMeshMap = new Map<string, THREE.Group>();
    const nodeShakeTimer = new Map<string, number>();

    nodesRef.current.forEach((node) => {
      if (
        node.kind === 'spire_pad' ||
        node.kind === 'shelter' ||
        node.kind === 'purifier' ||
        node.kind === 'farm'
      ) {
        return;
      }

      let meshGroup: THREE.Group;
      if (node.kind === 'terminal') {
        meshGroup = createCivilDefenseTerminal(mats);
      } else if (node.kind === 'building') {
        meshGroup = createRuinedBuilding(mats, node.variant);
      } else if (node.kind === 'vehicle') {
        meshGroup = createRustedVehicle(mats, node.variant);
      } else if (node.kind === 'scrap') {
        meshGroup = createScrapPile(mats);
      } else {
        meshGroup = createDeadTimber(mats);
      }

      meshGroup.position.set(node.x, node.y, node.z);
      meshGroup.rotation.y = node.rotationY;
      meshGroup.scale.setScalar(node.scale);
      scene.add(meshGroup);
      nodeMeshMap.set(node.id, meshGroup);
    });

    // Pre-create Multi-Plot Base Camp Structures
    const shelterMesh = createShelterStructure(mats);
    shelterMesh.position.set(
      BASE_CAMP_SPOTS.shelter.x,
      0,
      BASE_CAMP_SPOTS.shelter.z
    );
    shelterMesh.rotation.y = BASE_CAMP_SPOTS.shelter.rotationY;
    shelterMesh.visible = structuresRef.current.shelter;
    scene.add(shelterMesh);

    const campfire = createCampfireBrazier(mats);
    campfire.group.position.set(
      BASE_CAMP_SPOTS.campfire.x,
      0,
      BASE_CAMP_SPOTS.campfire.z
    );
    campfire.group.visible = structuresRef.current.shelter;
    scene.add(campfire.group);

    const purifierGroups = BASE_CAMP_SPOTS.purifiers.map((spot, idx) => {
      const m = createPurifierStructure(mats);
      m.position.set(spot.x, 0, spot.z);
      m.rotation.y = spot.rotationY;
      m.visible = structuresRef.current.purifierCount > idx;
      scene.add(m);
      return m;
    });

    const farmGroups = BASE_CAMP_SPOTS.farms.map((spot, idx) => {
      const m = createFarmStructure(mats);
      m.position.set(spot.x, 0, spot.z);
      m.rotation.y = spot.rotationY;
      m.visible = structuresRef.current.farmCount > idx;
      scene.add(m);
      return m;
    });

    baseMeshesRef.current = {
      shelterGroup: shelterMesh,
      campfireGroup: campfire.group,
      purifierGroups,
      farmGroups,
    };

    // Player Survivor Rig
    const survivor = createSurvivorRig(mats);
    survivor.group.position.set(0, 0, 2);
    scene.add(survivor.group);

    // 3D Bouncing Physics Debris Pool (36 instanced low-poly chunks for scavenge & footstep impacts)
    const DEBRIS_POOL_SIZE = 36;
    const debrisGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x8b7e72,
      roughness: 0.75,
      metalness: 0.35,
      flatShading: true,
    });
    const debrisInstanced = new THREE.InstancedMesh(
      debrisGeo,
      debrisMat,
      DEBRIS_POOL_SIZE
    );
    debrisInstanced.frustumCulled = false;
    const debrisPool: DebrisParticle[] = [];
    for (let i = 0; i < DEBRIS_POOL_SIZE; i++) {
      debrisPool.push({
        active: false,
        x: 0,
        y: -20,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        vSpin: 0,
        scale: 0,
        life: 0,
        maxLife: 1,
      });
      _debrisDummy.position.set(0, -20, 0);
      _debrisDummy.scale.setScalar(0);
      _debrisDummy.updateMatrix();
      debrisInstanced.setMatrixAt(i, _debrisDummy.matrix);
      debrisInstanced.setColorAt(i, _workColor.setHex(0x8b7e72));
    }
    debrisInstanced.instanceMatrix.needsUpdate = true;
    scene.add(debrisInstanced);

    let debrisCursor = 0;
    const spawnDebrisBurst = (
      bx: number,
      by: number,
      bz: number,
      count: number,
      power: number,
      tintHex: number
    ) => {
      for (let c = 0; c < count; c++) {
        const p = debrisPool[debrisCursor];
        const idx = debrisCursor;
        debrisCursor = (debrisCursor + 1) % DEBRIS_POOL_SIZE;

        const angle = Math.random() * Math.PI * 2;
        const speed = (0.35 + Math.random() * 0.75) * power;
        p.active = true;
        p.x = bx + (Math.random() - 0.5) * 0.6;
        p.y = by + 0.35 + Math.random() * 0.4;
        p.z = bz + (Math.random() - 0.5) * 0.6;
        p.vx = Math.cos(angle) * speed;
        p.vy = (1.1 + Math.random() * 1.1) * power;
        p.vz = Math.sin(angle) * speed;
        p.rx = Math.random() * Math.PI;
        p.ry = Math.random() * Math.PI;
        p.vSpin = (Math.random() - 0.5) * 14;
        p.scale = 0.55 + Math.random() * 0.75;
        p.life = 0;
        p.maxLife = 0.75 + Math.random() * 0.55;

        debrisInstanced.setColorAt(idx, _workColor.setHex(tintHex));
      }
      if (debrisInstanced.instanceColor) {
        debrisInstanced.instanceColor.needsUpdate = true;
      }
    };

    // Dynamic 3D Weather Particle System
    const WEATHER_PARTICLE_COUNT = 440;
    const weatherOffsets = new Float32Array(WEATHER_PARTICLE_COUNT * 3);
    const weatherWorldPos = new Float32Array(WEATHER_PARTICLE_COUNT * 3);
    for (let i = 0; i < WEATHER_PARTICLE_COUNT; i++) {
      weatherOffsets[i * 3] = (Math.random() - 0.5) * 44;
      weatherOffsets[i * 3 + 1] = Math.random() * 18;
      weatherOffsets[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const weatherGeo = new THREE.BufferGeometry();
    const weatherPosAttr = new THREE.BufferAttribute(weatherWorldPos, 3);
    weatherGeo.setAttribute('position', weatherPosAttr);
    const weatherMat = new THREE.PointsMaterial({
      color: 0xa3e635,
      size: 0.22,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
    weatherPoints.frustumCulled = false;
    scene.add(weatherPoints);

    // Ground Interaction Selection Ring
    const interactRing = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.62, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    interactRing.rotation.x = -Math.PI / 2;
    interactRing.visible = false;
    scene.add(interactRing);

    // Signal Flare Rocket Projectile
    const flareRocket = new THREE.Group();
    const flareCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b })
    );
    const flareLight = new THREE.PointLight(0xff2a2a, 8, 45, 1.5);
    flareRocket.add(flareCore, flareLight);
    flareRocket.visible = false;
    scene.add(flareRocket);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Physics & Input State
    const physState = createInitialPhysicsState();
    const pressedKeys = new Set<string>();
    let wantsJumpOnce = false;
    let activeNearbyId: string | null = null;
    let lastPromptSignature = '';
    let lastHandledTeleportNonce = 0;
    let lastHandledBurstNonce = 0;
    let walkPhase = 0;
    let menuOrbitClock = 0;
    let cameraTrauma = 0;

    // Smooth Isometric Camera Orbit & Zoom State (default 45° isometric NE view = Math.PI / 4)
    let targetCameraYaw = Math.PI / 4;
    let currentCameraYaw = Math.PI / 4;
    let zoomFactor = 1.0;
    let isRightDragging = false;
    let lastPointerX = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      pressedKeys.add(code);

      if (phaseRef.current !== GamePhase.Playing) return;

      if (code === 'Space' && !e.repeat) {
        wantsJumpOnce = true;
      }

      if (code === 'BracketLeft') {
        targetCameraYaw -= Math.PI / 4;
      } else if (code === 'BracketRight') {
        targetCameraYaw += Math.PI / 4;
      }

      if (
        (code === 'KeyE' || e.key === 'e' || e.key === 'E') &&
        !e.repeat
      ) {
        if (activeNearbyId) {
          callbacksRef.current.onInteractNode(activeNearbyId, physState.y);
        } else if (hasFlareRef.current && physState.y >= 6.0) {
          callbacksRef.current.onInteractNode('spire-flare-pad', physState.y);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const onBlur = () => {
      pressedKeys.clear();
      isRightDragging = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2 && phaseRef.current === GamePhase.Playing) {
        isRightDragging = true;
        lastPointerX = e.clientX;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isRightDragging) return;
      const dx = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      targetCameraYaw -= dx * 0.0075;
    };

    const onPointerUp = () => {
      isRightDragging = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (phaseRef.current !== GamePhase.Playing) return;
      zoomFactor = THREE.MathUtils.clamp(
        zoomFactor + (e.deltaY > 0 ? 0.08 : -0.08),
        0.68,
        1.48
      );
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('contextmenu', onContextMenu);
    container.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.1);
      const activeWeather = weatherRef.current;
      const weatherSpec = WEATHER_CATALOG[activeWeather];

      // Smoothly interpolate camera orbit yaw
      currentCameraYaw = THREE.MathUtils.damp(
        currentCameraYaw,
        targetCameraYaw,
        10,
        dt
      );

      // Handle Admin Teleport Request immediately (resets velocity & peak fall height safely)
      const tp = teleportRef.current;
      if (tp && tp.nonce !== lastHandledTeleportNonce) {
        lastHandledTeleportNonce = tp.nonce;
        const ty = getSurfaceHeight(tp.x, tp.z);
        physState.x = tp.x;
        physState.y = ty;
        physState.z = tp.z;
        physState.vx = 0;
        physState.vy = 0;
        physState.vz = 0;
        physState.grounded = true;
        physState.peakAirY = ty;
        survivor.group.position.set(tp.x, ty, tp.z);
      }

      // Check Scavenge Burst Event from App
      const burst = scavengeBurstRef.current;
      if (burst && burst.nonce !== lastHandledBurstNonce) {
        lastHandledBurstNonce = burst.nonce;
        const targetNode = nodesRef.current.find((n) => n.id === burst.nodeId);
        if (targetNode) {
          nodeShakeTimer.set(targetNode.id, 0.32);
          const tint =
            targetNode.kind === 'timber'
              ? 0x6b4f35
              : targetNode.kind === 'terminal'
              ? 0x38bdf8
              : 0x9ca3af;
          spawnDebrisBurst(
            targetNode.x,
            targetNode.y + 0.6,
            targetNode.z,
            10,
            4.6,
            tint
          );
          cameraTrauma = Math.min(1, cameraTrauma + 0.18);
        }
      }

      if (phaseRef.current === GamePhase.Playing) {
        // 1. Compute Camera-Relative Movement Vectors from currentCameraYaw
        _camForward.set(
          -Math.cos(currentCameraYaw),
          0,
          -Math.sin(currentCameraYaw)
        );
        _camRight.set(
          Math.sin(currentCameraYaw),
          0,
          -Math.cos(currentCameraYaw)
        );

        _moveDir.set(0, 0, 0);
        if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) {
          _moveDir.add(_camForward);
        }
        if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) {
          _moveDir.sub(_camForward);
        }
        if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) {
          _moveDir.add(_camRight);
        }
        if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) {
          _moveDir.sub(_camRight);
        }
        if (_moveDir.lengthSq() > 0.001) {
          _moveDir.normalize();
        }

        const sprinting =
          pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight');

        const stepRes = stepCharacterPhysics(
          physState,
          dt,
          _moveDir.x,
          _moveDir.z,
          sprinting,
          wantsJumpOnce,
          activeWeather,
          adminSpeedMultRef.current,
          nodesRef.current,
          structuresRef.current
        );
        wantsJumpOnce = false;

        // Audio & Particle Feedback from Physics Events
        if (stepRes.jumped) {
          soundFX.playJump();
          spawnDebrisBurst(physState.x, physState.y, physState.z, 4, 2.2, 0x78716c);
        }
        if (stepRes.landed) {
          const heavy = stepRes.hardLandingDamage > 0;
          soundFX.playLand(heavy);
          spawnDebrisBurst(
            physState.x,
            physState.y,
            physState.z,
            heavy ? 12 : 5,
            heavy ? 5.2 : 2.5,
            0x78716c
          );
          if (heavy) {
            cameraTrauma = Math.min(1, cameraTrauma + 0.55);
          }
        }
        if (stepRes.footstepTriggered) {
          soundFX.playFootstep(isConcreteSurface(physState.x, physState.z));
          spawnDebrisBurst(
            physState.x,
            physState.y - 0.2,
            physState.z,
            2,
            1.4,
            0x57534e
          );
        }

        // Sync Survivor 3D Rig Transform, Squash/Stretch & Limb Kinematics
        survivor.group.position.set(physState.x, physState.y, physState.z);
        survivor.group.rotation.y = physState.yaw;
        const invSquash = 1 / Math.sqrt(Math.max(0.5, physState.squashY));
        survivor.bodyPivot.scale.set(invSquash, physState.squashY, invSquash);

        const horizSpeed = Math.hypot(physState.vx, physState.vz);
        if (!physState.grounded) {
          // Airborne stride pose
          survivor.leftLeg.rotation.x = THREE.MathUtils.damp(
            survivor.leftLeg.rotation.x,
            0.48,
            14,
            dt
          );
          survivor.rightLeg.rotation.x = THREE.MathUtils.damp(
            survivor.rightLeg.rotation.x,
            -0.38,
            14,
            dt
          );
          survivor.leftArm.rotation.x = THREE.MathUtils.damp(
            survivor.leftArm.rotation.x,
            -0.55,
            14,
            dt
          );
          survivor.rightArm.rotation.x = THREE.MathUtils.damp(
            survivor.rightArm.rotation.x,
            0.55,
            14,
            dt
          );
        } else if (horizSpeed > 0.45) {
          walkPhase += dt * (1.25 * horizSpeed);
          const amp = Math.min(0.72, horizSpeed * 0.065);
          const swing = Math.sin(walkPhase) * amp;
          survivor.leftLeg.rotation.x = swing;
          survivor.rightLeg.rotation.x = -swing;
          survivor.leftArm.rotation.x = -swing * 0.78;
          survivor.rightArm.rotation.x = swing * 0.78;
        } else {
          survivor.leftLeg.rotation.x = THREE.MathUtils.damp(
            survivor.leftLeg.rotation.x,
            0,
            12,
            dt
          );
          survivor.rightLeg.rotation.x = THREE.MathUtils.damp(
            survivor.rightLeg.rotation.x,
            0,
            12,
            dt
          );
          survivor.leftArm.rotation.x = THREE.MathUtils.damp(
            survivor.leftArm.rotation.x,
            0,
            12,
            dt
          );
          survivor.rightArm.rotation.x = THREE.MathUtils.damp(
            survivor.rightArm.rotation.x,
            0,
            12,
            dt
          );
        }

        // Animate Campfire Flicker when Shelter is constructed
        if (campfire.group.visible) {
          const flick =
            0.9 +
            Math.sin(elapsedSecRef.current * 17) * 0.12 +
            Math.cos(elapsedSecRef.current * 29) * 0.08;
          campfire.flameMesh.scale.set(flick, 0.85 + flick * 0.25, flick);
          campfire.fireLight.intensity = 2.2 * flick;
        }

        // 2. Unified Day / Night 60-second Atmospheric Cycle synced to elapsedSecRef
        const dayFraction =
          (elapsedSecRef.current % SECONDS_PER_DAY) / SECONDS_PER_DAY;
        const sunAngle = dayFraction * Math.PI * 2;
        const daylight = Math.sin(sunAngle) * 0.5 + 0.5;

        keyLight.position.set(
          physState.x + Math.cos(sunAngle) * 32,
          16 + daylight * 26,
          physState.z + 18
        );
        keyLight.target.position.copy(survivor.group.position);

        let sunIntensity = 0.35 + daylight * 1.65;
        let targetFogDensity = 0.0115;

        if (daylight > 0.45) {
          const t = (daylight - 0.45) / 0.55;
          _workColor.copy(_duskSunColor).lerp(_daySunColor, t);
          _workColor2.copy(_duskFogColor).lerp(_dayFogColor, t);
        } else {
          const t = daylight / 0.45;
          _workColor.copy(_nightSunColor).lerp(_duskSunColor, t);
          _workColor2.copy(_nightFogColor).lerp(_duskFogColor, t);
        }

        if (activeWeather === WeatherType.AcidRain) {
          _workColor2.lerp(_acidTint, 0.55);
          sunIntensity *= 0.65;
          targetFogDensity = 0.0175;
        } else if (activeWeather === WeatherType.AshStorm) {
          _workColor2.lerp(_ashTint, 0.72);
          sunIntensity *= 0.5;
          targetFogDensity = 0.0245;
        } else if (activeWeather === WeatherType.Heatwave) {
          _workColor2.lerp(_heatTint, 0.5);
          sunIntensity *= 1.28;
          targetFogDensity = 0.0135;
        }

        keyLight.intensity = THREE.MathUtils.damp(
          keyLight.intensity,
          sunIntensity,
          4,
          dt
        );
        fog.density = THREE.MathUtils.damp(
          fog.density,
          targetFogDensity,
          3,
          dt
        );
        keyLight.color.copy(_workColor);
        (scene.background as THREE.Color).copy(_workColor2);
        fog.color.copy(_workColor2);
        hemiLight.intensity = 0.32 + daylight * 0.52;
        survivor.lanternLight.intensity = 2.6 - daylight * 1.6;

        // 3. Weather Particle Kinematics
        if (activeWeather === WeatherType.Clear) {
          weatherMat.opacity = THREE.MathUtils.damp(
            weatherMat.opacity,
            0.0,
            5,
            dt
          );
          weatherPoints.visible = weatherMat.opacity > 0.02;
        } else {
          weatherPoints.visible = true;
          if (activeWeather === WeatherType.AcidRain) {
            weatherMat.color.setHex(0xa3e635);
            weatherMat.size = 0.2;
            weatherMat.opacity = THREE.MathUtils.damp(
              weatherMat.opacity,
              0.72,
              5,
              dt
            );
          } else if (activeWeather === WeatherType.AshStorm) {
            weatherMat.color.setHex(0xa8a29e);
            weatherMat.size = 0.28;
            weatherMat.opacity = THREE.MathUtils.damp(
              weatherMat.opacity,
              0.82,
              5,
              dt
            );
          } else {
            weatherMat.color.setHex(0xfb923c);
            weatherMat.size = 0.22;
            weatherMat.opacity = THREE.MathUtils.damp(
              weatherMat.opacity,
              0.58,
              5,
              dt
            );
          }

          for (let i = 0; i < WEATHER_PARTICLE_COUNT; i++) {
            const idx = i * 3;
            if (activeWeather === WeatherType.AcidRain) {
              weatherOffsets[idx] -= dt * 3.5;
              weatherOffsets[idx + 1] -= dt * 21.0;
            } else if (activeWeather === WeatherType.AshStorm) {
              weatherOffsets[idx] += dt * 16.5;
              weatherOffsets[idx + 1] -= dt * 2.4;
              weatherOffsets[idx + 2] += dt * 7.5;
            } else {
              weatherOffsets[idx] +=
                Math.sin(elapsedSecRef.current * 2 + i) * dt * 1.2;
              weatherOffsets[idx + 1] += dt * 3.2;
            }

            if (weatherOffsets[idx] > 22) weatherOffsets[idx] -= 44;
            if (weatherOffsets[idx] < -22) weatherOffsets[idx] += 44;
            if (weatherOffsets[idx + 2] > 22) weatherOffsets[idx + 2] -= 44;
            if (weatherOffsets[idx + 2] < -22) weatherOffsets[idx + 2] += 44;
            if (weatherOffsets[idx + 1] < 0) weatherOffsets[idx + 1] += 18;
            if (weatherOffsets[idx + 1] > 18) weatherOffsets[idx + 1] -= 18;

            weatherWorldPos[idx] = physState.x + weatherOffsets[idx];
            weatherWorldPos[idx + 1] = physState.y + weatherOffsets[idx + 1];
            weatherWorldPos[idx + 2] = physState.z + weatherOffsets[idx + 2];
          }
          weatherPosAttr.needsUpdate = true;
        }

        // 4. Update Bouncing 3D Debris Particles
        let anyDebrisActive = false;
        for (let i = 0; i < DEBRIS_POOL_SIZE; i++) {
          const p = debrisPool[i];
          if (!p.active) continue;
          anyDebrisActive = true;
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            _debrisDummy.position.set(0, -20, 0);
            _debrisDummy.scale.setScalar(0);
            _debrisDummy.updateMatrix();
            debrisInstanced.setMatrixAt(i, _debrisDummy.matrix);
            continue;
          }

          p.vy -= 22.0 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.rx += p.vSpin * dt;
          p.ry += p.vSpin * 0.7 * dt;

          const gy = getSurfaceHeight(p.x, p.z);
          if (p.y < gy + 0.08) {
            p.y = gy + 0.08;
            p.vy = -p.vy * 0.44;
            p.vx *= 0.68;
            p.vz *= 0.68;
          }

          const fade = 1 - p.life / p.maxLife;
          _debrisDummy.position.set(p.x, p.y, p.z);
          _debrisDummy.rotation.set(p.rx, p.ry, 0);
          _debrisDummy.scale.setScalar(p.scale * fade);
          _debrisDummy.updateMatrix();
          debrisInstanced.setMatrixAt(i, _debrisDummy.matrix);
        }
        if (anyDebrisActive) {
          debrisInstanced.instanceMatrix.needsUpdate = true;
        }

        // 5. Update Node Cooldowns, Impact Shakes & Find Nearest Interactable Node
        const nodes = nodesRef.current;
        let closestNode: WorldNode | null = null;
        let closestDist = Infinity;
        const cdMult = weatherSpec.cooldownRecoveryMult;

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.cooldownRemaining > 0) {
            const rate = n.kind === 'shelter' ? 1.0 : cdMult;
            n.cooldownRemaining = Math.max(0, n.cooldownRemaining - dt * rate);
          }

          if (n.kind === 'shelter' && !structuresRef.current.shelter) continue;
          if (n.kind === 'purifier' && structuresRef.current.purifierCount === 0)
            continue;
          if (n.kind === 'farm' && structuresRef.current.farmCount === 0)
            continue;
          if (
            n.kind === 'spire_pad' &&
            !flareUnlockedRef.current &&
            !hasFlareRef.current
          ) {
            continue;
          }

          const dy = Math.abs(physState.y - n.y);
          if (dy > 2.2) continue;

          const d = Math.hypot(physState.x - n.x, physState.z - n.z);
          if (d <= n.interactRadius && d < closestDist) {
            closestDist = d;
            closestNode = n;
          }
        }

        nodeMeshMap.forEach((grp, id) => {
          const nd = nodes.find((item) => item.id === id);
          if (!nd) return;
          const shakeT = nodeShakeTimer.get(id) ?? 0;
          if (shakeT > 0) {
            const nextT = Math.max(0, shakeT - dt);
            nodeShakeTimer.set(id, nextT);
            grp.rotation.z = Math.sin(nextT * 48) * 0.08 * (nextT / 0.32);
          } else {
            grp.rotation.z = 0;
          }
          grp.position.y = nd.cooldownRemaining > 0 ? nd.y - 0.16 : nd.y;
        });

        if (closestNode) {
          activeNearbyId = closestNode.id;
          interactRing.visible = true;
          interactRing.position.set(
            closestNode.x,
            closestNode.y + 0.08,
            closestNode.z
          );

          const onCd = closestNode.cooldownRemaining > 0;
          let hint = 'Press [E] to Scavenge';
          if (closestNode.kind === 'spire_pad') {
            if (weatherSpec.blocksFlare && hasFlareRef.current) {
              hint = 'Ash Storm blocks aerial flare visibility!';
            } else if (hasFlareRef.current) {
              hint = 'Press [E] to Launch Signal Flare!';
            } else {
              hint = 'Craft Signal Flare in Sidebar to Launch Here';
            }
          } else if (closestNode.kind === 'terminal') {
            const alreadyRead =
              closestNode.loreId &&
              discoveredLoreRef.current.includes(closestNode.loreId);
            if (!alreadyRead) {
              hint = 'Press [E] to Download Archive Log & Salvage';
            } else if (onCd) {
              hint = `Log Archived · Capacitor recharging (${Math.ceil(
                closestNode.cooldownRemaining
              )}s)`;
            } else {
              hint = 'Press [E] to Scavenge Spare Relay Parts';
            }
          } else if (closestNode.kind === 'purifier') {
            hint = 'Press [E] to Purify Dirty Water';
          } else if (closestNode.kind === 'shelter') {
            hint = 'Press [E] to Rest & Stabilize (+Health)';
          } else if (closestNode.kind === 'farm') {
            hint = `Growing Canned Food (${weatherSpec.farmSpeedMult}x weather rate)`;
          } else if (onCd) {
            hint = `Salvaged · Shifting rubble (${Math.ceil(
              closestNode.cooldownRemaining
            )}s)`;
          }

          const sig = `${closestNode.id}|${onCd}|${Math.ceil(
            closestNode.cooldownRemaining
          )}|${hasFlareRef.current}|${activeWeather}|${
            discoveredLoreRef.current.length
          }`;
          if (sig !== lastPromptSignature) {
            lastPromptSignature = sig;
            callbacksRef.current.onNearbyChange({
              nodeId: closestNode.id,
              kind: closestNode.kind,
              label: closestNode.label,
              actionHint: hint,
              onCooldown: onCd,
              cooldownSec: Math.ceil(closestNode.cooldownRemaining),
            });
          }
        } else {
          activeNearbyId = null;
          interactRing.visible = false;
          if (lastPromptSignature !== '') {
            lastPromptSignature = '';
            callbacksRef.current.onNearbyChange(null);
          }
        }

        // 6. Check Radioactive Fallout Crater Hazard
        let inRadiation = false;
        if (physState.y < 2.0) {
          for (let i = 0; i < hazards.length; i++) {
            const hz = hazards[i];
            const dist = Math.hypot(physState.x - hz.x, physState.z - hz.z);
            if (dist < hz.radius * 0.88) {
              inRadiation = true;
              break;
            }
          }
        }

        // 7. Notify Survival Simulation Loop
        callbacksRef.current.onFrameTick(
          dt,
          physState.x,
          physState.y,
          physState.z,
          physState.yaw,
          physState.stamina,
          inRadiation,
          stepRes.hardLandingDamage
        );
      } else {
        menuOrbitClock += dt * 0.4;
      }

      // Signal Flare Skyward Launch Animation
      if (flareLaunchingRef.current) {
        if (!flareRocket.visible) {
          flareRocket.visible = true;
          flareRocket.position.set(physState.x, physState.y + 1.8, physState.z);
          cameraTrauma = 0.45;
        }
        flareRocket.position.y += dt * 24;
      } else {
        flareRocket.visible = false;
      }

      // Decay Camera Trauma & Apply Spring-Damped Orbiting Isometric Camera
      cameraTrauma = Math.max(0, cameraTrauma - dt * 1.8);
      const shakeAmp = cameraTrauma * cameraTrauma * 0.42;
      const shakeX =
        shakeAmp > 0.001 ? Math.sin(elapsedSecRef.current * 55) * shakeAmp : 0;
      const shakeY =
        shakeAmp > 0.001 ? Math.cos(elapsedSecRef.current * 63) * shakeAmp : 0;

      if (phaseRef.current === GamePhase.Menu) {
        const menuAngle = menuOrbitClock * 0.25;
        _camDesired.set(
          Math.cos(menuAngle) * 28,
          24,
          Math.sin(menuAngle) * 28
        );
        camera.position.lerp(_camDesired, 1 - Math.exp(-3 * dt));
        camera.lookAt(0, 1.5, -6);
      } else {
        const horizRadius = 30.4 * zoomFactor;
        const isoHeight = 23.5 * zoomFactor;
        const leadX = physState.vx * 0.14;
        const leadZ = physState.vz * 0.14;

        _camDesired.set(
          physState.x + leadX + Math.cos(currentCameraYaw) * horizRadius,
          physState.y + isoHeight,
          physState.z + leadZ + Math.sin(currentCameraYaw) * horizRadius
        );
        camera.position.x =
          THREE.MathUtils.damp(camera.position.x, _camDesired.x, 8.5, dt) +
          shakeX;
        camera.position.y =
          THREE.MathUtils.damp(camera.position.y, _camDesired.y, 8.5, dt) +
          shakeY;
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _camDesired.z,
          8.5,
          dt
        );

        _lookTarget.set(
          physState.x + leadX * 0.5,
          physState.y + 0.85,
          physState.z + leadZ * 0.5
        );
        camera.lookAt(_lookTarget);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('contextmenu', onContextMenu);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
      debrisGeo.dispose();
      debrisMat.dispose();
      weatherGeo.dispose();
      weatherMat.dispose();
      groundTex.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, [sessionId, hazards, nodesRef, elapsedSecRef, scavengeBurstRef]);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full bg-stone-950 select-none"
      aria-label="3D Post-Apocalyptic Wasteland Viewport"
    />
  );
};
