/**
 * ErosionSimulator: Enhanced hydraulic erosion simulation for heightfields.
 * Supports multi-scale erosion, sediment size distribution, and flow accumulation.
 */
export default class ErosionSimulator {
  /**
   * @param {number} width - Grid width.
   * @param {number} height - Grid height.
   * @param {Float32Array} heightMap - Initial heights (row-major).
   * @param {Object} params - Physical parameters (inertia, friction, etc.).
   */
  constructor(width, height, heightMap, params = {}) {
    this.width = width;
    this.height = height;
    this.heightMap = new Float32Array(heightMap);
    
    // Calculate resolution factor (normalized to 500x500 as baseline)
    const resolutionFactor = Math.sqrt((width * height) / (500 * 500));
    
    // Initialize permutation table for noise
    this._p = new Array(512);
    const permutation = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,
      68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
      102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,
      3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
      223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,
      112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,
      49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];
    for (let i = 0; i < 256; i++) {
      this._p[i] = permutation[i];
      this._p[i + 256] = permutation[i];
    }

    // Scale parameters based on resolution
    const scaledParams = {
      // Core parameters - Scaled for resolution
      inertia: 0.01 * Math.pow(resolutionFactor, -0.5),           // Reduced for higher resolutions
      friction: 0.005 * Math.pow(resolutionFactor, -0.5),         // Reduced for higher resolutions
      sedimentCapacityFactor: 1.0 * resolutionFactor,            // Increased for higher resolutions
      depositionRate: 0.08 * resolutionFactor,                   // Increased for higher resolutions
      evaporationRate: 0.002 * Math.pow(resolutionFactor, -0.5),  // Reduced for higher resolutions
      minVolume: 0.001 * Math.pow(resolutionFactor, -1),         // Reduced for higher resolutions
      initialVolume: 0.2 * resolutionFactor,                     // Increased for higher resolutions
      initialSpeed: 0.2 * Math.sqrt(resolutionFactor),           // Increased for higher resolutions
      maxDropletLifetime: Math.floor(120 * Math.sqrt(resolutionFactor)), // Increased for higher resolutions
      
      // Multi-scale parameters - Adjusted for resolution
      useMultiScale: true,
      scales: [1.0, 0.5, 0.25, 0.125, 0.0625].map(s => s * resolutionFactor),
      scaleWeights: [0.3, 0.25, 0.2, 0.15, 0.1],
      
      // Sediment size parameters - Scaled for resolution
      useSedimentSizes: true,
      sedimentSizes: {
        veryFine: { size: 0.02 * resolutionFactor, capacity: 1.0, angleOfRepose: 35 },
        fine: { size: 0.05 * resolutionFactor, capacity: 0.8, angleOfRepose: 32 },
        medium: { size: 0.1 * resolutionFactor, capacity: 0.6, angleOfRepose: 30 },
        coarse: { size: 0.2 * resolutionFactor, capacity: 0.4, angleOfRepose: 28 },
        veryCoarse: { size: 0.4 * resolutionFactor, capacity: 0.2, angleOfRepose: 25 }
      },
      
      // Flow accumulation parameters - Scaled for resolution
      useFlowAccumulation: true,
      flowAccumulationFactor: 0.05 * resolutionFactor,
      
      // Temperature and viscosity parameters
      useTemperature: true,
      temperature: 20,
      viscosityFactor: 0.01 * Math.pow(resolutionFactor, -0.5),
      
      // Micro-detail parameters - Scaled for resolution
      useMicroDetails: true,
      microDetailScale: 0.01 * resolutionFactor,
      microDetailStrength: 0.1 * resolutionFactor,

      // Talus formation parameters - Scaled for resolution
      useTalusFormation: true,
      talusAngleThreshold: 30,
      talusFormationRate: 0.15 * resolutionFactor,
      talusParticleSize: 0.1 * resolutionFactor,
      talusStabilityFactor: 0.8,
      talusErosionRate: 0.05 * resolutionFactor,
      talusDepositionRate: 0.1 * resolutionFactor,
      talusMaxHeight: 0.5 * resolutionFactor,
      talusMinSlope: 25,
      talusMaxSlope: 45
    };

    this.params = Object.assign(scaledParams, params);

