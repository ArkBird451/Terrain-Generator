// ScatterService.js
// Service for generating scatter masks and scatter points for procedural terrain scattering
// Inspired by modern approaches like GeoScatter

// Constants for terrain types
const TERRAIN_TYPES = {
  ALL: 'all',
  MOUNTAIN: 'mountain',
  VALLEY: 'valley',
  PLAIN: 'plain',
};

// Default parameters
const DEFAULT_MASK_THRESHOLD = 0.5;
const DEFAULT_SCATTER_ON = TERRAIN_TYPES.ALL;
const DEFAULT_DENSITY = 0.2;
const DEFAULT_SEED = 42;
const DEFAULT_POINT_RADIUS = 2;
const DEFAULT_MAX_SLOPE_DEG = 45;
const DEFAULT_TERRAIN_WIDTH = 10;
const DEFAULT_TERRAIN_HEIGHT = 10;

/**
 * Validates required parameters and throws if invalid.
 * @param {object} params - Parameters to validate.
 * @param {Array<string>} required - Required parameter names.
 */
function validateParams(params, required) {
  for (const key of required) {
    if (params[key] === undefined || params[key] === null) {
      throw new Error(`Missing required parameter: ${key}`);
    }
  }
}

/**
 * Generates a scatter mask based on the heightmap and parameters.
 * @param {Float32Array} heightmap - The heightmap data (flattened array).
 * @param {number} width - Width of the heightmap.
 * @param {number} height - Height of the heightmap.
 * @param {object} params - Scatter parameters.
 * @param {number} [params.maskThreshold=0.5] - Height threshold for mask (0-1).
 * @param {string} [params.scatterOn='all'] - Terrain type to scatter on ('all', 'mountain', 'valley', 'plain').
 * @returns {Uint8Array} - Binary mask (1 = scatter, 0 = no scatter).
 */
export function generateScatterMask(heightmap, width, height, params = {}) {
  validateParams({ heightmap, width, height }, ['heightmap', 'width', 'height']);
  const { maskThreshold = DEFAULT_MASK_THRESHOLD, scatterOn = DEFAULT_SCATTER_ON } = params;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        mask[i] = 0;
        continue;
      }
      const h = heightmap[i];
      let inMask = false;
      switch (scatterOn) {
        case TERRAIN_TYPES.MOUNTAIN:
          inMask = h > maskThreshold;
          break;
        case TERRAIN_TYPES.VALLEY:
          inMask = h < maskThreshold * 0.5;
          break;
        case TERRAIN_TYPES.PLAIN:
          inMask = h >= maskThreshold * 0.5 && h <= maskThreshold;
          break;
        default:
          inMask = h >= maskThreshold;
      }
      mask[i] = inMask ? 1 : 0;
    }
  }
  return mask;
}

/**
 * GLSL snippet for scatter mask generation (for use in shaders)
 * @returns {string}
 */
export function scatterMaskGLSL() {
  return `
  // height: normalized height (0-1)
  // maskThreshold: uniform float
  // scatterOn: int (0=all, 1=mountain, 2=valley, 3=plain)
  bool scatterMask(float height, float maskThreshold, int scatterOn) {
    if (scatterOn == 1) return height > maskThreshold;
    if (scatterOn == 2) return height < maskThreshold * 0.5;
    if (scatterOn == 3) return height >= maskThreshold * 0.5 && height <= maskThreshold;
    return height >= maskThreshold;
  }
  `;
}

/**
 * Generates scatter points using Bridson's Poisson Disk Sampling (true blue noise) within the mask.
 * Uses a spatial grid for efficient minimum distance checks.
 * Respects mask, density, and slope constraints.
 * @param {Uint8Array} mask - Binary mask (1 = scatter, 0 = no scatter).
 * @param {number} width - Width of the mask.
 * @param {number} height - Height of the mask.
 * @param {object} params - Scatter parameters.
 * @param {number} [params.density=0.2] - Scatter density (0-1, controls number of attempts per cell).
 * @param {number} [params.seed=42] - Random seed.
 * @param {number} [params.pointRadius=2] - Minimum grid distance between points.
 * @param {number} [params.maxSlopeDeg=45] - Maximum slope angle allowed for points in degrees.
 * @param {Float32Array} [params.heightmap] - Heightmap data.
 * @param {number} [params.terrainWidth=10] - Width of the terrain.
 * @param {number} [params.terrainHeight=10] - Height of the terrain.
 * @param {number} [params.k=30] - Number of candidate attempts per active point (default 30).
 * @returns {Array<{x: number, y: number}>} - Array of scatter points (in grid coordinates).
 */
