export default class TerrainWorkerService {
  constructor() {
    this.worker = new Worker(new URL('../workers/terrainWorker.js', import.meta.url));
    this.handlers = {};
    this.worker.onmessage = e => {
      const { type, progress, geometryData, scatterData, water } = e.data;
      if (type === 'progress' && this.handlers.progress) {
        this.handlers.progress(progress);
      }
      if (type === 'done' && this.handlers.done) {
        this.handlers.done({ geometryData, scatterData, water });
      }
    };
  }

  generate(params, onProgress, heightMap) {
    return new Promise(resolve => {
      this.handlers.progress = onProgress;
      this.handlers.done = data => {
        this.handlers.progress = null;
        this.handlers.done = null;
        resolve(data);
      };
      const payload = { params };
      const transfers = [];
      if (heightMap instanceof Float32Array) {
        const heightMapCopy = new Float32Array(heightMap);
        payload.heightMap = heightMapCopy;
        transfers.push(heightMapCopy.buffer);
      }
      this.worker.postMessage({ action: 'generate', payload }, transfers);
    });
  }

  terminate() {
    this.worker.terminate();
  }
} 