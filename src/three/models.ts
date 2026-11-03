import * as THREE from 'three';
import { SPIRE_DECK, SPIRE_RAMP } from '../utils/worldGen';

export interface MaterialPalette {
  concreteDark: THREE.MeshStandardMaterial;
  concreteMid: THREE.MeshStandardMaterial;
  concreteLight: THREE.MeshStandardMaterial;
  rustMetal: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  brushedScrap: THREE.MeshStandardMaterial;
  charredWood: THREE.MeshStandardMaterial;
  salvageWood: THREE.MeshStandardMaterial;
  toxicGlow: THREE.MeshStandardMaterial;
  amberBeacon: THREE.MeshStandardMaterial;
  hydroGreen: THREE.MeshStandardMaterial;
  tarpOlive: THREE.MeshStandardMaterial;
  glassCanopy: THREE.MeshPhysicalMaterial;
  rubberTire: THREE.MeshStandardMaterial;
  survivorCoat: THREE.MeshStandardMaterial;
  survivorPack: THREE.MeshStandardMaterial;
  survivorVisor: THREE.MeshStandardMaterial;
}

export function createMaterialPalette(isSoftwareGl: boolean): MaterialPalette {
  return {
    concreteDark: new THREE.MeshStandardMaterial({
      color: 0x3b3834,
      roughness: 0.92,
      metalness: 0.06,
      flatShading: true,
    }),
    concreteMid: new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.88,
      metalness: 0.08,
      flatShading: true,
    }),
    concreteLight: new THREE.MeshStandardMaterial({
      color: 0x736d65,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    }),
    rustMetal: new THREE.MeshStandardMaterial({
      color: 0x7c3f23,
      roughness: 0.62,
      metalness: 0.72,
      flatShading: true,
    }),
    darkSteel: new THREE.MeshStandardMaterial({
      color: 0x2e3236,
      roughness: 0.42,
      metalness: 0.85,
      flatShading: true,
    }),
    brushedScrap: new THREE.MeshStandardMaterial({
      color: 0x8a8d8f,
      roughness: 0.35,
      metalness: 0.88,
      flatShading: true,
    }),
    charredWood: new THREE.MeshStandardMaterial({
      color: 0x382c21,
      roughness: 0.95,
      metalness: 0.04,
      flatShading: true,
    }),
    salvageWood: new THREE.MeshStandardMaterial({
      color: 0x6b4f35,
      roughness: 0.86,
      metalness: 0.05,
      flatShading: true,
    }),
    toxicGlow: new THREE.MeshStandardMaterial({
      color: 0x65a30d,
      emissive: 0x4d7c0f,
      emissiveIntensity: 1.4,
      roughness: 0.28,
      metalness: 0.15,
      flatShading: true,
    }),
    amberBeacon: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    }),
    hydroGreen: new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x15803d,
      emissiveIntensity: 0.55,
      roughness: 0.65,
      metalness: 0.05,
      flatShading: true,
    }),
    tarpOlive: new THREE.MeshStandardMaterial({
      color: 0x4b533b,
      roughness: 0.78,
      metalness: 0.1,
      flatShading: true,
    }),
    glassCanopy: new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.2,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.78,
      transparent: true,
      opacity: isSoftwareGl ? 0.42 : 0.9,
      ior: 1.45,
      thickness: 0.4,
      depthWrite: false,
    }),
    rubberTire: new THREE.MeshStandardMaterial({
      color: 0x1e1e20,
      roughness: 0.94,
      metalness: 0.08,
      flatShading: true,
    }),
    survivorCoat: new THREE.MeshStandardMaterial({
      color: 0xb47b38,
      roughness: 0.74,
      metalness: 0.12,
      flatShading: true,
    }),
    survivorPack: new THREE.MeshStandardMaterial({
      color: 0x4a5543,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    }),
    survivorVisor: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true,
    }),
  };
}

