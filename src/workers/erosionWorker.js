import ErosionSimulator from '../services/ErosionSimulator';
import { computeSlopeMap, computeCurvatureMap, computeFlowMap } from '../services/HeightfieldService';

let simulator = null;

self.onmessage = async function(e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'init':
      try {
        const { width, height, heightMap, params, numDroplets } = payload;
        simulator = new ErosionSimulator(width, height, heightMap, params);
        simulator.droplets = Array(numDroplets).fill().map(() => simulator._createDroplet());
        self.postMessage({ type: 'init', success: true });
      } catch (error) {
        self.postMessage({ type: 'init', success: false, error: error.message });
      }
      break;

    case 'step':
      if (!simulator) {
        self.postMessage({ type: 'error', message: 'Simulator not initialized' });
        return;
      }
      try {
        const { batchSize } = payload;
        const heightMap = new Float32Array(simulator.heightMap);
        const alive = simulator.stepDroplets(batchSize, (updatedHeightMap) => {
          self.postMessage({ 
            type: 'progress', 
            heightMap: updatedHeightMap 
          }, [updatedHeightMap.buffer]);
        });
        self.postMessage({ 
          type: 'step', 
          alive,
          heightMap 
        }, [heightMap.buffer]);
      } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
      }
      break;

    case 'pause':
      if (!simulator) {
        self.postMessage({ type: 'error', message: 'Simulator not initialized' });
        return;
      }
      simulator.pause();
      self.postMessage({ type: 'pause' });
      break;

    case 'resume':
      if (!simulator) {
        self.postMessage({ type: 'error', message: 'Simulator not initialized' });
        return;
      }
      simulator.resume();
      self.postMessage({ type: 'resume' });
      break;

    case 'reset':
      if (!simulator) {
        self.postMessage({ type: 'error', message: 'Simulator not initialized' });
        return;
      }
      try {
        const { heightMap } = payload;
        simulator.reset(heightMap);
        self.postMessage({ type: 'reset' });
      } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
      }
      break;
  }
}; 