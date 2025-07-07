import * as THREE from 'three';
import { Noise } from 'noisejs';
import Alea from 'alea';
import WorleyNoise from 'worley-noise';

export const createImprovedNoise2D = (seed) => {
  const prng = Alea(seed);
  
  return (x, y, frequency = 1.0) => {
    const scaledFreq = Math.pow(frequency, 0.85);
    return prng();
  };
};

export const generateTerrain = (params, noise2D) => {
  // Determine world extents, fallback to params.size if width/height not provided
  const widthExtent = params.width !== undefined ? params.width : params.size;
  const heightExtent = params.height !== undefined ? params.height : params.size;
  const meshResolution = params.meshResolution || 512;
  const geometry = new THREE.PlaneGeometry(
    widthExtent,
    heightExtent,
    meshResolution,
    meshResolution
  );
  const positionAttr = geometry.attributes.position;
  const positions = positionAttr.array;
  const width = meshResolution + 1;
  const height = meshResolution + 1;

  // --- Improved Multi-Noise Heightmap Routine ---
  const prng = Alea(params.seed);
  const noise = new Noise(prng());
  // Use noisejs for proper 2D Perlin and Simplex
  function simplex2(x, y) { return noise.simplex2(x, y); }
  function perlin2(x, y) { return noise.perlin2(x, y); }
  // Worley noise instance, more points for more natural look
  const minPoints = 128;
  const maxPoints = 4096;
  const numPoints = Math.max(minPoints, Math.min(maxPoints, Math.floor(params.worleyPoints || meshResolution * 2)));
  let worley;
  
  const createWorleyPoints = (count, seed) => {
    const points = [];
    const prng = Alea(seed);
    for (let i = 0; i < count; i++) {
      points.push({
        x: prng(),
        y: prng()
      });
    }
    return points;
  };

  try {
    // Create initial points
    const points = createWorleyPoints(numPoints, params.worleySeed || params.seed);
    
    // Initialize Worley noise with points
    worley = new WorleyNoise({
      numPoints: points.length,
      seed: Math.floor(params.worleySeed || params.seed),
      dim: params.worleyDimension || 2
    });

    // Add points to the noise instance
    points.forEach(point => worley.addPoint(point));

    // Verify points were added successfully
    if (!worley.points || worley.points.length === 0) {
      throw new Error('Failed to initialize Worley noise points');
    }
  } catch (error) {
    console.error('Failed to initialize Worley noise:', error);
    // Create a more robust fallback implementation
    const points = createWorleyPoints(numPoints, params.worleySeed || params.seed);
    worley = {
      points,
      getEuclidean: (p) => {
        // Simple distance calculation as fallback
        let minDist = Infinity;
        points.forEach(point => {
          const dx = p.x - point.x;
          const dy = p.y - point.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          minDist = Math.min(minDist, dist);
        });
        return minDist;
      }
    };
  }

  const windDirection = params.windDirection || Math.PI / 4;
  const dirX = Math.cos(windDirection);
  const dirY = Math.sin(windDirection);
  const octaves = params.octaves || 6;
  const ridgedOffset = params.ridgedOffset || 0.5;
  const gain = params.gain || 0.5;
  const lacunarity = params.lacunarity || 2.0;
  const amplitude = params.amplitude || 1.0;
  const domainWarpStrength = params.domainWarpStrength || 0.35; // more natural default
  const domainWarpFreq = params.domainWarpFreq || 0.08; // more natural default

  // Precompute heightmap
  const heightmap = new Float32Array(width * height);
  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      // Map grid to world coordinates
      const x = (ix / (width - 1) - 0.5) * widthExtent;
      const y = (iy / (height - 1) - 0.5) * heightExtent;
      let h = 0;
      let amp = 1;
      let freq = params.frequency || 0.15;
      for (let o = 0; o < octaves; o++) {
        // Domain warp: warp coordinates by lower-freq noise, aligned to windDirection
        const warpFreq = domainWarpFreq * Math.pow(lacunarity, o);
        const warpAmp = domainWarpStrength * amp;
        const warpX = simplex2(x * warpFreq, y * warpFreq) * warpAmp * dirX;
        const warpY = simplex2(x * warpFreq + 100, y * warpFreq + 100) * warpAmp * dirY;
        const wx = x + warpX;
        const wy = y + warpY;
        // Sample noises
        let vSimplex = simplex2(wx * freq, wy * freq);
        let vPerlin = perlin2(wx * freq, wy * freq);
        // Worley: use normalized coordinates in [0,1], clamped
        let normX = clamp01(wx / widthExtent + 0.5);
        let normY = clamp01(wy / heightExtent + 0.5);
        let vWorley = worley.getEuclidean({ x: normX, y: normY }, 1);
        vWorley = 1.0 - 2.0 * vWorley;
        // Ridge transform
        vSimplex = ridgedOffset - Math.abs(vSimplex); vSimplex *= vSimplex;
        vPerlin = ridgedOffset - Math.abs(vPerlin); vPerlin *= vPerlin;
        vWorley = ridgedOffset - Math.abs(vWorley); vWorley *= vWorley;
        // Combine
        let v = (vSimplex + vPerlin + vWorley) / 3;
        // Micro-detail
        const micro = simplex2(wx * freq * 4, wy * freq * 4) * 0.1;
        v += micro;
        h += v * amp;
        amp *= gain;
        freq *= lacunarity;
      }
      heightmap[iy * width + ix] = h * amplitude;
    }
  }
  // Write to geometry
  for (let i = 0; i < positionAttr.count; i++) {
    const ix = i % width;
    const iy = Math.floor(i / width);
    positions[i * 3 + 2] = heightmap[iy * width + ix];
  }

  // Edge blend (as before)
  for (let i = 0; i < positionAttr.count; i++) {
    const x = positionAttr.getX(i);
    const y = positionAttr.getY(i);
    const gridX = Math.round((x + widthExtent / 2) / (widthExtent / meshResolution));
    const gridY = Math.round((y + heightExtent / 2) / (heightExtent / meshResolution));
    const margin = 1;
    const edgeDist = Math.min(gridX, gridY, width - 1 - gridX, height - 1 - gridY);
    if (edgeDist < margin) {
      const t = edgeDist / margin;
      const orig = positions[i * 3 + 2];
      positions[i * 3 + 2] = orig * t;
    }
  }
  // Smoothing (as before)
  if (params.applySmoothing) {
    applySmoothing(positions, width, height, params);
  }
  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  // Return only geometry as map generation is now universal
  return { geometry };
};