export function createGroundTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Gritty irradiated ash soil base
  ctx.fillStyle = '#2d2925';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle noise speckles & scorched ash patches
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 1 + Math.random() * 3;
    const shade = 34 + Math.floor(Math.random() * 24);
    ctx.fillStyle = `rgb(${shade + 4}, ${shade + 1}, ${shade - 3})`;
    ctx.fillRect(x, y, size, size);
  }

  // Cracked grid blocks
  ctx.strokeStyle = 'rgba(20, 18, 16, 0.45)';
  ctx.lineWidth = 2;
  for (let g = 0; g <= 512; g += 64) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(512, g);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export interface SurvivorRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  lanternLight: THREE.PointLight;
}

export function createSurvivorRig(mats: MaterialPalette): SurvivorRig {
  const group = new THREE.Group();

  // Soft contact shadow disc
  const shadowGeo = new THREE.CircleGeometry(0.68, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x090807,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.03;
  group.add(shadowMesh);

  // 1 & 2: Left & Right Legs (pivoted near hip)
  const legGeo = new THREE.BoxGeometry(0.24, 0.68, 0.26);
  legGeo.translate(0, -0.34, 0);
  const leftLeg = new THREE.Mesh(legGeo, mats.concreteDark);
  leftLeg.position.set(-0.17, 0.68, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeo, mats.concreteDark);
  rightLeg.position.set(0.17, 0.68, 0);
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  // 3: Hazmat / Scavenger Trench Torso
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.78, 0.4),
    mats.survivorCoat
  );
  torso.position.set(0, 1.05, 0);
  torso.castShadow = true;
  group.add(torso);

  // 4 & 5: Left & Right Arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.62, 0.22);
  armGeo.translate(0, -0.28, 0);
  const leftArm = new THREE.Mesh(armGeo, mats.survivorCoat);
  leftArm.position.set(-0.45, 1.36, 0);
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(armGeo, mats.survivorCoat);
  rightArm.position.set(0.45, 1.36, 0);
  rightArm.castShadow = true;
  group.add(leftArm, rightArm);

  // 6: Heavy Scavenger Backpack + Bedroll
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.62, 0.3),
    mats.survivorPack
  );
  pack.position.set(0, 1.1, -0.32);
  pack.castShadow = true;
  group.add(pack);

  const bedroll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.58, 8),
    mats.rustMetal
  );
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 1.48, -0.32);
  group.add(bedroll);

  // 7: Hooded Head
  const head = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.28, 0),
    mats.tarpOlive
  );
  head.position.set(0, 1.68, 0.02);
  head.castShadow = true;
  group.add(head);

  // 8: Gas Mask Visor & Twin Filter Canisters
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.14, 0.14),
    mats.survivorVisor
  );
  visor.position.set(0, 1.68, 0.24);
  group.add(visor);

  const filterGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.14, 6);
  filterGeo.rotateX(Math.PI / 2);
  const filterL = new THREE.Mesh(filterGeo, mats.darkSteel);
  filterL.position.set(-0.14, 1.56, 0.26);
  const filterR = new THREE.Mesh(filterGeo, mats.darkSteel);
  filterR.position.set(0.14, 1.56, 0.26);
  group.add(filterL, filterR);

  // 9: Shoulder Lantern + Subtle Warm Light
  const lanternBulb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    mats.amberBeacon
  );
  lanternBulb.position.set(0.32, 1.48, 0.22);
  group.add(lanternBulb);

  const lanternLight = new THREE.PointLight(0xffb454, 1.4, 11, 1.8);
  lanternLight.position.set(0.3, 2.1, 0.4);
  group.add(lanternLight);

  return { group, leftLeg, rightLeg, leftArm, rightArm, lanternLight };
}

