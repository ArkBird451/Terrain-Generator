import { createImprovedNoise2D, generateTerrain } from '../services/TerrainGeneratorService';
import { createTexturedTerrainMaterial, createWaterPlane } from '../services/TerrainMaterialService';
import { generateScatterMask, generatePoissonScatterPoints } from '../services/ScatterService';
import * as THREE from 'three';

self.onmessage = async (e) => {
  const { action, payload } = e.data;
  if (action === 'generate') {
    const { params, heightMap } = payload;
    let res;
    if (heightMap instanceof Float32Array) {
      // derive resolution from heightMap length
      const size = Math.round(Math.sqrt(heightMap.length));
      res = size - 1;
    } else {
      res = params.useExportResolution ? params.meshResolution : 512;
    }
    let geometry;
    if (heightMap instanceof Float32Array) {
      // Build plane and displace using proper world dimensions
      const w = params.width || params.size;
      const h = params.height || params.size;
      geometry = new THREE.PlaneGeometry(w, h, res, res);
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < heightMap.length; i++) {
        pos[i * 3 + 2] = heightMap[i];
      }
      geometry.computeVertexNormals();
      // Partial progress
      self.postMessage({ type: 'progress', progress: 0.4 });
    } else {
      const noise2D = createImprovedNoise2D(params.seed);
      const terrainParams = { ...params, frequency: 0.15, meshResolution: res };
      const result = generateTerrain(terrainParams, noise2D);
      geometry = result.geometry;
      geometry.computeVertexNormals();
      self.postMessage({ type: 'progress', progress: 0.4 });
    }
    // Extract raw geometry data
    const posAttr = geometry.attributes.position.array;
    const normAttr = geometry.attributes.normal.array;
    const uvAttr = geometry.attributes.uv ? geometry.attributes.uv.array : new Float32Array(0);
    const idxAttr = geometry.index ? geometry.index.array : new Uint32Array(0);
    // Scatter generation
    const width = res + 1;
    const height = res + 1;
    const rawZ = new Float32Array(width * height);
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < width * height; i++) {
      const z = posAttr[i * 3 + 2]; rawZ[i] = z;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const normMap = new Float32Array(width * height);
    for (let i = 0; i < rawZ.length; i++) {
      normMap[i] = (rawZ[i] - minZ) / (maxZ - minZ || 1);
    }
    const scatterLayers = Array.isArray(params.scatterLayers) ? params.scatterLayers : [];
    const scatterData = [];
    for (let i = 0; i < scatterLayers.length; i++) {
      const layer = scatterLayers[i];
      if (!layer.enabled) continue;
      const mask = generateScatterMask(normMap, width, height, { maskThreshold: layer.maskThreshold, scatterOn: layer.scatterOn });
      let pts = generatePoissonScatterPoints(mask, width, height, {
        density: layer.density,
        seed: layer.seed,
        pointRadius: layer.pointRadius,
        maxSlopeDeg: layer.maxSlopeDeg,
        heightmap: normMap,
        terrainWidth: params.size,
        terrainHeight: params.size
      });
      // Apply negative affinity filtering if requested
      if (layer.negativeAffinityType && layer.negativeAffinityRadius > 0) {
        const affinityRadius = layer.negativeAffinityRadius * (layer.pointRadius || 1);
        // Gather grid points of previous layers with the specified objectType
        const otherPts = scatterData
          .filter(d => d.layer.objectType === layer.negativeAffinityType)
          .flatMap(d => d.points);
        if (otherPts.length > 0) {
          pts = pts.filter(pt =>
            otherPts.every(op =>
              ((pt.x - op.x) * (pt.x - op.x) + (pt.y - op.y) * (pt.y - op.y)) > affinityRadius * affinityRadius
            )
          );
        }
      }
      // Push grid points; world-coordinate conversion is handled in the main thread
      scatterData.push({ layer, points: pts });
      self.postMessage({ type: 'progress', progress: 0.4 + 0.6 * ((i + 1) / scatterLayers.filter(l => l.enabled).length) });
    }
    // Send result (water plane will be recreated on main thread), transferring large buffers
    self.postMessage(
      {
        type: 'done',
        geometryData: {
          positions: posAttr,
          normals: normAttr,
          uvs: uvAttr,
          indices: idxAttr
        },
        scatterData
      },
      [posAttr.buffer, normAttr.buffer, uvAttr.buffer, idxAttr.buffer]
    );
  }
}; 