    // Initialize maps
    if (this.params.useFlowAccumulation) {
      this.flowMap = new Float32Array(width * height);
    }
    if (this.params.useMultiScale) {
      this.microDetailMap = new Float32Array(width * height);
    }
    if (this.params.useMicroDetails) {
      this.microDetailNoise = new Float32Array(width * height);
      this._initializeMicroDetailNoise();
    }
    if (this.params.useTalusFormation) {
      this.talusMap = new Float32Array(width * height);
      this.slopeMap = new Float32Array(width * height);
      this._computeSlopeMap();
    }
  }

  /**
   * Initialize micro-detail noise pattern
   */
  _initializeMicroDetailNoise() {
    const { width, height } = this;
    const scale = this.params.microDetailScale;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x * scale;
        const ny = y * scale;
        // Use multiple octaves of noise for more natural micro-details
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        for (let i = 0; i < 4; i++) {
          value += this._noise2D(nx * frequency, ny * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        this.microDetailNoise[y * width + x] = value * this.params.microDetailStrength;
      }
    }
  }

  /**
   * Simple 2D noise function
   */
  _noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this._fade(x);
    const v = this._fade(y);
    const A = this._p[X] + Y;
    const B = this._p[X + 1] + Y;
    return this._lerp(v,
      this._lerp(u, this._grad(this._p[A], x, y), this._grad(this._p[B], x - 1, y)),
      this._lerp(u, this._grad(this._p[A + 1], x, y - 1), this._grad(this._p[B + 1], x - 1, y - 1))
    );
  }

  _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  _lerp(t, a, b) { return a + t * (b - a); }
  _grad(hash, x, y) {
    const h = hash & 15;
    const gradX = 1 + (h & 7);
    const gradY = 1 + (h >> 4);
    return ((h & 8) ? -gradX : gradX) * x + ((h & 8) ? -gradY : gradY) * y;
  }

  /**
   * Initialize persistent droplet state for progressive simulation.
   */
  resetDroplets(numDroplets) {
    this.droplets = [];
    for (let i = 0; i < numDroplets; i++) {
      this.droplets.push(this._createDroplet());
    }
    this.dropletsActive = true;
  }

  /**
   * Create a new droplet with random position and initial state.
   */
  _createDroplet() {
    return {
      x: Math.random() * (this.width - 2) + 1,
      y: Math.random() * (this.height - 2) + 1,
      dx: 0,
      dy: 0,
      speed: this.params.initialSpeed,
      water: this.params.initialVolume,
      sediment: 0,
      lifetime: 0,
      alive: true,
      // Add sediment size distribution with finer grains
      sedimentDistribution: this.params.useSedimentSizes ? 
        this._calculateInitialSedimentDistribution() : null
    };
  }

  /**
   * Calculate initial sediment size distribution for a droplet.
   */
  _calculateInitialSedimentDistribution() {
    return {
      veryFine: Math.random() * 0.3 + 0.4,  // Higher weight for very fine
      fine: Math.random() * 0.2 + 0.2,
      medium: Math.random() * 0.15 + 0.1,
      coarse: Math.random() * 0.1 + 0.05,
      veryCoarse: Math.random() * 0.05 + 0.02
    };
  }

  /**
   * Calculate viscosity based on temperature and water content.
   */
  _calculateViscosity(temperature, water) {
    if (!this.params.useTemperature) return 1.0;
    const baseViscosity = 1.0 / (1.0 + temperature * this.params.viscosityFactor);
    return baseViscosity * (1.0 - water * 0.1);
  }

  /**
   * Compute slope map for talus detection
   */
  _computeSlopeMap() {
    const { width, height, heightMap } = this;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const h = heightMap[idx];
        
        // Compute gradients in x and y directions
        const dx = (heightMap[idx + 1] - heightMap[idx - 1]) / 2;
        const dy = (heightMap[(y + 1) * width + x] - heightMap[(y - 1) * width + x]) / 2;
        
        // Compute slope angle in degrees
        const slope = Math.atan(Math.sqrt(dx * dx + dy * dy)) * (180 / Math.PI);
        this.slopeMap[idx] = slope;
      }
    }
  }

  /**
   * Update talus formation based on slope and erosion
   */
  _updateTalusFormation(x, y, erosion, deposition) {
    if (!this.params.useTalusFormation) return;
    
    const idx = Math.floor(y) * this.width + Math.floor(x);
    const slope = this.slopeMap[idx];
    
    // Check if slope is within talus formation range
    if (slope >= this.params.talusMinSlope && slope <= this.params.talusMaxSlope) {
      const talusFactor = (slope - this.params.talusMinSlope) / 
                         (this.params.talusMaxSlope - this.params.talusMinSlope);
      
      // Calculate talus formation based on erosion and deposition
      const talusChange = (erosion * this.params.talusErosionRate - 
                          deposition * this.params.talusDepositionRate) * 
                          talusFactor * this.params.talusFormationRate;
      
      // Update talus map with stability factor
      this.talusMap[idx] = Math.max(0, Math.min(
        this.talusMap[idx] + talusChange,
        this.params.talusMaxHeight
      ));
      
      // Apply talus to heightmap
      this.heightMap[idx] += this.talusMap[idx] * this.params.talusStabilityFactor;
    }
  }

  /**
   * Step all droplets for a batch with enhanced features.
   */
  stepDroplets(batchSize, onStep = null) {
    const { width, height, heightMap, params } = this;
    let activeCount = 0;
    let totalErosion = 0;
    let totalDeposition = 0;

    // Calculate resolution-independent scaling factor with boost for high resolutions
    const resolutionScale = Math.sqrt((width * height) / (500 * 500));
    // Significantly increase erosion effect at higher resolutions
    const erosionScale = Math.pow(1.0 / resolutionScale, 0.5) * Math.min(resolutionScale, 3.0);
    
    // Increase number of droplets for higher resolutions
    const dropletMultiplier = Math.min(resolutionScale, 2.0);

    for (let i = 0; i < this.droplets.length && activeCount < batchSize; i++) {
      const d = this.droplets[i];
      if (!d.alive) continue;
      activeCount++;

      for (let step = 0; step < dropletMultiplier; step++) {
        // Bilinear height and gradient
        const cellX = Math.floor(d.x);
        const cellY = Math.floor(d.y);
        const offX = d.x - cellX;
        const offY = d.y - cellY;
        
        // Height at droplet position
        const h = this._bilinearInterp(heightMap, d.x, d.y);
        
        // Gradient (central differences via bilinear)
        const grad = this._calcGradient(heightMap, d.x, d.y);
        
        // Calculate viscosity if enabled
        const viscosity = this._calculateViscosity(params.temperature, d.water);
        
        // Update velocity with viscosity and increased effect at high resolutions
        d.dx = d.dx * params.inertia * viscosity - grad.gx * (1 - params.inertia) * erosionScale;
        d.dy = d.dy * params.inertia * viscosity - grad.gy * (1 - params.inertia) * erosionScale;
        
        // Normalize velocity
        const len = Math.sqrt(d.dx * d.dx + d.dy * d.dy);
        if (len !== 0) {
          d.dx /= len;
          d.dy /= len;
        }
        
        // Move droplet with increased step size at high resolutions
        d.x += d.dx * erosionScale;
        d.y += d.dy * erosionScale;
        
        // Clamp to bounds
        if (d.x < 1 || d.x > width - 2 || d.y < 1 || d.y > height - 2) {
          d.alive = false;
          continue;
        }
        
        // New height and delta
        const newH = this._bilinearInterp(heightMap, d.x, d.y);
        const deltaH = newH - h;
        
        // Update speed with increased effect at high resolutions
        d.speed = Math.sqrt(Math.max(0, d.speed * d.speed + deltaH * -9.81 * erosionScale));
        d.speed *= (1 - params.friction);
        
        // Calculate base capacity with enhanced resolution scaling
        let capacity = 0;
        if (params.useMultiScale) {
          for (let i = 0; i < params.scales.length; i++) {
            const scale = params.scales[i];
            const weight = params.scaleWeights[i];
            const scaledCapacity = Math.max(-deltaH * scale, 0.001) * 
                                 d.speed * d.water * 
                                 params.sedimentCapacityFactor * 
                                 Math.pow(erosionScale, 1.5); // Increased effect
            capacity += scaledCapacity * weight;
          }
        } else {
          capacity = Math.max(-deltaH, 0.001) * d.speed * d.water * 
                    params.sedimentCapacityFactor * 
                    Math.pow(erosionScale, 1.5); // Increased effect
        }
        
        // Apply sediment size distribution with enhanced scaling
        if (params.useSedimentSizes && d.sedimentDistribution) {
          let sizeAdjustedCapacity = 0;
          for (const [type, { capacity: sizeCapacity }] of Object.entries(params.sedimentSizes)) {
            sizeAdjustedCapacity += capacity * sizeCapacity * d.sedimentDistribution[type];
          }
          capacity = sizeAdjustedCapacity;
        }
        
        // Apply flow accumulation with enhanced effect
        if (params.useFlowAccumulation) {
          const idx = Math.floor(d.y) * width + Math.floor(d.x);
          this.flowMap[idx] += d.water * d.speed * params.flowAccumulationFactor * erosionScale;
          const flowFactor = this.flowMap[idx] / 200;
          capacity *= (1 + flowFactor * erosionScale);
        }
        
        // Enhanced erosion and deposition with increased effect
        if (d.sediment > capacity) {
          const deposit = (d.sediment - capacity) * params.depositionRate * 
                         Math.pow(erosionScale, 1.5); // Increased effect
          this._bilinearAdd(heightMap, cellX, cellY, offX, offY, deposit);
          totalDeposition += deposit;
          
          // Update talus formation for deposition
          this._updateTalusFormation(d.x, d.y, 0, deposit);
          
          // Add micro-details to deposition
          if (params.useMicroDetails) {
            const microDeposit = deposit * 0.1 * erosionScale;
            this._bilinearAdd(this.microDetailMap, cellX, cellY, offX, offY, 
              microDeposit * (1 + this.microDetailNoise[Math.floor(d.y) * width + Math.floor(d.x)]));
          }
          
          d.sediment -= deposit;
        } else {
          const erode = Math.min((capacity - d.sediment) * params.depositionRate * 
                                Math.pow(erosionScale, 1.5), newH); // Increased effect
          if (erode > 0) {
            this._bilinearAdd(heightMap, cellX, cellY, offX, offY, -erode);
            totalErosion += erode;
            
            // Update talus formation for erosion
            this._updateTalusFormation(d.x, d.y, erode, 0);
            
            // Add micro-details to erosion
            if (params.useMicroDetails) {
              const microErode = erode * 0.1 * erosionScale;
              this._bilinearAdd(this.microDetailMap, cellX, cellY, offX, offY, 
                -microErode * (1 + this.microDetailNoise[Math.floor(d.y) * width + Math.floor(d.x)]));
            }
            
            d.sediment += erode;
          }
        }
        
        // Evaporate with adjusted rate for high resolutions
        d.water *= (1 - params.evaporationRate * Math.pow(erosionScale, -0.5));
        d.lifetime++;
        
        // Kill droplet if conditions met
        if (d.water < params.minVolume || 
            d.lifetime > params.maxDropletLifetime || 
            d.speed < 0.01) {
          d.alive = false;
        }
      }
    }

    // Update slope map periodically
    if (this.params.useTalusFormation && Math.random() < 0.1) {
      this._computeSlopeMap();
    }

    // Debug logging
    if (totalErosion > 0 || totalDeposition > 0) {
      console.log(`Erosion: ${totalErosion.toFixed(6)}, Deposition: ${totalDeposition.toFixed(6)}`);
    }

    // Create a new Float32Array with the updated heightMap
    const updatedHeightMap = new Float32Array(heightMap);
    if (onStep) onStep(updatedHeightMap);
    return this.droplets.some(d => d.alive);
  }

  /**
   * Bilinear interpolation of height at (x, y).
   */
  _bilinearInterp(heightMap, x, y) {
    const width = this.width;
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const offX = x - cellX;
    const offY = y - cellY;
    const toIndex = (x, y) => y * width + x;
    if (cellX < 0 || cellY < 0 || cellX >= width - 1 || cellY >= this.height - 1) return 0;
    const h00 = heightMap[toIndex(cellX, cellY)];
    const h10 = heightMap[toIndex(cellX + 1, cellY)];
    const h01 = heightMap[toIndex(cellX, cellY + 1)];
    const h11 = heightMap[toIndex(cellX + 1, cellY + 1)];
    return h00 * (1 - offX) * (1 - offY) + h10 * offX * (1 - offY) + h01 * (1 - offX) * offY + h11 * offX * offY;
  }

  /**
   * Calculate gradient (gx, gy) at (x, y) using bilinear interpolation.
   */
  _calcGradient(heightMap, x, y) {
    const width = this.width;
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const offX = x - cellX;
    const offY = y - cellY;
    const toIndex = (x, y) => y * width + x;
    if (cellX < 1 || cellY < 1 || cellX >= width - 2 || cellY >= this.height - 2) return { gx: 0, gy: 0 };
    // Central differences
    const hL = this._bilinearInterp(heightMap, x - 1, y);
    const hR = this._bilinearInterp(heightMap, x + 1, y);
    const hD = this._bilinearInterp(heightMap, x, y - 1);
    const hU = this._bilinearInterp(heightMap, x, y + 1);
    return { gx: (hR - hL) * 0.5, gy: (hU - hD) * 0.5 };
  }

  /**
   * Start a new erosion simulation (reset droplets and optionally heightmap).
   * @param {number} numDroplets
   * @param {boolean} resetHeightmap
   */
  start(numDroplets, resetHeightmap = false, initialHeightMap = null) {
    if (resetHeightmap && initialHeightMap) {
      this.heightMap = new Float32Array(initialHeightMap);
    }
    this.resetDroplets(numDroplets);
  }

  /**
   * Pause the simulation (droplets and heightmap are preserved).
   */
  pause() {
    this.dropletsActive = false;
  }

  /**
   * Resume the simulation (droplets and heightmap are preserved).
   */
  resume() {
    this.dropletsActive = true;
  }

  /**
   * Bilinearly add value (positive or negative) to the 4 corners of a cell.
   * @private
   */
  _bilinearAdd(heightMap, x, y, offX, offY, value) {
    const w00 = (1 - offX) * (1 - offY);
    const w10 = offX * (1 - offY);
    const w01 = (1 - offX) * offY;
    const w11 = offX * offY;
    const width = this.width;
    const toIndex = (x, y) => y * width + x;
    if (x >= 0 && y >= 0 && x < width-1 && y < this.height-1) {
      heightMap[toIndex(x, y)] += value * w00;
      heightMap[toIndex(x+1, y)] += value * w10;
      heightMap[toIndex(x, y+1)] += value * w01;
      heightMap[toIndex(x+1, y+1)] += value * w11;
      // Clamp to zero
      heightMap[toIndex(x, y)] = Math.max(0, heightMap[toIndex(x, y)]);
      heightMap[toIndex(x+1, y)] = Math.max(0, heightMap[toIndex(x+1, y)]);
      heightMap[toIndex(x, y+1)] = Math.max(0, heightMap[toIndex(x, y+1)]);
      heightMap[toIndex(x+1, y+1)] = Math.max(0, heightMap[toIndex(x+1, y+1)]);
    }
  }

  /**
   * Returns the minimum height among the 4 bilinear corners (for erosion clamp).
   * @private
   */
  _bilinearMin(heightMap, x, y, offX, offY) {
    const width = this.width;
    const toIndex = (x, y) => y * width + x;
    if (x >= 0 && y >= 0 && x < width-1 && y < this.height-1) {
      return Math.min(
        heightMap[toIndex(x, y)],
        heightMap[toIndex(x+1, y)],
        heightMap[toIndex(x, y+1)],
        heightMap[toIndex(x+1, y+1)]
      );
    }
    return 0;
  }

  /**
   * Returns a clone of the current heightmap with micro-details if enabled.
   */
  cloneHeightMap() {
    const result = new Float32Array(this.heightMap);
    if (this.params.useMultiScale && this.microDetailMap) {
      for (let i = 0; i < result.length; i++) {
        result[i] += this.microDetailMap[i] * 0.1;
      }
    }
    if (this.params.useMicroDetails && this.microDetailNoise) {
      for (let i = 0; i < result.length; i++) {
        result[i] += this.microDetailNoise[i];
      }
    }
    return result;
  }

  /**
   * Resets the heightmap to the provided data.
   * @param {Float32Array} newHeightMap
   */
  resetHeightMap(newHeightMap) {
    this.heightMap = new Float32Array(newHeightMap);
  }

  /**
   * Optionally, set a deterministic random seed for reproducibility.
   */
  static setSeed(seed) {
    // Simple LCG for reproducibility (optional, not used by default)
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    Math.random = function() {
      return (s = s * 16807 % 2147483647) / 2147483647;
    };
  }

  reset(heightMap) {
    this.heightMap = new Float32Array(heightMap);
    this.droplets = Array(this.droplets.length).fill().map(() => this._createDroplet());
    if (this.params.useFlowAccumulation) {
      this.flowMap = new Float32Array(this.width * this.height);
    }
    if (this.params.useMultiScale) {
      this.microDetailMap = new Float32Array(this.width * this.height);
    }
    if (this.params.useMicroDetails) {
      this.microDetailNoise = new Float32Array(this.width * this.height);
      this._initializeMicroDetailNoise();
    }
    if (this.params.useTalusFormation) {
      this.talusMap = new Float32Array(this.width * this.height);
      this.slopeMap = new Float32Array(this.width * this.height);
      this._computeSlopeMap();
    }
  }
} 