export function createRuinedBuilding(
  mats: MaterialPalette,
  variant: number
): THREE.Group {
  const group = new THREE.Group();

  // 1: Cracked Concrete Foundation Plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.45, 5.2),
    mats.concreteDark
  );
  plinth.position.y = 0.225;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);

  // 2: Main Multi-Story Standing Wall Wing
  const heightA = 4.2 + (variant % 3) * 1.3;
  const wallA = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, heightA, 1.2),
    variant % 2 === 0 ? mats.concreteMid : mats.concreteLight
  );
  wallA.position.set(0, 0.45 + heightA / 2, -1.6);
  wallA.castShadow = true;
  wallA.receiveShadow = true;
  group.add(wallA);

  // 3: Perpendicular Fractured Side Wall
  const heightB = 2.8 + ((variant + 1) % 3) * 0.9;
  const wallB = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, heightB, 3.8),
    mats.concreteMid
  );
  wallB.position.set(-1.72, 0.45 + heightB / 2, 0.2);
  wallB.castShadow = true;
  wallB.receiveShadow = true;
  group.add(wallB);

  // 4: Collapsed Slanted Upper Floor Slab
  const collapsedSlab = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.28, 2.8),
    mats.concreteDark
  );
  collapsedSlab.position.set(0.5, 1.65, 0.35);
  collapsedSlab.rotation.set(0.32, 0.08, -0.26);
  collapsedSlab.castShadow = true;
  collapsedSlab.receiveShadow = true;
  group.add(collapsedSlab);

  // 5 & 6: Exposed Rusted Steel I-Beams / Rebar Spikes
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 5);
  for (let i = 0; i < 3; i++) {
    const rebar = new THREE.Mesh(beamGeo, mats.rustMetal);
    rebar.position.set(-1.2 + i * 1.2, 0.45 + heightA + 0.4, -1.6);
    rebar.rotation.set((i - 1) * 0.18, 0, (i % 2 === 0 ? 1 : -1) * 0.22);
    rebar.castShadow = true;
    group.add(rebar);
  }

  // 7: Dark Hollow Window Recesses on Facade
  const winGeo = new THREE.BoxGeometry(0.85, 1.05, 1.28);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const win = new THREE.Mesh(winGeo, mats.rubberTire);
      win.position.set(-0.95 + col * 1.85, 1.6 + row * 1.7, -1.6);
      group.add(win);
    }
  }

  // 8: Interior Rubble Mound
  const rubble = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.15, 0),
    mats.concreteLight
  );
  rubble.scale.set(1.3, 0.65, 1.1);
  rubble.position.set(0.9, 0.72, 1.1);
  rubble.castShadow = true;
  group.add(rubble);

  return group;
}

export function createRustedVehicle(
  mats: MaterialPalette,
  variant: number
): THREE.Group {
  const group = new THREE.Group();

  // 1: Lower Chassis Hull
  const bodyMat = variant === 0 ? mats.rustMetal : variant === 1 ? mats.tarpOlive : mats.concreteMid;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 3.4), bodyMat);
  hull.position.set(0, 0.56, 0);
  hull.rotation.z = variant === 2 ? 0.14 : -0.05;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 2: Cabin Roof
  const cabinLength = variant === 1 ? 2.2 : 1.65;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.58, cabinLength),
    bodyMat
  );
  cabin.position.set(0, 1.12, variant === 1 ? -0.2 : -0.15);
  cabin.rotation.z = hull.rotation.z;
  cabin.castShadow = true;
  group.add(cabin);

  // 3: Hollowed Windshield Frame
  const glassCutout = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.42, cabinLength * 0.78),
    mats.rubberTire
  );
  glassCutout.position.copy(cabin.position);
  group.add(glassCutout);

  // 4: Heavy Steel Bumpers
  const bumperGeo = new THREE.BoxGeometry(1.84, 0.22, 0.25);
  const frontBumper = new THREE.Mesh(bumperGeo, mats.darkSteel);
  frontBumper.position.set(0, 0.42, 1.72);
  const rearBumper = new THREE.Mesh(bumperGeo, mats.darkSteel);
  rearBumper.position.set(0, 0.42, -1.72);
  group.add(frontBumper, rearBumper);

  // 5–8: Four Rusted Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelOffsets: [number, number][] = [
    [-0.88, 1.08],
    [0.88, 1.08],
    [-0.88, -1.08],
    [0.88, -1.08],
  ];
  wheelOffsets.forEach(([wx, wz], idx) => {
    const wheel = new THREE.Mesh(wheelGeo, mats.rubberTire);
    wheel.position.set(wx, 0.34, wz);
    if (idx === 1) wheel.rotation.x = 0.3;
    wheel.castShadow = true;
    group.add(wheel);
  });

  return group;
}

