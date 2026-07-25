import { CelestialBody, Vector3D, SimulationSettings, SystemStats, CollisionEvent, BodyType } from '../types';

export function calculateRadius(mass: number, type: BodyType): number {
  let density = 1.0;
  let minR = 0.5;

  switch (type) {
    case 'star':
      density = 0.2;
      minR = 2.5;
      break;
    case 'gas_giant':
      density = 0.4;
      minR = 1.5;
      break;
    case 'rocky':
      density = 1.2;
      minR = 0.8;
      break;
    case 'asteroid':
      density = 1.5;
      minR = 0.4;
      break;
    case 'black_hole':
      density = 5.0; // Dense event horizon
      minR = 1.2;
      break;
    case 'fragment':
      density = 1.5;
      minR = 0.25;
      break;
  }

  // Physical radius from volume V = M / density => R ~ (M / density)^(1/3)
  const calculatedR = Math.pow((3 * mass) / (4 * Math.PI * density), 1 / 3);
  return Math.max(minR, calculatedR);
}

export function distance(v1: Vector3D, v2: Vector3D): number {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  const dz = v1.z - v2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function computeSystemStats(bodies: CelestialBody[], gConstant: number): SystemStats {
  let totalMass = 0;
  let cmX = 0, cmY = 0, cmZ = 0;
  let kineticEnergy = 0;
  let potentialEnergy = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    totalMass += b.mass;
    cmX += b.mass * b.position.x;
    cmY += b.mass * b.position.y;
    cmZ += b.mass * b.position.z;

    const vSq = b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y + b.velocity.z * b.velocity.z;
    kineticEnergy += 0.5 * b.mass * vSq;
  }

  if (totalMass > 0) {
    cmX /= totalMass;
    cmY /= totalMass;
    cmZ /= totalMass;
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const b1 = bodies[i];
      const b2 = bodies[j];
      const dist = Math.max(0.1, distance(b1.position, b2.position));
      potentialEnergy -= (gConstant * b1.mass * b2.mass) / dist;
    }
  }

  return {
    fps: 60,
    bodyCount: bodies.length,
    totalMass,
    kineticEnergy,
    potentialEnergy,
    centerOfMass: { x: cmX, y: cmY, z: cmZ }
  };
}

