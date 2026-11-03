import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BaseStructures,
  GamePhase,
  HazardZone,
  NearbyPrompt,
  WorldNode,
} from '../types/game';
import {
  BASE_CAMP_SPOTS,
  WORLD_BOUNDS,
  getSurfaceHeight,
  isPositionBlockedBySpireWalls,
} from '../utils/worldGen';
import {
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
  createSurvivorRig,
} from './models';

// Pre-allocated math helpers outside the render loop (Zero GC)
const _moveDir = new THREE.Vector3();
const _isoForward = new THREE.Vector3(-1, 0, -1).normalize();
const _isoRight = new THREE.Vector3(1, 0, -1).normalize();
const _camDesired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _daySunColor = new THREE.Color(0xffe1b5);
const _duskSunColor = new THREE.Color(0xd96b38);
const _nightSunColor = new THREE.Color(0x475569);
const _dayFogColor = new THREE.Color(0x413c35);
const _duskFogColor = new THREE.Color(0x362822);
const _nightFogColor = new THREE.Color(0x16181d);
const _workColor = new THREE.Color();
const _workColor2 = new THREE.Color();

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

interface WastelandSceneProps {
  sessionId: number;
  phase: GamePhase;
  nodesRef: React.MutableRefObject<WorldNode[]>;
  hazards: HazardZone[];
  structures: BaseStructures;
  hasSignalFlare: boolean;
  flareLaunching: boolean;
  onFrameTick: (
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    inRadiation: boolean
  ) => void;
  onNearbyChange: (prompt: NearbyPrompt | null) => void;
  onInteractNode: (nodeId: string, playerAltitude: number) => void;
}