export function createScrapPile(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // 1: Ash Mound Base
  const mound = new THREE.Mesh(
    new THREE.ConeGeometry(1.45, 0.65, 7),
    mats.concreteDark
  );
  mound.position.y = 0.32;
  mound.receiveShadow = true;
  group.add(mound);

  // 2 & 3: Corrugated Metal Plates
  const plate1 = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.08, 0.95),
    mats.brushedScrap
  );
  plate1.position.set(-0.25, 0.55, 0.15);
  plate1.rotation.set(0.38, 0.5, -0.25);
  plate1.castShadow = true;

  const plate2 = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.08, 0.85),
    mats.rustMetal
  );
  plate2.position.set(0.35, 0.62, -0.2);
  plate2.rotation.set(-0.35, -0.4, 0.32);
  plate2.castShadow = true;
  group.add(plate1, plate2);

  // 4: Crushed Steel Drum
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.28, 0.82, 8),
    mats.rustMetal
  );
  drum.position.set(0.2, 0.48, 0.42);
  drum.rotation.set(1.1, 0.3, 0.4);
  drum.castShadow = true;
  group.add(drum);

  // 5: Jutting Steel Pipe / Girder
  const girder = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.5, 0.18),
    mats.darkSteel
  );
  girder.position.set(-0.15, 0.78, -0.15);
  girder.rotation.set(0.45, 0.2, 0.52);
  girder.castShadow = true;
  group.add(girder);

  // 6: Discarded Rubber Tire
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.13, 6, 10),
    mats.rubberTire
  );
  tire.position.set(-0.48, 0.32, -0.35);
  tire.rotation.x = Math.PI / 2.4;
  group.add(tire);

  return group;
}

export function createDeadTimber(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // 1: Root Ash Mound
  const roots = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 0.45, 6),
    mats.concreteDark
  );
  roots.position.y = 0.22;
  group.add(roots);

  // 2: Scorched Main Trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.34, 2.7, 6),
    mats.charredWood
  );
  trunk.position.set(0, 1.35, 0);
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  group.add(trunk);

  // 3, 4, 5: Jagged Leafless Branches
  const b1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.14, 1.45, 5),
    mats.charredWood
  );
  b1.position.set(-0.42, 2.35, 0.1);
  b1.rotation.set(0.15, 0, 0.68);
  b1.castShadow = true;

  const b2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.13, 1.25, 5),
    mats.charredWood
  );
  b2.position.set(0.38, 2.1, -0.18);
  b2.rotation.set(-0.28, 0, -0.62);
  b2.castShadow = true;

  // Fallen Salvageable Log at Base
  const fallenLog = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 1.75, 6),
    mats.salvageWood
  );
  fallenLog.rotation.z = Math.PI / 2;
  fallenLog.rotation.y = 0.55;
  fallenLog.position.set(0.45, 0.2, 0.55);
  fallenLog.castShadow = true;

  group.add(b1, b2, fallenLog);
  return group;
}

export function createHazardCrater(
  mats: MaterialPalette,
  radius: number
): THREE.Group {
  const group = new THREE.Group();

  // 1: Scorched Outer Rim Ring
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.76, radius * 1.08, 14),
    mats.concreteDark
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.04;
  group.add(rim);

  // 2: Glowing Radioactive Pool Surface
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.82, 14),
    mats.toxicGlow
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.06;
  group.add(pool);

  // 3 & 4: Jagged Crater Rocks + Leaking Toxic Barrel
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.3;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.42, 0),
      mats.concreteMid
    );
    rock.position.set(
      Math.cos(angle) * (radius * 0.9),
      0.24,
      Math.sin(angle) * (radius * 0.9)
    );
    rock.scale.set(1.2, 0.65, 1.0);
    group.add(rock);
  }

  const leakingDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.85, 8),
    mats.rustMetal
  );
  leakingDrum.position.set(0.2, 0.18, -0.15);
  leakingDrum.rotation.set(0.95, 0.4, 0.3);
  group.add(leakingDrum);

  return group;
}