export function updatePhysics(
  bodies: CelestialBody[],
  settings: SimulationSettings,
  onCollision?: (event: CollisionEvent, m1: number, isFrag: boolean) => void
): { bodies: CelestialBody[]; collisions: CollisionEvent[] } {
  if (bodies.length === 0) return { bodies, collisions: [] };

  const { gConstant, timeStep, simSpeed, subSteps, collisionMode, collisionSoftening, trailLength, maxBodyLimit } = settings;
  const dt = (timeStep * simSpeed) / subSteps;
  const collisions: CollisionEvent[] = [];

  let currentBodies = [...bodies.map(b => ({
    ...b,
    position: { ...b.position },
    velocity: { ...b.velocity },
    trailHistory: [...b.trailHistory]
  }))];

  for (let step = 0; step < subSteps; step++) {
    const n = currentBodies.length;
    const ax = new Float64Array(n);
    const ay = new Float64Array(n);
    const az = new Float64Array(n);

    // 1. Calculate gravitational forces
    for (let i = 0; i < n; i++) {
      const b1 = currentBodies[i];
      for (let j = i + 1; j < n; j++) {
        const b2 = currentBodies[j];

        const dx = b2.position.x - b1.position.x;
        const dy = b2.position.y - b1.position.y;
        const dz = b2.position.z - b1.position.z;

        const distSq = dx * dx + dy * dy + dz * dz + collisionSoftening * collisionSoftening;
        const dist = Math.sqrt(distSq);
        const invDist3 = 1.0 / (distSq * dist);

        const force = gConstant * invDist3;

        const f1 = force * b2.mass;
        ax[i] += dx * f1;
        ay[i] += dy * f1;
        az[i] += dz * f1;

        const f2 = force * b1.mass;
        ax[j] -= dx * f2;
        ay[j] -= dy * f2;
        az[j] -= dz * f2;
      }
    }

    // 2. Integration
    for (let i = 0; i < n; i++) {
      const b = currentBodies[i];
      if (!b.isFixed) {
        b.velocity.x += ax[i] * dt;
        b.velocity.y += ay[i] * dt;
        b.velocity.z += az[i] * dt;

        b.position.x += b.velocity.x * dt;
        b.position.y += b.velocity.y * dt;
        b.position.z += b.velocity.z * dt;
      }
    }

    // 3. Collision Detection & Resolution
    const toRemove = new Set<string>();
    const newFragments: CelestialBody[] = [];

    for (let i = 0; i < currentBodies.length; i++) {
      const b1 = currentBodies[i];
      if (toRemove.has(b1.id)) continue;

      for (let j = i + 1; j < currentBodies.length; j++) {
        const b2 = currentBodies[j];
        if (toRemove.has(b2.id)) continue;

        const dist = distance(b1.position, b2.position);
        const minDistance = b1.radius + b2.radius;

        if (dist < minDistance * 0.9) {
          // Collision happened!
          const primary = b1.mass >= b2.mass ? b1 : b2;
          const secondary = b1.mass >= b2.mass ? b2 : b1;

          const cX = (primary.position.x * primary.mass + secondary.position.x * secondary.mass) / (primary.mass + secondary.mass);
          const cY = (primary.position.y * primary.mass + secondary.position.y * secondary.mass) / (primary.mass + secondary.mass);
          const cZ = (primary.position.z * primary.mass + secondary.position.z * secondary.mass) / (primary.mass + secondary.mass);

          const evt: CollisionEvent = {
            x: cX, y: cY, z: cZ,
            color: primary.color,
            intensity: Math.min(5, Math.log10(primary.mass + secondary.mass + 1)),
            timestamp: Date.now()
          };
          collisions.push(evt);

          if (collisionMode === 'merge') {
            // Accretion/merge
            const totalM = primary.mass + secondary.mass;
            primary.velocity.x = (primary.velocity.x * primary.mass + secondary.velocity.x * secondary.mass) / totalM;
            primary.velocity.y = (primary.velocity.y * primary.mass + secondary.velocity.y * secondary.mass) / totalM;
            primary.velocity.z = (primary.velocity.z * primary.mass + secondary.velocity.z * secondary.mass) / totalM;

            primary.position.x = cX;
            primary.position.y = cY;
            primary.position.z = cZ;

            primary.mass = totalM;
            primary.radius = calculateRadius(primary.mass, primary.type);

            toRemove.add(secondary.id);
            if (onCollision) onCollision(evt, totalM, false);

          } else if (collisionMode === 'fragment') {
            // High energy breakup
            const totalM = primary.mass + secondary.mass;
            const fragmentMassTotal = secondary.mass * 0.8 + primary.mass * 0.15;
            const retainedMass = totalM - fragmentMassTotal;

            // Primary keeps retained mass
            primary.mass = Math.max(0.1, retainedMass);
            primary.radius = calculateRadius(primary.mass, primary.type);
            primary.position.x = cX;
            primary.position.y = cY;
            primary.position.z = cZ;

            // Velocity of primary after momentum transfer
            primary.velocity.x = (primary.velocity.x * primary.mass + secondary.velocity.x * secondary.mass) / totalM;
            primary.velocity.y = (primary.velocity.y * primary.mass + secondary.velocity.y * secondary.mass) / totalM;
            primary.velocity.z = (primary.velocity.z * primary.mass + secondary.velocity.z * secondary.mass) / totalM;

            toRemove.add(secondary.id);

            // Spawn fragments if under limit
            if (currentBodies.length - toRemove.size + newFragments.length < maxBodyLimit) {
              const fragCount = Math.min(settings.fragmentCountOnImpact, 8);
              const singleFragMass = Math.max(0.01, fragmentMassTotal / fragCount);

              for (let f = 0; f < fragCount; f++) {
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = (Math.random() - 0.5) * Math.PI;
                const expSpeed = (2 + Math.random() * 4) * Math.sqrt(gConstant * primary.mass / primary.radius);

                const fVx = primary.velocity.x + Math.cos(angle1) * Math.cos(angle2) * expSpeed;
                const fVy = primary.velocity.y + Math.sin(angle2) * expSpeed;
                const fVz = primary.velocity.z + Math.sin(angle1) * Math.cos(angle2) * expSpeed;

                const spawnDist = primary.radius * (1.2 + Math.random() * 0.5);

                const frag: CelestialBody = {
                  id: `frag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  name: `Fragment`,
                  mass: singleFragMass,
                  radius: calculateRadius(singleFragMass, 'fragment'),
                  position: {
                    x: cX + Math.cos(angle1) * spawnDist,
                    y: cY + Math.sin(angle2) * spawnDist,
                    z: cZ + Math.sin(angle1) * spawnDist
                  },
                  velocity: { x: fVx, y: fVy, z: fVz },
                  color: Math.random() > 0.5 ? '#ff7733' : '#ffcc00',
                  isFixed: false,
                  isFragment: true,
                  trailHistory: [],
                  type: 'fragment',
                  createdAt: Date.now()
                };
                newFragments.push(frag);
              }
            }

            if (onCollision) onCollision(evt, totalM, true);

          } else if (collisionMode === 'bounce') {
            // Elastic bounce
            const nx = (b2.position.x - b1.position.x) / dist;
            const ny = (b2.position.y - b1.position.y) / dist;
            const nz = (b2.position.z - b1.position.z) / dist;

            const kx = b1.velocity.x - b2.velocity.x;
            const ky = b1.velocity.y - b2.velocity.y;
            const kz = b1.velocity.z - b2.velocity.z;

            const p = 2 * (nx * kx + ny * ky + nz * kz) / (b1.mass + b2.mass);

            if (!b1.isFixed) {
              b1.velocity.x -= p * b2.mass * nx * 0.8;
              b1.velocity.y -= p * b2.mass * ny * 0.8;
              b1.velocity.z -= p * b2.mass * nz * 0.8;
            }
            if (!b2.isFixed) {
              b2.velocity.x += p * b1.mass * nx * 0.8;
              b2.velocity.y += p * b1.mass * ny * 0.8;
              b2.velocity.z += p * b1.mass * nz * 0.8;
            }

            // Separate slightly to prevent sticking
            const overlap = minDistance - dist;
            if (!b1.isFixed) {
              b1.position.x -= nx * overlap * 0.5;
              b1.position.y -= ny * overlap * 0.5;
              b1.position.z -= nz * overlap * 0.5;
            }
            if (!b2.isFixed) {
              b2.position.x += nx * overlap * 0.5;
              b2.position.y += ny * overlap * 0.5;
              b2.position.z += nz * overlap * 0.5;
            }

            if (onCollision) onCollision(evt, b1.mass + b2.mass, false);
          }
        }
      }
    }

    if (toRemove.size > 0 || newFragments.length > 0) {
      currentBodies = currentBodies.filter(b => !toRemove.has(b.id)).concat(newFragments);
    }
  }

  // Record trail history at the end of the frame
  if (settings.showTrails && trailLength > 0) {
    for (const b of currentBodies) {
      if (b.trailHistory.length === 0 || distance(b.position, b.trailHistory[b.trailHistory.length - 1]) > 0.8) {
        b.trailHistory.push({ ...b.position });
        if (b.trailHistory.length > trailLength) {
          b.trailHistory.shift();
        }
      }
    }
  }

  return { bodies: currentBodies, collisions };
}

export function calculateOrbitalVelocity(
  pos: Vector3D,
  centerBody: CelestialBody,
  gConstant: number,
  speedMult: number = 1.0
): Vector3D {
  const dx = pos.x - centerBody.position.x;
  const dy = pos.y - centerBody.position.y;
  const dz = pos.z - centerBody.position.z;

  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (r === 0) return { x: 0, y: 0, z: 0 };

  const vOrb = Math.sqrt((gConstant * centerBody.mass) / r) * speedMult;

  // Tangent vector in XY plane (or general perpendicular vector)
  let tx = -dy;
  let ty = dx;
  let tz = 0;

  const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
  if (tLen < 0.0001) {
    tx = 0;
    ty = -dz;
    tz = dy;
  }
  const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;

  tx = (tx / len) * vOrb;
  ty = (ty / len) * vOrb;
  tz = (tz / len) * vOrb;

  return {
    x: centerBody.velocity.x + tx,
    y: centerBody.velocity.y + ty,
    z: centerBody.velocity.z + tz
  };
}

export function predictOrbitPath(
  targetBody: CelestialBody,
  bodies: CelestialBody[],
  gConstant: number,
  steps = 200,
  dt = 0.3
): Vector3D[] {
  const points: Vector3D[] = [];
  if (bodies.length < 2) return points;

  let posX = targetBody.position.x;
  let posY = targetBody.position.y;
  let posZ = targetBody.position.z;

  let vx = targetBody.velocity.x;
  let vy = targetBody.velocity.y;
  let vz = targetBody.velocity.z;

  const otherBodies = bodies.filter(b => b.id !== targetBody.id);

  for (let s = 0; s < steps; s++) {
    let ax = 0, ay = 0, az = 0;

    for (const b of otherBodies) {
      const dx = b.position.x - posX;
      const dy = b.position.y - posY;
      const dz = b.position.z - posZ;

      const distSq = dx * dx + dy * dy + dz * dz + 1.0;
      const dist = Math.sqrt(distSq);
      const force = (gConstant * b.mass) / (distSq * dist);

      ax += dx * force;
      ay += dy * force;
      az += dz * force;
    }

    vx += ax * dt;
    vy += ay * dt;
    vz += az * dt;

    posX += vx * dt;
    posY += vy * dt;
    posZ += vz * dt;

    points.push({ x: posX, y: posY, z: posZ });
  }

  return points;
}
