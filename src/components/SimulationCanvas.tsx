import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CelestialBody, SimulationSettings, SpawnConfig, CameraViewMode, CollisionEvent, Vector3D } from '../types';
import { calculateOrbitalVelocity, predictOrbitPath } from '../physics/nbodyEngine';
import { soundEngine } from '../utils/audio';

interface SimulationCanvasProps {
  bodies: CelestialBody[];
  settings: SimulationSettings;
  spawnConfig: SpawnConfig;
  selectedBodyId: string | null;
  cameraMode: CameraViewMode;
  onSelectBody: (id: string | null) => void;
  onAddBody: (body: CelestialBody) => void;
  collisions: CollisionEvent[];
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  bodies,
  settings,
  spawnConfig,
  selectedBodyId,
  cameraMode,
  onSelectBody,
  onAddBody,
  collisions
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Mesh mappings
  const bodyMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const trailLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  const vectorLinesRef = useRef<Map<string, THREE.Line>>(new Map());

  // Visual Overlays
  const orbitPredictLineRef = useRef<THREE.Line | null>(null);
  const gravityGridRef = useRef<THREE.Mesh | null>(null);
  const launchArrowRef = useRef<THREE.Line | null>(null);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);
  const impactParticlesRef = useRef<THREE.Points[]>([]);

  // Drag & Launch Interaction State
  const [isDraggingLaunch, setIsDraggingLaunch] = useState(false);
  const launchStartPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const launchCurrentPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const streamIntervalRef = useRef<number | null>(null);

  // Camera Orbit Controls State
  const isMouseDown = useRef(false);
  const mousePreviousPos = useRef({ x: 0, y: 0 });
  const cameraTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const cameraSpherical = useRef({ radius: 120, theta: Math.PI / 4, phi: Math.PI / 3 });

  // Raycasting
  const raycaster = useRef(new THREE.Raycaster());
  const mouseVec = useRef(new THREE.Vector2());

  // Screen coordinate labels
  const [screenLabels, setScreenLabels] = useState<{ id: string; name: string; mass: string; x: number; y: number; color: string }[]>([]);

  // Sound collision trigger throttle
  const lastSoundTime = useRef(0);

  // 1. Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712'); // Deep dark space color
    scene.fog = new THREE.FogExp2('#030712', 0.001);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 5000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight('#334155', 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#ffffff', 1.2);
    mainLight.position.set(100, 200, 100);
    scene.add(mainLight);

    // Starfield background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 800 + Math.random() * 1200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const color = new THREE.Color().setHSL(Math.random(), 0.3, 0.8 + Math.random() * 0.2);
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    const starField = new THREE.Points(starsGeo, starMat);
    scene.add(starField);

    // Gravity Grid Plane
    const gridGeo = new THREE.PlaneGeometry(300, 300, 60, 60);
    gridGeo.rotateX(-Math.PI / 2);
    const gridMat = new THREE.MeshBasicMaterial({
      color: '#1e293b',
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const gravityGrid = new THREE.Mesh(gridGeo, gridMat);
    gravityGrid.position.y = -5;
    scene.add(gravityGrid);
    gravityGridRef.current = gravityGrid;

    // Orbit Prediction Line
    const predictGeo = new THREE.BufferGeometry();
    const predictMat = new THREE.LineDashedMaterial({
      color: '#38bdf8',
      dashSize: 2,
      gapSize: 1,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const orbitPredictLine = new THREE.Line(predictGeo, predictMat);
    scene.add(orbitPredictLine);
    orbitPredictLineRef.current = orbitPredictLine;

    // Launch Vector Arrow Line
    const launchGeo = new THREE.BufferGeometry();
    const launchMat = new THREE.LineBasicMaterial({ color: '#22c55e', linewidth: 3 });
    const launchArrow = new THREE.Line(launchGeo, launchMat);
    scene.add(launchArrow);
    launchArrowRef.current = launchArrow;

    // Selection Ring
    const ringGeo = new THREE.RingGeometry(1, 1.25, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.visible = false;
    scene.add(selectionRing);
    selectionRingRef.current = selectionRing;

    // Resize Observer for fluid non-window calculations
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });

    resizeObserver.observe(mountRef.current);

    return () => {
      resizeObserver.disconnect();
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Helper to create body 3D group mesh
  const createBodyMeshGroup = useCallback((body: CelestialBody): THREE.Group => {
    const group = new THREE.Group();
    group.name = body.id;

    const isStar = body.type === 'star';
    const isBlackHole = body.type === 'black_hole';

    // Core sphere
    const sphereGeo = new THREE.SphereGeometry(body.radius, 32, 32);

    let mat: THREE.Material;
    if (isStar) {
      mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(body.color) });
    } else if (isBlackHole) {
      mat = new THREE.MeshBasicMaterial({ color: '#000000' });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(body.color),
        roughness: body.type === 'gas_giant' ? 0.3 : 0.7,
        metalness: body.type === 'asteroid' ? 0.8 : 0.1
      });
    }

    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.castShadow = !isStar;
    mesh.receiveShadow = !isStar;
    group.add(mesh);

    // Star Corona Glow / Black Hole Accretion Disk
    if (isStar) {
      const glowGeo = new THREE.SphereGeometry(body.radius * 1.3, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(body.color),
        transparent: true,
        opacity: 0.35,
        side: THREE.BackSide
      });
      group.add(new THREE.Mesh(glowGeo, glowMat));

      // Point Light from Sun
      const light = new THREE.PointLight(body.color, 2, 600);
      group.add(light);
    } else if (isBlackHole) {
      const diskGeo = new THREE.RingGeometry(body.radius * 1.5, body.radius * 3.5, 32);
      diskGeo.rotateX(Math.PI / 2.2);
      const diskMat = new THREE.MeshBasicMaterial({
        color: '#c084fc',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      group.add(new THREE.Mesh(diskGeo, diskMat));
    } else if (body.hasRings || body.type === 'gas_giant') {
      const ringGeo = new THREE.RingGeometry(body.radius * 1.4, body.radius * 2.3, 32);
      ringGeo.rotateX(Math.PI / 2.5);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(body.color).clone().addScalar(0.2),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      group.add(new THREE.Mesh(ringGeo, ringMat));
    }

    return group;
  }, []);

  // Update Bodies & Meshes in Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMeshMap = bodyMeshesRef.current;
    const currentTrailMap = trailLinesRef.current;
    const currentVectorMap = vectorLinesRef.current;

    const activeIds = new Set(bodies.map(b => b.id));

    // Remove old body meshes
    for (const [id, group] of currentMeshMap.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(group);
        currentMeshMap.delete(id);
      }
    }
    for (const [id, line] of currentTrailMap.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(line);
        currentTrailMap.delete(id);
      }
    }
    for (const [id, line] of currentVectorMap.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(line);
        currentVectorMap.delete(id);
      }
    }

    // Add / Update meshes
    for (const body of bodies) {
      let group = currentMeshMap.get(body.id);
      if (!group) {
        group = createBodyMeshGroup(body);
        scene.add(group);
        currentMeshMap.set(body.id, group);
      }

      // Update mesh position
      group.position.set(body.position.x, body.position.y, body.position.z);

      // Update main core mesh scale & color
      const coreMesh = group.children[0] as THREE.Mesh;
      if (coreMesh && coreMesh.geometry) {
        if (!coreMesh.geometry.boundingSphere) {
          coreMesh.geometry.computeBoundingSphere();
        }
        const baseRadius = coreMesh.geometry.boundingSphere?.radius || 1;
        const targetScale = body.radius;
        const scaleFactor = baseRadius > 0 ? targetScale / baseRadius : targetScale;
        coreMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        if (coreMesh.material && body.type !== 'black_hole') {
          (coreMesh.material as THREE.MeshStandardMaterial).color.set(body.color);
        }
      }

      // Update Trail Lines
      if (settings.showTrails && body.trailHistory.length > 1) {
        let trailLine = currentTrailMap.get(body.id);
        const positions = new Float32Array(body.trailHistory.length * 3);
        body.trailHistory.forEach((p, idx) => {
          positions[idx * 3] = p.x;
          positions[idx * 3 + 1] = p.y;
          positions[idx * 3 + 2] = p.z;
        });

        if (!trailLine) {
          const trailGeo = new THREE.BufferGeometry();
          trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const trailMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(body.color),
            transparent: true,
            opacity: 0.6
          });
          trailLine = new THREE.Line(trailGeo, trailMat);
          scene.add(trailLine);
          currentTrailMap.set(body.id, trailLine);
        } else {
          trailLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          trailLine.geometry.attributes.position.needsUpdate = true;
          (trailLine.material as THREE.LineBasicMaterial).color.set(body.color);
        }
        trailLine.visible = true;
      } else {
        const trailLine = currentTrailMap.get(body.id);
        if (trailLine) trailLine.visible = false;
      }

      // Update Velocity Vector Arrows
      if (settings.showVectors) {
        let vectorLine = currentVectorMap.get(body.id);
        const vLen = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2 + body.velocity.z ** 2) * 2;
        const positions = new Float32Array([
          body.position.x, body.position.y, body.position.z,
          body.position.x + body.velocity.x * 2,
          body.position.y + body.velocity.y * 2,
          body.position.z + body.velocity.z * 2
        ]);

        if (!vectorLine) {
          const vGeo = new THREE.BufferGeometry();
          vGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const vMat = new THREE.LineBasicMaterial({ color: '#22c55e', linewidth: 2 });
          vectorLine = new THREE.Line(vGeo, vMat);
          scene.add(vectorLine);
          currentVectorMap.set(body.id, vectorLine);
        } else {
          vectorLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          vectorLine.geometry.attributes.position.needsUpdate = true;
        }
        vectorLine.visible = vLen > 0.01;
      } else {
        const vectorLine = currentVectorMap.get(body.id);
        if (vectorLine) vectorLine.visible = false;
      }
    }
  }, [bodies, settings.showTrails, settings.showVectors, createBodyMeshGroup]);

  // Handle Collisions & Audio trigger
  useEffect(() => {
    if (collisions.length > 0 && settings.soundEnabled) {
      const now = Date.now();
      if (now - lastSoundTime.current > 80) {
        const latestEvt = collisions[collisions.length - 1];
        soundEngine.playCollision(latestEvt.intensity, latestEvt.intensity < 1);
        lastSoundTime.current = now;
      }
    }
  }, [collisions, settings.soundEnabled]);

  // Main Render Loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;

      if (!scene || !camera || !renderer) return;

      const selectedBody = bodies.find(b => b.id === selectedBodyId);

      // Camera Tracking & Smooth Interpolation
      if (cameraMode === 'follow' && selectedBody) {
        cameraTarget.current.lerp(new THREE.Vector3(selectedBody.position.x, selectedBody.position.y, selectedBody.position.z), 0.1);
      } else if (cameraMode === 'barycenter' && bodies.length > 0) {
        let cx = 0, cy = 0, cz = 0, totalM = 0;
        bodies.forEach(b => {
          cx += b.position.x * b.mass;
          cy += b.position.y * b.mass;
          cz += b.position.z * b.mass;
          totalM += b.mass;
        });
        if (totalM > 0) {
          cameraTarget.current.lerp(new THREE.Vector3(cx / totalM, cy / totalM, cz / totalM), 0.1);
        }
      }

      if (cameraMode === 'first_person' && selectedBody) {
        // Position camera right on planet surface looking forward
        const vLen = Math.sqrt(selectedBody.velocity.x ** 2 + selectedBody.velocity.y ** 2 + selectedBody.velocity.z ** 2) || 1;
        const forwardX = selectedBody.velocity.x / vLen;
        const forwardY = selectedBody.velocity.y / vLen;
        const forwardZ = selectedBody.velocity.z / vLen;

        const eyePos = new THREE.Vector3(
          selectedBody.position.x + forwardX * (selectedBody.radius + 0.5),
          selectedBody.position.y + forwardY * (selectedBody.radius + 0.5) + 0.5,
          selectedBody.position.z + forwardZ * (selectedBody.radius + 0.5)
        );

        camera.position.copy(eyePos);
        const lookTarget = new THREE.Vector3(
          selectedBody.position.x + forwardX * 100,
          selectedBody.position.y + forwardY * 100,
          selectedBody.position.z + forwardZ * 100
        );
        camera.lookAt(lookTarget);
      } else {
        // Standard Spherical Orbit Camera
        const sph = cameraSpherical.current;
        const cx = cameraTarget.current.x + sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
        const cy = cameraTarget.current.y + sph.radius * Math.cos(sph.phi);
        const cz = cameraTarget.current.z + sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);

        camera.position.set(cx, cy, cz);
        camera.lookAt(cameraTarget.current);
      }

      // Update Gravity Grid Deformation
      if (gravityGridRef.current) {
        gravityGridRef.current.visible = settings.showGravityGrid;
        if (settings.showGravityGrid && bodies.length > 0) {
          const gridGeo = gravityGridRef.current.geometry as THREE.BufferGeometry;
          const posAttr = gridGeo.attributes.position;
          const posArr = posAttr.array as Float32Array;

          for (let i = 0; i < posAttr.count; i++) {
            const gx = posArr[i * 3];
            const gz = posArr[i * 3 + 2];

            let warp = 0;
            for (const b of bodies) {
              const dx = gx - b.position.x;
              const dz = gz - b.position.z;
              const distSq = dx * dx + dz * dz + 4.0;
              warp -= (settings.gConstant * b.mass * 0.8) / Math.sqrt(distSq);
            }
            posArr[i * 3 + 1] = Math.max(-40, warp);
          }
          posAttr.needsUpdate = true;
        }
      }

      // Update Selection Ring
      if (selectionRingRef.current) {
        if (selectedBody) {
          selectionRingRef.current.visible = true;
          selectionRingRef.current.position.set(selectedBody.position.x, selectedBody.position.y - 0.2, selectedBody.position.z);
          const rScale = selectedBody.radius * 1.5;
          selectionRingRef.current.scale.set(rScale, rScale, rScale);
          selectionRingRef.current.rotation.z += 0.01;
        } else {
          selectionRingRef.current.visible = false;
        }
      }

      // Update Orbit Path Prediction
      if (orbitPredictLineRef.current) {
        if (settings.showOrbits && selectedBody && bodies.length > 1) {
          const pathPoints = predictOrbitPath(selectedBody, bodies, settings.gConstant, 250, 0.25);
          const posArr = new Float32Array(pathPoints.length * 3);
          pathPoints.forEach((p, idx) => {
            posArr[idx * 3] = p.x;
            posArr[idx * 3 + 1] = p.y;
            posArr[idx * 3 + 2] = p.z;
          });
          orbitPredictLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
          orbitPredictLineRef.current.geometry.attributes.position.needsUpdate = true;
          orbitPredictLineRef.current.visible = true;
        } else {
          orbitPredictLineRef.current.visible = false;
        }
      }

      // Project Labels to Screen Coordinates
      if (settings.showLabels && rendererRef.current && mountRef.current) {
        const labels: { id: string; name: string; mass: string; x: number; y: number; color: string }[] = [];
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        bodies.forEach((b) => {
          const p = new THREE.Vector3(b.position.x, b.position.y + b.radius + 1.2, b.position.z);
          p.project(camera);

          if (p.z < 1) {
            const sx = (p.x * 0.5 + 0.5) * width;
            const sy = (-p.y * 0.5 + 0.5) * height;

            if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
              labels.push({
                id: b.id,
                name: b.name,
                mass: b.mass >= 1000 ? `${(b.mass / 1000).toFixed(1)}k` : b.mass.toFixed(1),
                x: sx,
                y: sy,
                color: b.color
              });
            }
          }
        });
        setScreenLabels(labels);
      } else {
        setScreenLabels([]);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [bodies, cameraMode, selectedBodyId, settings, spawnConfig]);

  // Raycast to Ground Plane or Body
  const getGroundIntersection = (e: React.MouseEvent<HTMLDivElement>): THREE.Vector3 | null => {
    if (!mountRef.current || !cameraRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    mouseVec.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouseVec.current, cameraRef.current);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    return raycaster.current.ray.intersectPlane(plane, target);
  };

  const getClickedBodyId = (e: React.MouseEvent<HTMLDivElement>): string | null => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    mouseVec.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouseVec.current, cameraRef.current);

    const clickableMeshes: THREE.Object3D[] = [];
    bodyMeshesRef.current.forEach(group => {
      clickableMeshes.push(group.children[0]);
    });

    const intersects = raycaster.current.intersectObjects(clickableMeshes);
    if (intersects.length > 0) {
      const group = intersects[0].object.parent;
      return group ? group.name : null;
    }
    return null;
  };

  // Pointer Event Handlers for Drag, Orbit, Stream, and Launch
  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Left click
    if (e.button === 0) {
      const clickedId = getClickedBodyId(e);

      if (clickedId) {
        onSelectBody(clickedId);
        soundEngine.playSpawn(1.2);
        return;
      }

      const groundPos = getGroundIntersection(e);
      if (groundPos) {
        if (spawnConfig.spawnMode === 'stream') {
          // Start stream bombardment
          startStreamSpawn(groundPos);
        } else {
          // Single drag-to-throw or auto orbit spawn
          setIsDraggingLaunch(true);
          launchStartPos.current.copy(groundPos);
          launchCurrentPos.current.copy(groundPos);
        }
      }
    } else if (e.button === 1 || e.button === 2) {
      // Orbit camera rotate
      isMouseDown.current = true;
      mousePreviousPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingLaunch) {
      const groundPos = getGroundIntersection(e);
      if (groundPos) {
        launchCurrentPos.current.copy(groundPos);

        // Update 3D Arrow line
        if (launchArrowRef.current) {
          const positions = new Float32Array([
            launchStartPos.current.x, launchStartPos.current.y + 0.5, launchStartPos.current.z,
            launchCurrentPos.current.x, launchCurrentPos.current.y + 0.5, launchCurrentPos.current.z
          ]);
          launchArrowRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          launchArrowRef.current.geometry.attributes.position.needsUpdate = true;
          launchArrowRef.current.visible = true;
        }
      }
    } else if (isMouseDown.current) {
      const deltaX = e.clientX - mousePreviousPos.current.x;
      const deltaY = e.clientY - mousePreviousPos.current.y;

      if (e.shiftKey) {
        // Pan Camera
        const panSpeed = cameraSpherical.current.radius * 0.0015;
        cameraTarget.current.x -= deltaX * panSpeed;
        cameraTarget.current.z -= deltaY * panSpeed;
      } else {
        // Rotate Camera Spherical
        cameraSpherical.current.theta -= deltaX * 0.005;
        cameraSpherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraSpherical.current.phi - deltaY * 0.005));
      }

      mousePreviousPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const spawnSingleBody = (startPos: THREE.Vector3, currentPos: THREE.Vector3) => {
    let vel: Vector3D = { x: 0, y: 0, z: 0 };

    if (spawnConfig.spawnMode === 'auto_orbit') {
      // Find attractor body (either selected or heaviest star)
      const primaryAttractor = bodies.find(b => b.id === selectedBodyId) ||
        bodies.reduce((prev, curr) => (curr.mass > prev.mass ? curr : prev), bodies[0]);

      if (primaryAttractor) {
        vel = calculateOrbitalVelocity(
          { x: startPos.x, y: startPos.y, z: startPos.z },
          primaryAttractor,
          settings.gConstant,
          spawnConfig.initialSpeedMult
        );
      }
    } else {
      // Velocity proportional to drag vector
      const dx = (currentPos.x - startPos.x) * 0.25 * spawnConfig.initialSpeedMult;
      const dz = (currentPos.z - startPos.z) * 0.25 * spawnConfig.initialSpeedMult;
      vel = { x: dx, y: 0, z: dz };
    }

    const newBody: CelestialBody = {
      id: `body_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${spawnConfig.name} ${bodies.length + 1}`,
      mass: spawnConfig.mass,
      radius: (spawnConfig.mass <= 0 ? 0.5 : Math.max(0.4, Math.pow(spawnConfig.mass, 0.33) * 0.6)),
      position: { x: startPos.x, y: startPos.y, z: startPos.z },
      velocity: vel,
      color: spawnConfig.color,
      isFixed: false,
      isFragment: false,
      trailHistory: [],
      type: spawnConfig.type,
      createdAt: Date.now()
    };

    onAddBody(newBody);
    onSelectBody(newBody.id);
    soundEngine.playSpawn(1.0);
  };

  const startStreamSpawn = (startPos: THREE.Vector3) => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    const spawnNextInStream = () => {
      const scatterX = (Math.random() - 0.5) * 3;
      const scatterZ = (Math.random() - 0.5) * 3;

      const p: THREE.Vector3 = new THREE.Vector3(startPos.x + scatterX, startPos.y, startPos.z + scatterZ);
      spawnSingleBody(p, p);
      if (settings.soundEnabled) soundEngine.playStreamTick();
    };

    spawnNextInStream();
    streamIntervalRef.current = window.setInterval(spawnNextInStream, 1000 / spawnConfig.streamRate);
  };

  const stopStreamSpawn = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (isDraggingLaunch) {
      setIsDraggingLaunch(false);
      if (launchArrowRef.current) launchArrowRef.current.visible = false;
      spawnSingleBody(launchStartPos.current, launchCurrentPos.current);
    }
    stopStreamSpawn();
    isMouseDown.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    cameraSpherical.current.radius = Math.max(10, Math.min(800, cameraSpherical.current.radius + e.deltaY * 0.15));
  };

  return (
    <div
      ref={mountRef}
      id="simulation-canvas-container"
      className="relative w-full h-full cursor-crosshair overflow-hidden select-none"
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={handleWheel}
    >
      {/* Projected Screen Labels */}
      {settings.showLabels && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {screenLabels.map((lbl) => (
            <div
              key={lbl.id}
              className={`absolute transform -translate-x-1/2 -translate-y-full text-[10px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-md transition-opacity duration-150 ${
                lbl.id === selectedBodyId ? 'bg-amber-500/80 text-black shadow-lg scale-110 z-20' : 'bg-slate-900/70 text-slate-200 border border-slate-700/50'
              }`}
              style={{ left: `${lbl.x}px`, top: `${lbl.y}px` }}
            >
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lbl.color }} />
                <span>{lbl.name}</span>
                <span className="opacity-70">({lbl.mass}M)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Indicator Banner during Launch Dragging */}
      {isDraggingLaunch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-mono shadow-xl backdrop-blur-md pointer-events-none animate-pulse">
          Drag cursor to set velocity vector • Release to launch object
        </div>
      )}
    </div>
  );
};