export function createShelterStructure(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // 1: Reinforced Timber & Concrete Deck
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 0.35, 3.8),
    mats.concreteMid
  );
  foundation.position.y = 0.175;
  foundation.receiveShadow = true;
  foundation.castShadow = true;
  group.add(foundation);

  // 2: Main Bunker Cabin Walls
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 2.2, 3.0),
    mats.salvageWood
  );
  cabin.position.y = 0.35 + 1.1;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  group.add(cabin);

  // 3: Corrugated Sloped Steel Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.22, 3.6),
    mats.brushedScrap
  );
  roof.position.set(0, 2.68, 0);
  roof.rotation.x = 0.12;
  roof.castShadow = true;
  group.add(roof);

  // 4: Heavy Armored Blast Door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.65, 0.16),
    mats.darkSteel
  );
  door.position.set(0, 1.18, 1.54);
  group.add(door);

  // 5: Stove Pipe Chimney
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 1.4, 8),
    mats.rustMetal
  );
  chimney.position.set(1.2, 3.1, -0.8);
  chimney.castShadow = true;
  group.add(chimney);

  // 6 & 7: Warm Porch Beacon & PointLight
  const porchLantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    mats.amberBeacon
  );
  porchLantern.position.set(0.85, 2.05, 1.62);
  group.add(porchLantern);

  const shelterLight = new THREE.PointLight(0xffa94d, 2.2, 14, 1.8);
  shelterLight.position.set(0.85, 2.2, 2.1);
  group.add(shelterLight);

  return group;
}

export function createPurifierStructure(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // 1: Steel Base Plate
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.25, 0.24, 8),
    mats.concreteDark
  );
  base.position.y = 0.12;
  base.receiveShadow = true;
  group.add(base);

  // 2: Boiler Firebox Drum
  const boiler = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.58, 1.1, 10),
    mats.rustMetal
  );
  boiler.position.set(-0.28, 0.78, 0);
  boiler.castShadow = true;
  group.add(boiler);

  // 3: Elevated Filtration Column
  const filterTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.65, 10),
    mats.brushedScrap
  );
  filterTank.position.set(0.35, 1.25, -0.15);
  filterTank.castShadow = true;
  group.add(filterTank);

  // 4: Condenser Cross Pipe
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6),
    mats.darkSteel
  );
  pipe.rotation.z = Math.PI / 2.4;
  pipe.position.set(0.05, 1.55, -0.05);
  group.add(pipe);

  // 5: Clean Water Reservoir Carboy
  const cleanTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.78, 10),
    mats.survivorVisor
  );
  cleanTank.position.set(0.38, 0.62, 0.48);
  group.add(cleanTank);

  return group;
}

export function createFarmStructure(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // 1: Raised Timber Planter Box
  const planter = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.55, 2.2),
    mats.salvageWood
  );
  planter.position.y = 0.275;
  planter.castShadow = true;
  planter.receiveShadow = true;
  group.add(planter);

  // 2: Rich Soil Bed
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(2.95, 0.12, 1.95),
    mats.charredWood
  );
  soil.position.y = 0.56;
  group.add(soil);

  // 3–5: Rows of Lush Hydroponic Crops
  const cropGeo = new THREE.DodecahedronGeometry(0.24, 0);
  for (let r = -1; r <= 1; r++) {
    for (let c = -2; c <= 2; c++) {
      const plant = new THREE.Mesh(cropGeo, mats.hydroGreen);
      plant.position.set(c * 0.54, 0.72, r * 0.54);
      plant.scale.set(1, 0.85, 1);
      group.add(plant);
    }
  }

  // 6: Translucent Hydroponic Dome Canopy
  const dome = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 3.05, 8, 1, false, 0, Math.PI),
    mats.glassCanopy
  );
  dome.rotation.z = Math.PI / 2;
  dome.rotation.y = Math.PI / 2;
  dome.position.y = 0.55;
  dome.renderOrder = 2;
  group.add(dome);

  // 7: Overhead Grow-Light Strip
  const growBar = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.08, 0.14),
    mats.amberBeacon
  );
  growBar.position.y = 1.38;
  group.add(growBar);

  return group;
}