export const WastelandScene: React.FC<WastelandSceneProps> = ({
  sessionId,
  phase,
  nodesRef,
  hazards,
  structures,
  hasSignalFlare,
  flareLaunching,
  onFrameTick,
  onNearbyChange,
  onInteractNode,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Mutable callback/state refs so React updates never tear down WebGL
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

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

  // References to dynamically toggled base structure groups inside the scene
  const baseMeshesRef = useRef<{
    shelterGroup: THREE.Group | null;
    purifierGroup: THREE.Group | null;
    farmGroup: THREE.Group | null;
  }>({
    shelterGroup: null,
    purifierGroup: null,
    farmGroup: null,
  });

  // Sync built base structures visibility immediately when crafted
  useEffect(() => {
    const bm = baseMeshesRef.current;
    if (bm.shelterGroup) bm.shelterGroup.visible = structures.shelter;
    if (bm.purifierGroup) bm.purifierGroup.visible = structures.purifierCount > 0;
    if (bm.farmGroup) bm.farmGroup.visible = structures.farmCount > 0;
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
    scene.fog = new THREE.FogExp2(0x3a352f, 0.0115);

    // Studio environment map for metallic scrap & visor reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // Isometric-angle Perspective Camera (FOV 34 gives crisp low-poly isometric look with depth)
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
      const d = 36;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 110;
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

    // Expansive Wasteland Terrain Plane (extends well beyond playable perimeter into fog)
    const groundGeo = new THREE.PlaneGeometry(280, 280, 48, 48);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const dist = Math.hypot(vx, vz);
      if (dist > 13 && !(vx > 8 && vx < 40 && vz > -34 && vz < -18)) {
        posAttr.setY(i, Math.sin(vx * 0.08) * Math.cos(vz * 0.08) * 0.18);
      }
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

    // Cracked City Crossroads Asphalt Strips (offset Y >= 0.025 + polygonOffset to avoid Z-fighting)
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

    // Base Camp Clearing Marker Pad
    const campRing = new THREE.Mesh(
      new THREE.RingGeometry(6.8, 7.15, 28),
      new THREE.MeshBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    campRing.rotation.x = -Math.PI / 2;
    campRing.position.set(-1.0, 0.05, -6.5);
    scene.add(campRing);

    // Outer Natural Rocky Crags Perimeter via InstancedMesh (> 20 instances)
    const cragCount = 64;
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
    const dummy = new THREE.Object3D();
    for (let i = 0; i < cragCount; i++) {
      const angle = (i / cragCount) * Math.PI * 2;
      const dist = WORLD_BOUNDS + 5.5 + (i % 3) * 2.4;
      dummy.position.set(Math.cos(angle) * dist, -0.3, Math.sin(angle) * dist);
      dummy.rotation.set(
        (i % 5) * 0.12,
        angle + i * 0.5,
        ((i + 2) % 4) * 0.1
      );
      const s = 0.85 + (i % 5) * 0.22;
      dummy.scale.set(s * 1.2, s * (1.1 + (i % 3) * 0.45), s);
      dummy.updateMatrix();
      cragInstanced.setMatrixAt(i, dummy.matrix);

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

    // Populate Scavengeable World Nodes & track their visual meshes for depleted state dimming
    const nodeMeshMap = new Map<string, THREE.Group>();
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
      if (node.kind === 'building') {
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

    // Pre-create Base Camp Structures (toggled visible when crafted)
    const shelterMesh = createShelterStructure(mats);
    shelterMesh.position.set(
      BASE_CAMP_SPOTS.shelter.x,
      0,
      BASE_CAMP_SPOTS.shelter.z
    );
    shelterMesh.rotation.y = BASE_CAMP_SPOTS.shelter.rotationY;
    shelterMesh.visible = structuresRef.current.shelter;
    scene.add(shelterMesh);

    const purifierMesh = createPurifierStructure(mats);
    purifierMesh.position.set(
      BASE_CAMP_SPOTS.purifier.x,
      0,
      BASE_CAMP_SPOTS.purifier.z
    );
    purifierMesh.rotation.y = BASE_CAMP_SPOTS.purifier.rotationY;
    purifierMesh.visible = structuresRef.current.purifierCount > 0;
    scene.add(purifierMesh);

    const farmMesh = createFarmStructure(mats);
    farmMesh.position.set(BASE_CAMP_SPOTS.farm.x, 0, BASE_CAMP_SPOTS.farm.z);
    farmMesh.rotation.y = BASE_CAMP_SPOTS.farm.rotationY;
    farmMesh.visible = structuresRef.current.farmCount > 0;
    scene.add(farmMesh);

    baseMeshesRef.current = {
      shelterGroup: shelterMesh,
      purifierGroup: purifierMesh,
      farmGroup: farmMesh,
    };

    // Player Survivor Rig
    const survivor = createSurvivorRig(mats);
    survivor.group.position.set(0, 0, 2);
    scene.add(survivor.group);

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

    // Signal Flare Rocket Projectile (activated on early rescue)
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

    // Keyboard Input State
    const pressedKeys = new Set<string>();
    let activeNearbyId: string | null = null;
    let lastPromptSignature = '';
    let walkPhase = 0;
    let dayCycleClock = 0;
    let zoomFactor = 1.0;

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      pressedKeys.add(code);

      if (
        (code === 'KeyE' || e.key === 'e' || e.key === 'E') &&
        !e.repeat &&
        phaseRef.current === GamePhase.Playing
      ) {
        if (activeNearbyId) {
          callbacksRef.current.onInteractNode(
            activeNearbyId,
            survivor.group.position.y
          );
        } else if (
          hasFlareRef.current &&
          survivor.group.position.y >= 6.0
        ) {
          callbacksRef.current.onInteractNode(
            'spire-flare-pad',
            survivor.group.position.y
          );
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const onWheel = (e: WheelEvent) => {
      if (phaseRef.current !== GamePhase.Playing) return;
      zoomFactor = THREE.MathUtils.clamp(
        zoomFactor + (e.deltaY > 0 ? 0.08 : -0.08),
        0.72,
        1.45
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
    container.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    // Continuous Game Loop with Software-WebGL fence pacing
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

      if (phaseRef.current === GamePhase.Playing) {
        // 1. Player Movement (Isometric WASD / Arrow Keys)
        _moveDir.set(0, 0, 0);
        if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) {
          _moveDir.add(_isoForward);
        }
        if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) {
          _moveDir.sub(_isoForward);
        }
        if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) {
          _moveDir.add(_isoRight);
        }
        if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) {
          _moveDir.sub(_isoRight);
        }

        const speed = 9.2;
        if (_moveDir.lengthSq() > 0.001) {
          _moveDir.normalize();
          const curX = survivor.group.position.x;
          const curY = survivor.group.position.y;
          const curZ = survivor.group.position.z;

          let nextX = THREE.MathUtils.clamp(
            curX + _moveDir.x * speed * dt,
            -WORLD_BOUNDS,
            WORLD_BOUNDS
          );
          let nextZ = THREE.MathUtils.clamp(
            curZ + _moveDir.z * speed * dt,
            -WORLD_BOUNDS,
            WORLD_BOUNDS
          );

          // Check Spire side-wall cliff blocking
          if (isPositionBlockedBySpireWalls(nextX, nextZ, curY)) {
            if (!isPositionBlockedBySpireWalls(nextX, curZ, curY)) {
              nextZ = curZ;
            } else if (!isPositionBlockedBySpireWalls(curX, nextZ, curY)) {
              nextX = curX;
            } else {
              nextX = curX;
              nextZ = curZ;
            }
          }

          // Check radial collision against world nodes & built base structures
          const nodes = nodesRef.current;
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.colliderRadius <= 0) continue;
            if (n.kind === 'shelter' && !structuresRef.current.shelter) continue;
            if (n.kind === 'purifier' && structuresRef.current.purifierCount === 0)
              continue;
            if (n.kind === 'farm' && structuresRef.current.farmCount === 0)
              continue;

            const dx = nextX - n.x;
            const dz = nextZ - n.z;
            const dist = Math.hypot(dx, dz);
            const minSep = n.colliderRadius + 0.55;
            if (dist < minSep && dist > 0.0001) {
              const push = (minSep - dist) / dist;
              nextX += dx * push;
              nextZ += dz * push;
            }
          }

          const targetY = getSurfaceHeight(nextX, nextZ);
          survivor.group.position.x = nextX;
          survivor.group.position.z = nextZ;
          survivor.group.position.y = THREE.MathUtils.damp(
            curY,
            targetY,
            18,
            dt
          );

          // Smoothly rotate character toward movement direction
          const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
          let diff = targetAngle - survivor.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          survivor.group.rotation.y += diff * Math.min(1, dt * 14);

          // Walk animation swing
          walkPhase += dt * 13;
          const swing = Math.sin(walkPhase) * 0.55;
          survivor.leftLeg.rotation.x = swing;
          survivor.rightLeg.rotation.x = -swing;
          survivor.leftArm.rotation.x = -swing * 0.75;
          survivor.rightArm.rotation.x = swing * 0.75;
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

        // 2. Day / Night 60-second Atmospheric Cycle
        dayCycleClock = (dayCycleClock + dt) % 60;
        const dayFraction = dayCycleClock / 60; // 0..1 across 1 in-game day
        const sunAngle = dayFraction * Math.PI * 2;
        const daylight = Math.sin(sunAngle) * 0.5 + 0.5; // 0 (midnight) -> 1 (noon)

        keyLight.position.set(
          survivor.group.position.x + Math.cos(sunAngle) * 32,
          16 + daylight * 26,
          survivor.group.position.z + 18
        );
        keyLight.target.position.copy(survivor.group.position);
        keyLight.intensity = 0.35 + daylight * 1.65;

        if (daylight > 0.45) {
          const t = (daylight - 0.45) / 0.55;
          _workColor.copy(_duskSunColor).lerp(_daySunColor, t);
          _workColor2.copy(_duskFogColor).lerp(_dayFogColor, t);
        } else {
          const t = daylight / 0.45;
          _workColor.copy(_nightSunColor).lerp(_duskSunColor, t);
          _workColor2.copy(_nightFogColor).lerp(_duskFogColor, t);
        }
        keyLight.color.copy(_workColor);
        (scene.background as THREE.Color).copy(_workColor2);
        if (scene.fog) scene.fog.color.copy(_workColor2);
        hemiLight.intensity = 0.32 + daylight * 0.52;
        survivor.lanternLight.intensity = 2.6 - daylight * 1.6;

        // 3. Update Node Cooldowns & Find Nearest Interactable Node
        const nodes = nodesRef.current;
        let closestNode: WorldNode | null = null;
        let closestDist = Infinity;

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.cooldownRemaining > 0) {
            n.cooldownRemaining = Math.max(0, n.cooldownRemaining - dt);
            const g = nodeMeshMap.get(n.id);
            if (g && n.cooldownRemaining === 0) {
              g.position.y = n.y;
            }
          }

          if (n.kind === 'shelter' && !structuresRef.current.shelter) continue;
          if (n.kind === 'purifier' && structuresRef.current.purifierCount === 0)
            continue;
          if (n.kind === 'farm' && structuresRef.current.farmCount === 0)
            continue;

          const dy = Math.abs(survivor.group.position.y - n.y);
          if (dy > 2.2) continue;

          const d = Math.hypot(
            survivor.group.position.x - n.x,
            survivor.group.position.z - n.z
          );
          if (d <= n.interactRadius && d < closestDist) {
            closestDist = d;
            closestNode = n;
          }
        }

        // Slightly sink depleted nodes so scavenged status is readable in 3D
        nodeMeshMap.forEach((grp, id) => {
          const nd = nodes.find((item) => item.id === id);
          if (nd && nd.cooldownRemaining > 0) {
            grp.position.y = nd.y - 0.18;
          }
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
            hint = hasFlareRef.current
              ? 'Press [E] to Launch Signal Flare!'
              : 'Craft Signal Flare to Call Extraction Here';
          } else if (closestNode.kind === 'purifier') {
            hint = 'Press [E] to Purify Dirty Water';
          } else if (closestNode.kind === 'shelter') {
            hint = 'Press [E] to Rest & Stabilize (+Health)';
          } else if (closestNode.kind === 'farm') {
            hint = 'Auto-generating Canned Food every 60s';
          } else if (onCd) {
            hint = `Salvaged · Shifting rubble (${Math.ceil(
              closestNode.cooldownRemaining
            )}s)`;
          }

          const sig = `${closestNode.id}|${onCd}|${Math.ceil(
            closestNode.cooldownRemaining
          )}|${hasFlareRef.current}`;
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

        // 4. Check Radioactive Fallout Crater Hazard
        let inRadiation = false;
        if (survivor.group.position.y < 2.0) {
          for (let i = 0; i < hazards.length; i++) {
            const hz = hazards[i];
            const dist = Math.hypot(
              survivor.group.position.x - hz.x,
              survivor.group.position.z - hz.z
            );
            if (dist < hz.radius * 0.88) {
              inRadiation = true;
              break;
            }
          }
        }

        // 5. Notify Survival Simulation Loop
        callbacksRef.current.onFrameTick(
          dt,
          survivor.group.position.x,
          survivor.group.position.y,
          survivor.group.position.z,
          inRadiation
        );
      } else {
        // Gentle ambient camera orbit when on Main Menu / Victory / Game Over
        dayCycleClock += dt * 0.4;
      }

      // Signal Flare Skyward Launch Animation
      if (flareLaunchingRef.current) {
        if (!flareRocket.visible) {
          flareRocket.visible = true;
          flareRocket.position.set(
            survivor.group.position.x,
            survivor.group.position.y + 1.8,
            survivor.group.position.z
          );
        }
        flareRocket.position.y += dt * 22;
      } else {
        flareRocket.visible = false;
      }

      // Smoothly Damped Top-Down Isometric Tracking Camera
      if (phaseRef.current === GamePhase.Menu) {
        const menuAngle = dayCycleClock * 0.25;
        _camDesired.set(
          Math.cos(menuAngle) * 28,
          24,
          Math.sin(menuAngle) * 28
        );
        camera.position.lerp(_camDesired, 1 - Math.exp(-3 * dt));
        camera.lookAt(0, 1.5, -6);
      } else {
        const isoDist = 21.5 * zoomFactor;
        const isoHeight = 23.5 * zoomFactor;
        _camDesired.set(
          survivor.group.position.x + isoDist,
          survivor.group.position.y + isoHeight,
          survivor.group.position.z + isoDist
        );
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _camDesired.x,
          8,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _camDesired.y,
          8,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _camDesired.z,
          8,
          dt
        );

        _lookTarget.set(
          survivor.group.position.x,
          survivor.group.position.y + 0.8,
          survivor.group.position.z
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
      groundTex.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, [sessionId, hazards, nodesRef]);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full bg-stone-950 select-none"
      aria-label="3D Post-Apocalyptic Wasteland Viewport"
    />
  );
};
