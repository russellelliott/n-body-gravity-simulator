import { CelestialBody } from '../types';
import { calculateRadius, calculateOrbitalVelocity } from './nbodyEngine';

export interface Preset {
  id: string;
  name: string;
  description: string;
  iconName: string;
  generate: (gConstant: number) => CelestialBody[];
}

export const PRESETS: Preset[] = [
  {
    id: 'solar_system',
    name: 'Solar System',
    description: 'The Sun, inner rocky planets, gas giants with rings, Earth-Moon system, and asteroid belt.',
    iconName: 'Sun',
    generate: (G) => {
      const bodies: CelestialBody[] = [];

      // Sun
      const sun: CelestialBody = {
        id: 'sun',
        name: 'Sun',
        mass: 1000,
        radius: calculateRadius(1000, 'star'),
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#ffcc00',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'star',
        emissive: true,
        createdAt: Date.now()
      };
      bodies.push(sun);

      const planetsData = [
        { name: 'Mercury', mass: 0.1, dist: 18, color: '#a1a1a1', type: 'rocky' as const },
        { name: 'Venus', mass: 0.8, dist: 28, color: '#e3bb76', type: 'rocky' as const },
        { name: 'Earth', mass: 1.0, dist: 42, color: '#38bdf8', type: 'rocky' as const },
        { name: 'Mars', mass: 0.2, dist: 58, color: '#ef4444', type: 'rocky' as const },
        { name: 'Jupiter', mass: 25, dist: 85, color: '#f97316', type: 'gas_giant' as const, hasRings: true },
        { name: 'Saturn', mass: 15, dist: 125, color: '#eab308', type: 'gas_giant' as const, hasRings: true },
        { name: 'Uranus', mass: 5, dist: 165, color: '#06b6d4', type: 'gas_giant' as const, hasRings: true },
        { name: 'Neptune', mass: 4.8, dist: 205, color: '#3b82f6', type: 'gas_giant' as const, hasRings: true },
      ];

      planetsData.forEach((p, idx) => {
        const angle = (idx * Math.PI * 2) / planetsData.length + Math.random() * 0.5;
        const pos = {
          x: Math.cos(angle) * p.dist,
          y: (Math.random() - 0.5) * 2,
          z: Math.sin(angle) * p.dist
        };
        const vel = calculateOrbitalVelocity(pos, sun, G);

        const planet: CelestialBody = {
          id: p.name.toLowerCase(),
          name: p.name,
          mass: p.mass,
          radius: calculateRadius(p.mass, p.type),
          position: pos,
          velocity: vel,
          color: p.color,
          isFixed: false,
          isFragment: false,
          trailHistory: [],
          type: p.type,
          hasRings: p.hasRings,
          createdAt: Date.now()
        };
        bodies.push(planet);

        // Add Moon for Earth
        if (p.name === 'Earth') {
          const moonDist = 4.5;
          const moonPos = {
            x: pos.x + moonDist,
            y: pos.y,
            z: pos.z
          };
          const moonRelVel = calculateOrbitalVelocity(moonPos, planet, G);
          const moon: CelestialBody = {
            id: 'moon',
            name: 'Moon',
            mass: 0.03,
            radius: calculateRadius(0.03, 'rocky'),
            position: moonPos,
            velocity: moonRelVel,
            color: '#cbd5e1',
            isFixed: false,
            isFragment: false,
            trailHistory: [],
            type: 'rocky',
            createdAt: Date.now()
          };
          bodies.push(moon);
        }
      });

      // Asteroid belt between Mars and Jupiter (dist ~68 to 78)
      for (let i = 0; i < 40; i++) {
        const dist = 68 + Math.random() * 12;
        const angle = Math.random() * Math.PI * 2;
        const pos = {
          x: Math.cos(angle) * dist,
          y: (Math.random() - 0.5) * 3,
          z: Math.sin(angle) * dist
        };
        const vel = calculateOrbitalVelocity(pos, sun, G);
        const mass = 0.01 + Math.random() * 0.02;

        bodies.push({
          id: `ast_${i}`,
          name: `Asteroid ${i + 1}`,
          mass,
          radius: calculateRadius(mass, 'asteroid'),
          position: pos,
          velocity: vel,
          color: '#94a3b8',
          isFixed: false,
          isFragment: false,
          trailHistory: [],
          type: 'asteroid',
          createdAt: Date.now()
        });
      }

      return bodies;
    }
  },
  {
    id: 'binary_stars',
    name: 'Binary Star System',
    description: 'Two massive stars orbiting a common center of mass with circumbinary planetary system.',
    iconName: 'Stars',
    generate: (G) => {
      const bodies: CelestialBody[] = [];
      const separation = 30;
      const m1 = 600;
      const m2 = 400;

      const vOrb = Math.sqrt((G * (m1 + m2)) / separation);
      const v1 = vOrb * (m2 / (m1 + m2));
      const v2 = vOrb * (m1 / (m1 + m2));

      const star1: CelestialBody = {
        id: 'star_a',
        name: 'Alpha Centauri A',
        mass: m1,
        radius: calculateRadius(m1, 'star'),
        position: { x: -separation * (m2 / (m1 + m2)), y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: v1 },
        color: '#fbbf24',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'star',
        emissive: true,
        createdAt: Date.now()
      };

      const star2: CelestialBody = {
        id: 'star_b',
        name: 'Alpha Centauri B',
        mass: m2,
        radius: calculateRadius(m2, 'star'),
        position: { x: separation * (m1 / (m1 + m2)), y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -v2 },
        color: '#f87171',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'star',
        emissive: true,
        createdAt: Date.now()
      };

      bodies.push(star1, star2);

      // Circumbinary planets orbiting far outside
      const barycenter: CelestialBody = {
        id: 'barycenter',
        name: 'Center',
        mass: m1 + m2,
        radius: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#ffffff',
        isFixed: true,
        isFragment: false,
        trailHistory: [],
        type: 'star',
        createdAt: Date.now()
      };

      const planetDists = [65, 95, 130, 175];
      const planetColors = ['#22d3ee', '#a3e635', '#c084fc', '#f43f5e'];

      planetDists.forEach((d, i) => {
        const angle = (i * Math.PI * 2) / 4 + 0.3;
        const pos = {
          x: Math.cos(angle) * d,
          y: (Math.random() - 0.5) * 4,
          z: Math.sin(angle) * d
        };
        const vel = calculateOrbitalVelocity(pos, barycenter, G);

        bodies.push({
          id: `cb_planet_${i}`,
          name: `Tatooine ${i + 1}`,
          mass: 1.2 + i * 0.8,
          radius: calculateRadius(1.2 + i * 0.8, 'rocky'),
          position: pos,
          velocity: vel,
          color: planetColors[i],
          isFixed: false,
          isFragment: false,
          trailHistory: [],
          type: 'rocky',
          createdAt: Date.now()
        });
      });

      return bodies;
    }
  },
  {
    id: 'galaxy_disk',
    name: 'Galaxy Disk / Spiral',
    description: 'Supermassive Black Hole at core surrounded by 100+ orbiting stars and stellar debris.',
    iconName: 'Disc',
    generate: (G) => {
      const bodies: CelestialBody[] = [];

      // Supermassive Black Hole
      const bh: CelestialBody = {
        id: 'black_hole',
        name: 'Sagittarius A*',
        mass: 3000,
        radius: calculateRadius(3000, 'black_hole'),
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#a855f7',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'black_hole',
        createdAt: Date.now()
      };
      bodies.push(bh);

      const numStars = 100;
      for (let i = 0; i < numStars; i++) {
        const r = 20 + Math.pow(Math.random(), 0.7) * 160;
        const armAngle = (i % 2 === 0 ? 0 : Math.PI) + (r * 0.03) + (Math.random() - 0.5) * 0.6;

        const pos = {
          x: Math.cos(armAngle) * r,
          y: (Math.random() - 0.5) * (r * 0.05),
          z: Math.sin(armAngle) * r
        };

        const vel = calculateOrbitalVelocity(pos, bh, G, 0.98 + Math.random() * 0.04);
        const mass = 0.2 + Math.random() * 1.5;

        const colorHue = Math.random();
        let color = '#38bdf8';
        if (colorHue < 0.3) color = '#fef08a';
        else if (colorHue < 0.6) color = '#f472b6';

        bodies.push({
          id: `star_disk_${i}`,
          name: `Star ${i + 1}`,
          mass,
          radius: calculateRadius(mass, 'star'),
          position: pos,
          velocity: vel,
          color,
          isFixed: false,
          isFragment: false,
          trailHistory: [],
          type: 'star',
          createdAt: Date.now()
        });
      }

      return bodies;
    }
  },
  {
    id: 'figure_8',
    name: 'Figure-8 Three-Body',
    description: 'A stable periodic 3-body solution moving along an elegant figure-eight curve.',
    iconName: 'Infinity',
    generate: (_) => {
      const bodies: CelestialBody[] = [];
      const m = 300;

      // Classic figure-8 initial conditions normalized
      const x1 = -0.97000436 * 35;
      const y1 = 0.24308753 * 35;
      const vx1 = 0.46620531 * 2.5;
      const vy1 = 0.43236573 * 2.5;

      bodies.push({
        id: 'fig_1',
        name: 'Alpha',
        mass: m,
        radius: calculateRadius(m, 'star'),
        position: { x: x1, y: 0, z: y1 },
        velocity: { x: vx1, y: 0, z: vy1 },
        color: '#f43f5e',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'star',
        emissive: true,
        createdAt: Date.now()
      });

      bodies.push({
        id: 'fig_2',
        name: 'Beta',
        mass: m,
        radius: calculateRadius(m, 'star'),
        position: { x: -x1, y: 0, z: -y1 },
        velocity: { x: vx1, y: 0, z: vy1 },
        color: '#3b82f6',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'star',
        emissive: true,
        createdAt: Date.now()
      });

      bodies.push({
        id: 'fig_3',
        name: 'Gamma',
        mass: m,
        radius: calculateRadius(m, 'star'),
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: -2 * vx1, y: 0, z: -2 * vy1 },
        color: '#10b981',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'star',
        emissive: true,
        createdAt: Date.now()
      });

      return bodies;
    }
  },
  {
    id: 'planet_smash',
    name: 'Planetary Smash',
    description: 'Two massive rocky worlds on a high-speed collision trajectory to trigger fragmentation.',
    iconName: 'Zap',
    generate: (G) => {
      const bodies: CelestialBody[] = [];

      const p1Mass = 80;
      const p2Mass = 50;

      const p1: CelestialBody = {
        id: 'smash_1',
        name: 'Aegis',
        mass: p1Mass,
        radius: calculateRadius(p1Mass, 'rocky'),
        position: { x: -40, y: 0, z: -2 },
        velocity: { x: 3.5, y: 0, z: 0.1 },
        color: '#06b6d4',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'rocky',
        createdAt: Date.now()
      };

      const p2: CelestialBody = {
        id: 'smash_2',
        name: 'Vulcan',
        mass: p2Mass,
        radius: calculateRadius(p2Mass, 'rocky'),
        position: { x: 40, y: 0, z: 2 },
        velocity: { x: -3.5, y: 0, z: -0.1 },
        color: '#ef4444',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'rocky',
        createdAt: Date.now()
      };

      bodies.push(p1, p2);

      // Add a couple small moons nearby watching the impact
      const moon1Pos = { x: -40, y: 0, z: 12 };
      bodies.push({
        id: 'moon_obs_1',
        name: 'Observer Moon',
        mass: 0.5,
        radius: calculateRadius(0.5, 'rocky'),
        position: moon1Pos,
        velocity: calculateOrbitalVelocity(moon1Pos, p1, G),
        color: '#e2e8f0',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'rocky',
        createdAt: Date.now()
      });

      return bodies;
    }
  },
  {
    id: 'ring_stream',
    name: 'Ring Stream Bombardment',
    description: 'A gas giant surrounded by a ring stream of small bodies that continuously bombard and grow the planet.',
    iconName: 'Orbit',
    generate: (G) => {
      const bodies: CelestialBody[] = [];

      const center: CelestialBody = {
        id: 'target_giant',
        name: 'Goliath',
        mass: 500,
        radius: calculateRadius(500, 'gas_giant'),
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#10b981',
        isFixed: false,
        isFragment: false,
        trailHistory: [],
        type: 'gas_giant',
        hasRings: true,
        createdAt: Date.now()
      };
      bodies.push(center);

      // Stream of incoming projectiles
      for (let i = 0; i < 35; i++) {
        const dist = 25 + Math.random() * 35;
        const angle = (i * Math.PI * 2) / 35;
        const pos = {
          x: Math.cos(angle) * dist,
          y: (Math.random() - 0.5) * 2,
          z: Math.sin(angle) * dist
        };
        // Intentionally slightly decayed orbit so they collide over time
        const vel = calculateOrbitalVelocity(pos, center, G, 0.85);
        const m = 0.5 + Math.random() * 1.5;

        bodies.push({
          id: `ring_body_${i}`,
          name: `Moondust ${i + 1}`,
          mass: m,
          radius: calculateRadius(m, 'rocky'),
          position: pos,
          velocity: vel,
          color: Math.random() > 0.5 ? '#f59e0b' : '#38bdf8',
          isFixed: false,
          isFragment: false,
          trailHistory: [],
          type: 'rocky',
          createdAt: Date.now()
        });
      }

      return bodies;
    }
  },
  {
    id: 'empty',
    name: 'Empty Canvas',
    description: 'Blank space sandbox for custom celestial building.',
    iconName: 'PlusCircle',
    generate: () => []
  }
];