const applySmoothing = (positions, width, height, params) => {
  const tempPositions = new Float32Array(positions);
  const smoothKernel = [
    {x: -1, y: -1, weight: 0.5}, {x: 0, y: -1, weight: 1}, {x: 1, y: -1, weight: 0.5},
    {x: -1, y: 0, weight: 1}, {x: 1, y: 0, weight: 1},
    {x: -1, y: 1, weight: 0.5}, {x: 0, y: 1, weight: 1}, {x: 1, y: 1, weight: 0.5}
  ];
  const kernelWeight = 6;
  
  for (let iter = 0; iter < params.smoothIterations; iter++) {
    for (let i = 0; i < positions.length; i += 3) {
      const x = (i / 3) % width;
      const y = Math.floor((i / 3) / width);
      let sum = positions[i + 2] * kernelWeight;
      let totalWeight = kernelWeight;
      for (const {x: dx, y: dy, weight} of smoothKernel) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 3 + 2;
          sum += positions[nIdx] * weight;
          totalWeight += weight;
        }
      }
      const avg = sum / (totalWeight);
      tempPositions[i + 2] = THREE.MathUtils.lerp(
        positions[i + 2],
        avg,
        params.smoothFactor
      );
    }
    positions.set(tempPositions);
  }
};

// Helper to clamp values to [0, 1]
function clamp01(v) { return Math.max(0, Math.min(1, v)); } 