export function createHighAltitudeSpire(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // 1: Sloped Highway Overpass Ramp (exact match to SPIRE_RAMP math)
  const dx = SPIRE_RAMP.endX - SPIRE_RAMP.startX;
  const dy = SPIRE_RAMP.topY;
  const rampLength = Math.hypot(dx, dy);
  const rampAngle = Math.atan2(dy, dx);

  const rampSlab = new THREE.Mesh(
    new THREE.BoxGeometry(rampLength, 0.6, SPIRE_RAMP.halfWidth * 2),
    mats.concreteMid
  );
  rampSlab.position.set(
    (SPIRE_RAMP.startX + SPIRE_RAMP.endX) / 2,
    dy / 2 - 0.3,
    SPIRE_RAMP.centerZ
  );
  rampSlab.rotation.z = rampAngle;
  rampSlab.receiveShadow = true;
  rampSlab.castShadow = true;
  group.add(rampSlab);

  // Ramp Support Pillars
  for (let i = 1; i <= 3; i++) {
    const px = SPIRE_RAMP.startX + (dx * i) / 3.5;
    const py = (dy * i) / 3.5;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, py, 4.6),
      mats.concreteDark
    );
    pillar.position.set(px, py / 2, SPIRE_RAMP.centerZ);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  // 2: Elevated Spire Platform Deck (7.4m elevation)
  const deckW = SPIRE_DECK.maxX - SPIRE_DECK.minX;
  const deckD = SPIRE_DECK.maxZ - SPIRE_DECK.minZ;
  const deckCenterX = (SPIRE_DECK.minX + SPIRE_DECK.maxX) / 2;
  const deckCenterZ = (SPIRE_DECK.minZ + SPIRE_DECK.maxZ) / 2;

  const deckBlock = new THREE.Mesh(
    new THREE.BoxGeometry(deckW, SPIRE_DECK.topY, deckD),
    mats.concreteDark
  );
  deckBlock.position.set(deckCenterX, SPIRE_DECK.topY / 2, deckCenterZ);
  deckBlock.castShadow = true;
  deckBlock.receiveShadow = true;
  group.add(deckBlock);

  const deckTopCap = new THREE.Mesh(
    new THREE.BoxGeometry(deckW + 0.3, 0.35, deckD + 0.3),
    mats.concreteLight
  );
  deckTopCap.position.set(deckCenterX, SPIRE_DECK.topY - 0.15, deckCenterZ);
  deckTopCap.receiveShadow = true;
  group.add(deckTopCap);

  // 3: Tall Broadcast Lattice Spire on Corner of Deck
  const towerBaseY = SPIRE_DECK.topY;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.85, 11.5, 6),
    mats.rustMetal
  );
  mast.position.set(SPIRE_DECK.maxX - 1.8, towerBaseY + 5.75, SPIRE_DECK.minZ + 1.8);
  mast.castShadow = true;
  group.add(mast);

  const beaconTop = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.38, 0),
    mats.amberBeacon
  );
  beaconTop.position.set(
    SPIRE_DECK.maxX - 1.8,
    towerBaseY + 11.7,
    SPIRE_DECK.minZ + 1.8
  );
  group.add(beaconTop);

  // 4: Signal Flare Launch Pad Ring on Elevated Deck
  const padBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.95, 0.18, 12),
    mats.darkSteel
  );
  padBase.position.set(SPIRE_DECK.padX, towerBaseY + 0.09, SPIRE_DECK.padZ);
  group.add(padBase);

  const padBeacon = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.45, 16),
    mats.amberBeacon
  );
  padBeacon.rotation.x = -Math.PI / 2;
  padBeacon.position.set(SPIRE_DECK.padX, towerBaseY + 0.2, SPIRE_DECK.padZ);
  group.add(padBeacon);

  return group;
}
