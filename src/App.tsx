import { useState, useEffect, useRef, useCallback } from 'react';
import { CelestialBody, SimulationSettings, SpawnConfig, CameraViewMode, CollisionEvent, SystemStats } from './types';
import { PRESETS, Preset } from './physics/presets';
import { updatePhysics, computeSystemStats, calculateRadius, calculateOrbitalVelocity } from './physics/nbodyEngine';
import { SimulationCanvas } from './components/SimulationCanvas';
import { RightSidebar } from './components/RightSidebar';
import { BottomControlBar } from './components/BottomControlBar';
import { TopHUD } from './components/TopHUD';
import { PresetsModal } from './components/PresetsModal';
import { InitialPresetsOverlay } from './components/InitialPresetsOverlay';

export default function App() {
   // Initial load gate — shows presets overlay until user picks one
   const [hasLoadedFirstPreset, setHasLoadedFirstPreset] = useState<boolean>(false);

   // Placeholder initial state — empty while overlay blocks view; genuinely changes when any preset is selected
   const [bodies, setBodies] = useState<CelestialBody[]>([]);
   const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
   const [isPaused, setIsPaused] = useState<boolean>(false);
   const [cameraMode, setCameraMode] = useState<CameraViewMode>('free');
   const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
   const [collisions, setCollisions] = useState<CollisionEvent[]>([]);

   // Simulation Settings
  const [settings, setSettings] = useState<SimulationSettings>({
    gConstant: 1.0,
    timeStep: 0.15,
    simSpeed: 1.0,
    subSteps: 4,
    collisionMode: 'merge',
    collisionSoftening: 0.8,
    fragmentCountOnImpact: 6,
    showTrails: true,
    trailLength: 60,
    showOrbits: true,
    showGravityGrid: false,
    showVectors: false,
    showLabels: true,
    soundEnabled: true,
    maxBodyLimit: 250
   });

   // Spawn Creator Configuration
  const [spawnConfig, setSpawnConfig] = useState<SpawnConfig>({
    name: 'Planet',
    mass: 1.0,
    color: '#38bdf8',
    type: 'rocky',
    spawnMode: 'single_drag',
    streamRate: 8,
    ringRadius: 50,
    ringCount: 35,
    initialSpeedMult: 1.0
   });

   // Real-Time System Stats
  const [stats, setStats] = useState<SystemStats>(() => computeSystemStats(bodies, 1.0));

   // Physics Animation Loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const fpsCounterRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: performance.now() });

  const runPhysicsStep = useCallback(() => {
    setBodies((prevBodies) => {
      const { bodies: nextBodies, collisions: newEvts } = updatePhysics(prevBodies, settings, (evt) => {
        setCollisions(c => [...c.slice(-10), evt]);
      });
      return nextBodies;
    });
   }, [settings]);

  useEffect(() => {
    const loop = (now: number) => {
       // Calculate FPS
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        const currentFps = Math.round((fpsCounterRef.current.frames * 1000) / (now - fpsCounterRef.current.lastTime));
        setStats(s => ({ ...s, fps: currentFps }));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
       }

      if (!isPaused) {
        runPhysicsStep();
       }

       // Update System Stats
      setStats(prev => ({
         ...computeSystemStats(bodies, settings.gConstant),
        fps: prev.fps
       }));

      lastTimeRef.current = now;
      animFrameRef.current = requestAnimationFrame(loop);
     };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
     };
   }, [isPaused, bodies, settings, runPhysicsStep]);

   // Selected Body Reference
  const selectedBody = bodies.find(b => b.id === selectedBodyId) || null;

   // Handlers
  const handleUpdateBody = (updated: CelestialBody) => {
    setBodies(prev => prev.map(b => (b.id === updated.id ? updated : b)));
   };

  const handleDeleteBody = (id: string) => {
    setBodies(prev => prev.filter(b => b.id !== id));
    if (selectedBodyId === id) setSelectedBodyId(null);
   };

  const handleDuplicateBody = (body: CelestialBody) => {
    const copy: CelestialBody = {
       ...body,
      id: `body_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${body.name} Copy`,
      position: { x: body.position.x + body.radius * 2.5, y: body.position.y, z: body.position.z + body.radius * 2.5 },
      trailHistory: [],
      createdAt: Date.now()
     };
    setBodies(prev => [...prev, copy]);
    setSelectedBodyId(copy.id);
   };

  const handleExplodeBody = (body: CelestialBody) => {
    handleDeleteBody(body.id);
    const fragCount = 8;
    const singleFragMass = Math.max(0.01, body.mass / fragCount);
    const frags: CelestialBody[] = [];

    for (let i = 0; i < fragCount; i++) {
      const angle = (i * Math.PI * 2) / fragCount;
      const speed = 4.0 + Math.random() * 3.0;
      frags.push({
        id: `frag_${Date.now()}_${i}`,
        name: `${body.name} Fragment`,
        mass: singleFragMass,
        radius: calculateRadius(singleFragMass, 'fragment'),
        position: {
          x: body.position.x + Math.cos(angle) * (body.radius * 1.5),
          y: body.position.y + (Math.random() - 0.5) * 2,
          z: body.position.z + Math.sin(angle) * (body.radius * 1.5)
         },
        velocity: {
          x: body.velocity.x + Math.cos(angle) * speed,
          y: body.velocity.y + (Math.random() - 0.5) * speed,
          z: body.velocity.z + Math.sin(angle) * speed
         },
        color: '#ff7733',
        isFixed: false,
        isFragment: true,
        trailHistory: [],
        type: 'fragment',
        createdAt: Date.now()
       });
     }

    setBodies(prev => [...prev, ...frags]);
   };

  const handleSpawnRingDisk = (count: number, radius: number, mass: number, color: string) => {
    const centerAttractor = bodies.find(b => b.id === selectedBodyId) ||
      bodies.reduce((prev, curr) => (curr.mass > (prev?.mass || 0) ? curr : prev), bodies[0]);

    if (!centerAttractor) return;

    const ringBodies: CelestialBody[] = [];
    for (let i = 0; i < count; i++) {
      const r = radius * (0.85 + Math.random() * 0.3);
      const angle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.2;

      const pos = {
        x: centerAttractor.position.x + Math.cos(angle) * r,
        y: centerAttractor.position.y + (Math.random() - 0.5) * 2,
        z: centerAttractor.position.z + Math.sin(angle) * r
       };

      const vel = calculateOrbitalVelocity(pos, centerAttractor, settings.gConstant);

      ringBodies.push({
        id: `ring_${Date.now()}_${i}`,
        name: `Ring Particle ${i + 1}`,
        mass,
        radius: calculateRadius(mass, 'rocky'),
        position: pos,
        velocity: vel,
        color,
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'rocky',
        createdAt: Date.now()
       });
     }

    setBodies(prev => [...prev, ...ringBodies]);
   };

  const handleLoadPreset = (preset: Preset) => {
    const newBodies = preset.generate(settings.gConstant);
    setBodies(newBodies);
    setSelectedBodyId(null);
    setCameraMode('free');
    if (!hasLoadedFirstPreset) {
      setHasLoadedFirstPreset(true);
     }
   };

  const handleQuickLoadPreset = (presetId: string) => {
    const found = PRESETS.find(p => p.id === presetId);
    if (found) handleLoadPreset(found);
   };

  return (
       <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans flex">
        {/* Three.js simulation canvas always mounted — initializes WebGL on page load */}
         <div className="relative flex-1 h-full z-0">
           <SimulationCanvas
            bodies={bodies}
            settings={settings}
            spawnConfig={spawnConfig}
            selectedBodyId={selectedBodyId}
            cameraMode={cameraMode}
            onSelectBody={setSelectedBodyId}
            onAddBody={(newBody) => setBodies(prev => [...prev, newBody])}
            collisions={collisions}
           />

           {/* Top HUD Overlay */}
           <TopHUD
            stats={stats}
            cameraMode={cameraMode}
            selectedBodyName={selectedBody?.name || null}
            onChangeCameraMode={setCameraMode}
            onQuickLoadPreset={handleQuickLoadPreset}
           />

           {/* Bottom Floating Control Bar */}
           <BottomControlBar
            isPaused={isPaused}
            settings={settings}
            onTogglePause={() => setIsPaused(!isPaused)}
            onStepFrame={runPhysicsStep}
            onUpdateSettings={(upd) => setSettings(s => ({ ...s, ...upd }))}
            onClearAll={() => {
              setBodies([]);
              setSelectedBodyId(null);
             }}
            onOpenPresets={() => setIsPresetsOpen(true)}
           />
         </div>

        {/* Right Column Inspector Sidebar */}
         <RightSidebar
          selectedBody={selectedBody}
          spawnConfig={spawnConfig}
          cameraMode={cameraMode}
          bodies={bodies}
          gConstant={settings.gConstant}
          onUpdateBody={handleUpdateBody}
          onDeleteBody={handleDeleteBody}
          onDuplicateBody={handleDuplicateBody}
          onExplodeBody={handleExplodeBody}
          onUpdateSpawnConfig={(cfg) => setSpawnConfig(c => ({ ...c, ...cfg }))}
          onChangeCameraMode={setCameraMode}
          onSelectBody={setSelectedBodyId}
          onSpawnRingDisk={handleSpawnRingDisk}
         />

        {/* Presets Modal (for reloading a different preset after simulation is running) */}
         <PresetsModal
          isOpen={isPresetsOpen}
          onClose={() => setIsPresetsOpen(false)}
          onSelectPreset={handleLoadPreset}
         />

        {/* Initial presets overlay — shown on first load, sits on top of everything */}
         {!hasLoadedFirstPreset && (
           <InitialPresetsOverlay onSelectPreset={handleLoadPreset} />
         )}
       </div>
    );
}