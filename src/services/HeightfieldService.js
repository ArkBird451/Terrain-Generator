export function computeSlopeMap(heightMap, width, height, worldWidth, worldHeight) {
  const slopeMap = new Float32Array(width * height);
  const dx = worldWidth / (width - 1);
  const dy = worldHeight / (height - 1);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const hE = heightMap[idx + 1];
      const hW = heightMap[idx - 1];
      const hN = heightMap[idx - width];
      const hS = heightMap[idx + width];
      const dzdx = (hE - hW) / (2 * dx);
      const dzdy = (hN - hS) / (2 * dy);
      slopeMap[idx] = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
    }
  }
  // Edge cells: copy nearest interior value
  for (let x = 0; x < width; x++) {
    slopeMap[x] = slopeMap[width + x];
    slopeMap[(height - 1) * width + x] = slopeMap[(height - 2) * width + x];
  }
  for (let y = 0; y < height; y++) {
    slopeMap[y * width] = slopeMap[y * width + 1];
    slopeMap[y * width + (width - 1)] = slopeMap[y * width + (width - 2)];
  }
  return slopeMap;
}

export function computeCurvatureMap(heightMap, width, height, worldWidth, worldHeight) {
  const curvatureMap = new Float32Array(width * height);
  const dx = worldWidth / (width - 1);
  const dd = dx;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const zc = heightMap[idx];
      const zx1 = heightMap[idx + 1];
      const zx0 = heightMap[idx - 1];
      const zy1 = heightMap[idx + width];
      const zy0 = heightMap[idx - width];
      curvatureMap[idx] = (zx1 + zx0 + zy1 + zy0 - 4 * zc) / (dd * dd);
    }
  }
  // Edge cells: copy nearest interior value
  for (let x = 0; x < width; x++) {
    curvatureMap[x] = curvatureMap[width + x];
    curvatureMap[(height - 1) * width + x] = curvatureMap[(height - 2) * width + x];
  }
  for (let y = 0; y < height; y++) {
    curvatureMap[y * width] = curvatureMap[y * width + 1];
    curvatureMap[y * width + (width - 1)] = curvatureMap[y * width + (width - 2)];
  }
  return curvatureMap;
}

export function computeFlowMap(heightMap, width, height) {
  const flowMap = new Float32Array(width * height).fill(1);
  const downslope = new Int32Array(width * height);
  // Determine downslope neighbor for each cell
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let minZ = heightMap[idx];
      let minIdx = idx;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (heightMap[nIdx] < minZ) { minZ = heightMap[nIdx]; minIdx = nIdx; }
        }
      }
      downslope[idx] = minIdx;
    }
  }
  // Topological sort by height
  const indices = Array.from({ length: width * height }, (_, i) => i);
  indices.sort((a, b) => heightMap[a] - heightMap[b]);
  for (const idx of indices) {
    const ds = downslope[idx];
    if (ds !== idx) flowMap[ds] += flowMap[idx];
  }
  return flowMap;
} 