export function generatePoissonScatterPoints(mask, width, height, params = {}) {
  validateParams({ mask, width, height }, ['mask', 'width', 'height']);
  const {
    density = DEFAULT_DENSITY,
    seed = DEFAULT_SEED,
    pointRadius = DEFAULT_POINT_RADIUS,
    maxSlopeDeg = DEFAULT_MAX_SLOPE_DEG,
    heightmap = null,
    terrainWidth = DEFAULT_TERRAIN_WIDTH,
    terrainHeight = DEFAULT_TERRAIN_HEIGHT,
    k = 30, // Number of candidate attempts per active point
  } = params;

  const minDist = Math.max(1, pointRadius);
  const cellSize = minDist / Math.SQRT2;
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);
  const grid = Array.from({ length: gridWidth * gridHeight }, () => null);
  const points = [];
  const active = [];
  const rng = mulberry32(seed);

  // Helper to get grid index
  function gridIndex(x, y) {
    return Math.floor(x / cellSize) + Math.floor(y / cellSize) * gridWidth;
  }

  // Helper to check if a candidate is valid
  function isValidCandidate(x, y) {
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return false;
    if (mask[Math.floor(y) * width + Math.floor(x)] !== 1) return false;
    // Slope filtering
    if (heightmap) {
      const idx = Math.floor(y) * width + Math.floor(x);
      const h = heightmap[idx];
      let maxSlopeAngle = 0;
      const dxWorld = terrainWidth / (width - 1);
      const dyWorld = terrainHeight / (height - 1);
      const neighbors = [
        [x - 1, y, dxWorld], [x + 1, y, dxWorld],
        [x, y - 1, dyWorld], [x, y + 1, dyWorld]
      ];
      for (const [nx, ny, dist] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = Math.floor(ny) * width + Math.floor(nx);
          const nh = heightmap[nIdx];
          const dz = nh - h;
          const angleRad = Math.atan2(Math.abs(dz), dist);
          const angleDeg = angleRad * 180 / Math.PI;
          if (angleDeg > maxSlopeAngle) maxSlopeAngle = angleDeg;
        }
      }
      if (maxSlopeAngle > maxSlopeDeg) return false;
    }
    // Check spatial grid for neighbors
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const nx = gx + i;
        const ny = gy + j;
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
          const neighborIdx = nx + ny * gridWidth;
          const pt = grid[neighborIdx];
          if (pt) {
            const dx = pt.x - x;
            const dy = pt.y - y;
            if (dx * dx + dy * dy < minDist * minDist) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  // Improved: Seed multiple initial points randomly across the mask for better coverage
  const initialSeeds = [];
  for (let i = 0; i < width * height; i++) {
    if (mask[i] === 1 && rng() < 0.005) { // 0.5% chance per valid cell
      const x0 = i % width;
      const y0 = Math.floor(i / width);
      if (!heightmap || isValidCandidate(x0, y0)) {
        initialSeeds.push({ x: x0, y: y0 });
      }
    }
  }
  // Fallback: if no seeds found, pick a random valid cell
  if (initialSeeds.length === 0) {
    let found = false;
    for (let attempt = 0; attempt < 1000 && !found; attempt++) {
      const x0 = Math.floor(rng() * width);
      const y0 = Math.floor(rng() * height);
      if (mask[y0 * width + x0] === 1 && (!heightmap || isValidCandidate(x0, y0))) {
        initialSeeds.push({ x: x0, y: y0 });
        found = true;
      }
    }
  }
  // Seed all initial points
  for (const pt of initialSeeds) {
    points.push(pt);
    active.push(pt);
    grid[gridIndex(pt.x, pt.y)] = pt;
  }
  if (active.length === 0) return [];

  while (active.length > 0) {
    // Pick a random active point
    const idx = Math.floor(rng() * active.length);
    const center = active[idx];
    let found = false;
    for (let i = 0; i < k; i++) {
      // Generate random point in the annulus [minDist, 2*minDist]
      const angle = rng() * 2 * Math.PI;
      const radius = minDist * (1 + rng());
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      if (isValidCandidate(x, y) && rng() < density) {
        const pt = { x, y };
        points.push(pt);
        active.push(pt);
        grid[gridIndex(x, y)] = pt;
        found = true;
        break;
      }
    }
    if (!found) {
      // No valid candidates, remove from active list
      active.splice(idx, 1);
    }
  }
  // Optionally round coordinates to integer grid
  return points.map(pt => ({ x: Math.round(pt.x), y: Math.round(pt.y) }));
}

/**
 * Simple seeded RNG (Mulberry32)
 * @param {number} a - Seed
 * @returns {function(): number} - RNG function returning [0,1)
 */
function mulberry32(a) {
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Example usage:
 * const mask = generateScatterMask(heightmap, width, height, params);
 * const points = generatePoissonScatterPoints(mask, width, height, params);
 */ 