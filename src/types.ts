export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type BodyType = 'star' | 'rocky' | 'gas_giant' | 'black_hole' | 'asteroid' | 'fragment';

export interface CelestialBody {
  id: string;
  name: string;
  mass: number;
  radius: number;
  position: Vector3D;
  velocity: Vector3D;
  color: string;
  isFixed: boolean;
  isFragment: boolean;
  trailHistory: Vector3D[];
  type: BodyType;
  hasRings?: boolean;
  emissive?: boolean;
  createdAt: number;
}

export type SpawnMode = 'single_drag' | 'auto_orbit' | 'stream' | 'ring_disk';

export interface SpawnConfig {
  name: string;
  mass: number;
  color: string;
  type: BodyType;
  spawnMode: SpawnMode;
  streamRate: number; // bodies per sec
  ringRadius: number;
  ringCount: number;
  initialSpeedMult: number;
}

export type CollisionMode = 'merge' | 'fragment' | 'bounce';

export type CameraViewMode = 'free' | 'follow' | 'first_person' | 'barycenter';

export interface SimulationSettings {
  gConstant: number;
  timeStep: number;
  simSpeed: number;
  subSteps: number;
  collisionMode: CollisionMode;
  collisionSoftening: number;
  fragmentCountOnImpact: number;
  showTrails: boolean;
  trailLength: number;
  showOrbits: boolean;
  showGravityGrid: boolean;
  showVectors: boolean;
  showLabels: boolean;
  soundEnabled: boolean;
  maxBodyLimit: number;
}

export interface SystemStats {
  fps: number;
  bodyCount: number;
  totalMass: number;
  kineticEnergy: number;
  potentialEnergy: number;
  centerOfMass: Vector3D;
}

export interface CollisionEvent {
  x: number;
  y: number;
  z: number;
  color: string;
  intensity: number;
  timestamp: number;
}
