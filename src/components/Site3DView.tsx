import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box,
  Layers,
  Sun,
  Sunset,
  Moon,
  Eye,
  Maximize2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  Clock,
  Compass
} from 'lucide-react';

interface Site3DViewProps {
  siteName?: string;
  subgroupName?: string;
  dprWeather?: string;
  downtimeReason?: string;
  onClose?: () => void;
}

export const Site3DView: React.FC<Site3DViewProps> = ({
  siteName = 'Barsoi',
  subgroupName = 'Madan',
  dprWeather = 'Sunny / Clear',
  downtimeReason = 'None'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [lightingPreset, setLightingPreset] = useState<'day' | 'sunset' | 'night'>('day');
  const [explodeValue, setExplodeValue] = useState<number>(0);
  const [activeCamPreset, setActiveCamPreset] = useState<'overview' | 'slab' | 'crane' | 'stock'>('overview');
  const [selectedBimInfo, setSelectedBimInfo] = useState<{
    name: string;
    trade: string;
    status: string;
    specs: string;
  } | null>(null);

  // References held across animation loop to prevent GC allocations
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const craneGroupRef = useRef<THREE.Group | null>(null);
  const mixerDrumRef = useRef<THREE.Mesh | null>(null);
  const hookGroupRef = useRef<THREE.Group | null>(null);
  const explodedGroupsRef = useRef<{
    ground: THREE.Group;
    columns: THREE.Group;
    slab: THREE.Group;
    rebar: THREE.Group;
    scaffold: THREE.Group;
  } | null>(null);
  const lightsRef = useRef<{
    dirLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    floodLights: THREE.PointLight[];
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect Software WebGL (SwiftShader / llvmpipe / headless)
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Scene & Fog Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const skyColor = new THREE.Color(0xdbeafe);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(skyColor.getHex(), 0.015);

    // 3. Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 580;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    camera.position.set(32, 24, 38);
    cameraRef.current = camera;

    // 4. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 5. Controls Setup with Smooth Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go underground
    controls.minDistance = 8;
    controls.maxDistance = 120;
    controls.target.set(0, 6, 0);
    controlsRef.current = controls;

    // 6. Lighting Rig (Warm Key + Cool Hemisphere Fill)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    dirLight.position.set(35, 45, 25);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.width = isSoftwareGl ? 512 : 2048;
    dirLight.shadow.mapSize.height = isSoftwareGl ? 512 : 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 120;
    const d = 35;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    // High-mast floodlights for night concrete pour
    const floodLight1 = new THREE.PointLight(0xffedd5, 0, 50, 1.2);
    floodLight1.position.set(-15, 20, -15);
    scene.add(floodLight1);

    const floodLight2 = new THREE.PointLight(0xffedd5, 0, 50, 1.2);
    floodLight2.position.set(15, 20, 15);
    scene.add(floodLight2);

    lightsRef.current = {
      dirLight,
      hemiLight,
      floodLights: [floodLight1, floodLight2]
    };

    // 7. Procedural Textures (Zero 404 dependencies)
    // Concrete Bump Map
    const concreteCanvas = document.createElement('canvas');
    concreteCanvas.width = 256;
    concreteCanvas.height = 256;
    const ctx = concreteCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const b = 130 + Math.random() * 40;
        ctx.fillStyle = `rgb(${b},${b},${b})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
    const concreteTex = new THREE.CanvasTexture(concreteCanvas);
    concreteTex.wrapS = THREE.RepeatWrapping;
    concreteTex.wrapT = THREE.RepeatWrapping;
    concreteTex.repeat.set(4, 4);

    // Site Ground Grid Texture
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const gctx = groundCanvas.getContext('2d');
    if (gctx) {
      gctx.fillStyle = '#64748b'; // compacted site earth
      gctx.fillRect(0, 0, 512, 512);
      gctx.strokeStyle = '#475569';
      gctx.lineWidth = 4;
      gctx.strokeRect(0, 0, 512, 512);
      // Grid lines
      gctx.strokeStyle = 'rgba(255,255,255,0.15)';
      gctx.lineWidth = 1.5;
      for (let i = 64; i < 512; i += 64) {
        gctx.beginPath();
        gctx.moveTo(i, 0);
        gctx.lineTo(i, 512);
        gctx.moveTo(0, i);
        gctx.lineTo(512, i);
        gctx.stroke();
      }
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(12, 12);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    // 8. Ground Plane with Radial Contact Shadow
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.9,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = !isSoftwareGl;
    scene.add(groundMesh);

    // Structural Groups for Exploded-view
    const groupGround = new THREE.Group();
    const groupColumns = new THREE.Group();
    const groupSlab = new THREE.Group();
    const groupRebar = new THREE.Group();
    const groupScaffold = new THREE.Group();

    scene.add(groupGround);
    scene.add(groupColumns);
    scene.add(groupSlab);
    scene.add(groupRebar);
    scene.add(groupScaffold);

    explodedGroupsRef.current = {
      ground: groupGround,
      columns: groupColumns,
      slab: groupSlab,
      rebar: groupRebar,
      scaffold: groupScaffold
    };

    // 9. Multi-Tier Commercial Building Structure (Barsoi Site BIM Model)
    // Foundation Raft & Footings
    const raftGeo = new THREE.BoxGeometry(22, 1.2, 18);
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.85,
      metalness: 0.1,
      bumpMap: concreteTex,
      bumpScale: 0.03
    });
    const raftMesh = new THREE.Mesh(raftGeo, concreteMat);
    raftMesh.position.set(0, 0.6, 0);
    raftMesh.castShadow = !isSoftwareGl;
    raftMesh.receiveShadow = !isSoftwareGl;
    groupGround.add(raftMesh);

    // Ground Floor Reinforced Concrete Columns (6x4 grid)
    const colGeo = new THREE.BoxGeometry(0.9, 5.2, 0.9);
    const columnPositions: [number, number, number][] = [];
    for (let x = -8; x <= 8; x += 5.3) {
      for (let z = -6; z <= 6; z += 4) {
        columnPositions.push([x, 3.8, z]);
      }
    }

    columnPositions.forEach(([x, y, z], idx) => {
      // 3-part composite column (Base collar, main RCC core, top reinforcement tie)
      const colGroup = new THREE.Group();
      colGroup.position.set(x, y, z);

      const coreMesh = new THREE.Mesh(colGeo, concreteMat);
      coreMesh.castShadow = !isSoftwareGl;
      coreMesh.receiveShadow = !isSoftwareGl;
      coreMesh.name = `Column Grid C${idx + 1}`;
      colGroup.add(coreMesh);

      // Plywood shuttering formwork around 2 of the columns (showing active casting)
      if (idx === 2 || idx === 7) {
        const shutterGeo = new THREE.BoxGeometry(1.1, 4.8, 1.1);
        const shutterMat = new THREE.MeshStandardMaterial({
          color: 0xd97706, // Formwork plywood
          roughness: 0.7,
          metalness: 0.05
        });
        const shutterMesh = new THREE.Mesh(shutterGeo, shutterMat);
        shutterMesh.castShadow = !isSoftwareGl;
        colGroup.add(shutterMesh);

        // Steel clamping yokes
        for (let k = -1.8; k <= 1.8; k += 0.9) {
          const clampGeo = new THREE.BoxGeometry(1.3, 0.15, 1.3);
          const clampMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
          const clampMesh = new THREE.Mesh(clampGeo, clampMat);
          clampMesh.position.y = k;
          colGroup.add(clampMesh);
        }
      }

      groupColumns.add(colGroup);
    });

    // Level 1 Concrete Slab
    const slabGeo = new THREE.BoxGeometry(22, 0.7, 18);
    const slabMesh = new THREE.Mesh(slabGeo, concreteMat);
    slabMesh.position.set(0, 6.75, 0);
    slabMesh.castShadow = !isSoftwareGl;
    slabMesh.receiveShadow = !isSoftwareGl;
    groupSlab.add(slabMesh);

    // Active Concrete Pour Area (Wet, reflective concrete finish on top half)
    const wetPourGeo = new THREE.BoxGeometry(10, 0.1, 8);
    const wetPourMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.18, // High sheen wet concrete
      metalness: 0.2
    });
    const wetPourMesh = new THREE.Mesh(wetPourGeo, wetPourMat);
    wetPourMesh.position.set(4, 7.15, -3);
    wetPourMesh.receiveShadow = !isSoftwareGl;
    groupSlab.add(wetPourMesh);

    // Rebar Mesh / TMT Steel Reinforcement Grid on top slab
    const rebarMat = new THREE.MeshStandardMaterial({
      color: 0x713f12, // TMT rust-brown protective finish
      metalness: 0.85,
      roughness: 0.35
    });

    const rebarGroup = new THREE.Group();
    // Long bars
    const barLongGeo = new THREE.CylinderGeometry(0.04, 0.04, 18, 6);
    for (let rx = -9; rx <= 9; rx += 1.2) {
      const b = new THREE.Mesh(barLongGeo, rebarMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(rx, 7.25, 0);
      rebarGroup.add(b);
    }
    // Cross bars
    const barCrossGeo = new THREE.CylinderGeometry(0.04, 0.04, 20, 6);
    for (let rz = -8; rz <= 8; rz += 1.2) {
      const b = new THREE.Mesh(barCrossGeo, rebarMat);
      b.rotation.z = Math.PI / 2;
      b.position.set(0, 7.3, rz);
      rebarGroup.add(b);
    }
    groupRebar.add(rebarGroup);

    // Level 2 Starter Columns (Upper columns in progress)
    columnPositions.slice(0, 8).forEach(([x, _, z]) => {
      const stubGeo = new THREE.BoxGeometry(0.8, 3.2, 0.8);
      const stubMesh = new THREE.Mesh(stubGeo, concreteMat);
      stubMesh.position.set(x, 8.7, z);
      stubMesh.castShadow = !isSoftwareGl;
      groupSlab.add(stubMesh);

      // Rebar starter dowels protruding at top
      for (let dx = -0.25; dx <= 0.25; dx += 0.5) {
        for (let dz = -0.25; dz <= 0.25; dz += 0.5) {
          const dowelGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6);
          const dowelMesh = new THREE.Mesh(dowelGeo, rebarMat);
          dowelMesh.position.set(x + dx, 10.6, z + dz);
          groupSlab.add(dowelMesh);
        }
      }
    });

    // Scaffolding & Jack Props under the slab overhang
    const propMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 });
    for (let px = -10; px <= 10; px += 2.5) {
      for (let pz = -8; pz <= 8; pz += 4) {
        const propGeo = new THREE.CylinderGeometry(0.06, 0.06, 6.2, 6);
        const propMesh = new THREE.Mesh(propGeo, propMat);
        propMesh.position.set(px, 3.1, pz);
        groupScaffold.add(propMesh);
      }
    }

    // 10. Composite Construction Tower Crane (3–12 Part Procedural Model)
    const craneGroup = new THREE.Group();
    craneGroup.position.set(-14, 0, -10);
    craneGroupRef.current = craneGroup;

    const craneSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Construction Yellow
      metalness: 0.8,
      roughness: 0.25
    });
    const craneDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2
    });

    // Mast Base & Tower Columns
    const mastGeo = new THREE.BoxGeometry(2.2, 28, 2.2);
    const mastMesh = new THREE.Mesh(mastGeo, craneSteelMat);
    mastMesh.position.set(0, 14, 0);
    mastMesh.castShadow = !isSoftwareGl;
    craneGroup.add(mastMesh);

    // Operator Cabin
    const cabinGeo = new THREE.BoxGeometry(2, 2.2, 2.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.2 });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(1.4, 26, 0);
    craneGroup.add(cabinMesh);

    // Slewing Jib Assembly (rotates)
    const jibGroup = new THREE.Group();
    jibGroup.position.set(0, 27.5, 0);
    craneGroup.add(jibGroup);

    // Long Forward Jib Boom
    const jibGeo = new THREE.BoxGeometry(26, 1.2, 1.2);
    const jibMesh = new THREE.Mesh(jibGeo, craneSteelMat);
    jibMesh.position.set(11, 0, 0);
    jibMesh.castShadow = !isSoftwareGl;
    jibGroup.add(jibMesh);

    // Rear Counter-Jib
    const counterJibGeo = new THREE.BoxGeometry(8, 1, 1.2);
    const counterJibMesh = new THREE.Mesh(counterJibGeo, craneSteelMat);
    counterJibMesh.position.set(-4, 0, 0);
    jibGroup.add(counterJibMesh);

    // Heavy Concrete Counterweights
    for (let c = 0; c < 3; c++) {
      const weightGeo = new THREE.BoxGeometry(1.6, 2.2, 1.8);
      const weightMesh = new THREE.Mesh(weightGeo, concreteMat);
      weightMesh.position.set(-6.5 + c * 0.9, -0.6, 0);
      jibGroup.add(weightMesh);
    }

    // Moving Trolley & Hoist Cable
    const trolleyGeo = new THREE.BoxGeometry(1.4, 0.6, 1.4);
    const trolleyMesh = new THREE.Mesh(trolleyGeo, craneDarkMat);
    trolleyMesh.position.set(12, -0.7, 0);
    jibGroup.add(trolleyMesh);

    const hookGroup = new THREE.Group();
    hookGroup.position.set(12, -7.5, 0);
    hookGroupRef.current = hookGroup;

    // Cable line
    const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 7, 4);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const cableMesh = new THREE.Mesh(cableGeo, cableMat);
    cableMesh.position.set(0, 3.5, 0);
    hookGroup.add(cableMesh);

    // Concrete Bucket
    const bucketGeo = new THREE.CylinderGeometry(0.9, 0.5, 1.6, 12);
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });
    const bucketMesh = new THREE.Mesh(bucketGeo, bucketMat);
    bucketMesh.castShadow = !isSoftwareGl;
    hookGroup.add(bucketMesh);

    jibGroup.add(hookGroup);
    scene.add(craneGroup);

    // 11. Concrete Transit Mixer Truck (Composite 3D model)
    const truckGroup = new THREE.Group();
    truckGroup.position.set(16, 0, 14);
    truckGroup.rotation.y = -Math.PI / 4;

    // Truck Cab
    const cabGeo = new THREE.BoxGeometry(3.2, 3, 2.4);
    const truckPaintMat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.7, roughness: 0.2 });
    const cabMesh = new THREE.Mesh(cabGeo, truckPaintMat);
    cabMesh.position.set(-3.5, 2, 0);
    cabMesh.castShadow = !isSoftwareGl;
    truckGroup.add(cabMesh);

    // Windshield Glass
    const glassGeo = new THREE.PlaneGeometry(1.6, 2.2);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.rotation.y = -Math.PI / 2;
    glassMesh.position.set(-5.11, 2.3, 0);
    truckGroup.add(glassMesh);

    // Chassis & Wheels
    const chassisGeo = new THREE.BoxGeometry(9, 0.8, 2.2);
    const chassisMesh = new THREE.Mesh(chassisGeo, craneDarkMat);
    chassisMesh.position.set(0, 1.2, 0);
    truckGroup.add(chassisMesh);

    // 6 Heavy-duty Rubber Wheels
    const wheelPositions = [
      [-3.5, 0.7, 1.3],
      [-3.5, 0.7, -1.3],
      [1.5, 0.7, 1.3],
      [1.5, 0.7, -1.3],
      [3.5, 0.7, 1.3],
      [3.5, 0.7, -1.3]
    ];
    const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.1 });
    wheelPositions.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, wy, wz);
      w.castShadow = !isSoftwareGl;
      truckGroup.add(w);
    });

    // Rotating Mixer Drum
    const drumGeo = new THREE.CylinderGeometry(1.4, 2.0, 5.2, 16);
    const drumMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 });
    const drumMesh = new THREE.Mesh(drumGeo, drumMat);
    drumMesh.rotation.z = Math.PI / 2 - 0.25;
    drumMesh.position.set(1, 2.6, 0);
    drumMesh.castShadow = !isSoftwareGl;
    mixerDrumRef.current = drumMesh;
    truckGroup.add(drumMesh);

    scene.add(truckGroup);

    // 12. Materials Stockyard (Stacked Rebar & Cement Pallets)
    const stockGroup = new THREE.Group();
    stockGroup.position.set(-16, 0, 14);

    // Stacked Pallets of Cement Bags
    for (let py = 0; py < 3; py++) {
      for (let px = 0; px < 2; px++) {
        const palGeo = new THREE.BoxGeometry(2.4, 0.6, 3.2);
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 });
        const palMesh = new THREE.Mesh(palGeo, bagMat);
        palMesh.position.set(px * 2.8, 0.4 + py * 0.7, 0);
        palMesh.castShadow = !isSoftwareGl;
        stockGroup.add(palMesh);
      }
    }

    // TMT Steel Rebar Bundles
    const bundleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
    for (let b = 0; b < 4; b++) {
      const bGeo = new THREE.CylinderGeometry(0.4, 0.4, 7, 8);
      const bMesh = new THREE.Mesh(bGeo, bundleMat);
      bMesh.rotation.z = Math.PI / 2;
      bMesh.position.set(0, 0.5 + b * 0.4, 4 + b * 0.8);
      bMesh.castShadow = !isSoftwareGl;
      stockGroup.add(bMesh);
    }
    scene.add(stockGroup);

    // 13. Interactive Raycasting on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.name && hit.name.includes('Column')) {
          setSelectedBimInfo({
            name: hit.name,
            trade: 'Mason & Shuttering',
            status: 'Cast & Curing',
            specs: '8x 16mm TMT Fe500D + 8mm Stirrups @ 150mm c/c · Grade M25'
          });
        } else if (hit === wetPourMesh || hit === slabMesh) {
          setSelectedBimInfo({
            name: '1st Floor Roof Slab (Grid A1-D4)',
            trade: 'Bar Bending & Concrete Pour',
            status: dprWeather.includes('Rain') ? '⚠️ Suspended (Rain Delay)' : 'Active Pouring',
            specs: '125mm Thick · Ultratech PPC Cement · 12mm Bottom Rebar + 8mm Dist.'
          });
        } else if (hit === bucketMesh) {
          setSelectedBimInfo({
            name: 'Tower Crane Hoist Bucket',
            trade: 'Batching Plant Hoist',
            status: 'Operational',
            specs: 'Capacity: 0.75 m³ Concrete · Hoist Speed: 40 m/min'
          });
        }
      }
    };
    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 14. Smooth Animation Loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth Crane Slew Motion
      if (craneGroupRef.current) {
        const jib = craneGroupRef.current.children.find(c => c instanceof THREE.Group);
        if (jib) {
          jib.rotation.y = Math.sin(time * 0.4) * 0.6 + 0.3;
        }
      }

      // Smooth Mixer Drum Rotation
      if (mixerDrumRef.current) {
        mixerDrumRef.current.rotation.x += delta * 2.5;
      }

      // Gentle hook sway
      if (hookGroupRef.current) {
        hookGroupRef.current.position.y = -7.5 + Math.sin(time * 0.8) * 0.8;
      }

      controls.update();
      renderer.render(scene, camera);

      if (!isSoftwareGl) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      // Single draw for headless / software WebGL
      controls.update();
      renderer.render(scene, camera);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }

    // 15. Resize Observer
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      raftGeo.dispose();
      concreteMat.dispose();
      colGeo.dispose();
      slabGeo.dispose();
      rebarMat.dispose();
    };
  }, []);

  // Update Exploded View
  useEffect(() => {
    if (!explodedGroupsRef.current) return;
    const { columns, slab, rebar, scaffold } = explodedGroupsRef.current;
    columns.position.y = explodeValue * 3.5;
    slab.position.y = explodeValue * 8.0;
    rebar.position.y = explodeValue * 11.0;
    scaffold.position.y = explodeValue * 2.0;
  }, [explodeValue]);

  // Update Lighting Presets
  useEffect(() => {
    if (!lightsRef.current || !sceneRef.current) return;
    const { dirLight, hemiLight, floodLights } = lightsRef.current;
    const scene = sceneRef.current;

    if (lightingPreset === 'day') {
      const sky = new THREE.Color(0xdbeafe);
      scene.background = sky;
      if (scene.fog) scene.fog.color = sky;
      dirLight.color.setHex(0xfff7ed);
      dirLight.intensity = 2.2;
      dirLight.position.set(35, 45, 25);
      hemiLight.color.setHex(0xffffff);
      hemiLight.groundColor.setHex(0x334155);
      hemiLight.intensity = 0.7;
      floodLights.forEach(f => (f.intensity = 0));
    } else if (lightingPreset === 'sunset') {
      const sky = new THREE.Color(0xfdba74);
      scene.background = sky;
      if (scene.fog) scene.fog.color = sky;
      dirLight.color.setHex(0xf97316); // Amber warm sunset
      dirLight.intensity = 2.6;
      dirLight.position.set(50, 16, -10);
      hemiLight.color.setHex(0xfb923c);
      hemiLight.groundColor.setHex(0x1e293b);
      hemiLight.intensity = 0.5;
      floodLights.forEach(f => (f.intensity = 0));
    } else if (lightingPreset === 'night') {
      const sky = new THREE.Color(0x090d16);
      scene.background = sky;
      if (scene.fog) scene.fog.color = sky;
      dirLight.color.setHex(0x38bdf8);
      dirLight.intensity = 0.2; // Moonlight
      hemiLight.intensity = 0.15;
      floodLights.forEach(f => (f.intensity = 4.5)); // High intensity slab pour floodlights
    }
  }, [lightingPreset]);

  // Camera Presets
  const applyCameraPreset = (preset: 'overview' | 'slab' | 'crane' | 'stock') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    setActiveCamPreset(preset);

    if (preset === 'overview') {
      cam.position.set(32, 24, 38);
      ctrl.target.set(0, 6, 0);
    } else if (preset === 'slab') {
      cam.position.set(12, 14, 16);
      ctrl.target.set(2, 7, 0);
    } else if (preset === 'crane') {
      cam.position.set(-6, 32, -2);
      ctrl.target.set(-14, 26, -10);
    } else if (preset === 'stock') {
      cam.position.set(-8, 8, 22);
      ctrl.target.set(-14, 2, 12);
    }
    ctrl.update();
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-xl select-none">
      
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header Badge (Site + Real Weather / Downtime Status) */}
      <div className="absolute top-3.5 left-4 z-10 flex items-center gap-2.5 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 text-white shadow-lg pointer-events-auto flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
            3D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-tight">🏢 {siteName} ➔ {subgroupName}</span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                BIM Live
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Weather: {dprWeather}</span>
              {downtimeReason && downtimeReason !== 'None' && (
                <span className="text-amber-400 font-semibold">· ⚠️ {downtimeReason}</span>
              )}
            </div>
          </div>
        </div>

        {/* Reset View Button */}
        <button
          onClick={() => applyCameraPreset('overview')}
          title="Reset Camera View"
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white p-2.5 rounded-xl border border-slate-700 pointer-events-auto transition cursor-pointer shadow-md"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Structural Component Inspector HUD (Floating Info) */}
      {selectedBimInfo && (
        <div className="absolute top-3.5 right-4 z-10 max-w-xs bg-slate-900/95 text-white p-3.5 rounded-xl border border-blue-500/40 shadow-2xl space-y-1.5 pointer-events-auto animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              BIM Component Inspector
            </span>
            <button
              onClick={() => setSelectedBimInfo(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="font-bold text-xs text-white">{selectedBimInfo.name}</p>
          <div className="text-[11px] space-y-1 text-slate-300">
            <div><span className="text-slate-500">Trade:</span> {selectedBimInfo.trade}</div>
            <div><span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-medium">{selectedBimInfo.status}</span></div>
            <div className="text-[10px] bg-slate-800/80 p-1.5 rounded border border-slate-700/60 text-slate-300">
              {selectedBimInfo.specs}
            </div>
          </div>
        </div>
      )}

      {/* ================= UNIFIED BOTTOM CONTROL DOCK (Zero Viewport Occlusion) ================= */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-2xl transition-all duration-300 ${
          isDockCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          
          {/* Collapse / Expand Tab Bar */}
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="w-full py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-semibold transition cursor-pointer border-b border-slate-700/50"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Show 3D Construction Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls (Cinema Mode)</span>
              </>
            )}
          </button>

          {/* Controls Body */}
          <div className="p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              
              {/* Camera Presets */}
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
                <button
                  onClick={() => applyCameraPreset('overview')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    activeCamPreset === 'overview'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Full Site
                </button>
                <button
                  onClick={() => applyCameraPreset('slab')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    activeCamPreset === 'slab'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Active Slab Pour
                </button>
                <button
                  onClick={() => applyCameraPreset('crane')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    activeCamPreset === 'crane'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tower Crane
                </button>
                <button
                  onClick={() => applyCameraPreset('stock')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    activeCamPreset === 'stock'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Materials Yard
                </button>
              </div>

              {/* Lighting Presets */}
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
                <button
                  onClick={() => setLightingPreset('day')}
                  title="Daytime Sun"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    lightingPreset === 'day'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLightingPreset('sunset')}
                  title="6:00 PM Golden Hour"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    lightingPreset === 'sunset'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sunset className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLightingPreset('night')}
                  title="Night Pour with Floodlights"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    lightingPreset === 'night'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-3 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium shrink-0">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Explode Structural Layers:</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={explodeValue}
                onChange={e => setExplodeValue(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-400 w-9 text-right shrink-0">
                {Math.round(explodeValue * 100)}%
              </span>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>💡 Tip: Click any column or roof slab in 3D to inspect reinforcement specifications.</span>
              <span className="text-slate-500">Drag to rotate · Pinch to zoom</span>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
