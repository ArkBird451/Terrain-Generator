export default class ErosionWorkerService {
  constructor() {
    this.worker = new Worker(new URL('../workers/erosionWorker.js', import.meta.url));
    this.worker.onerror = (error) => {
      console.error('Erosion worker error:', error);
    };
    this.worker.onmessageerror = (error) => {
      console.error('Erosion worker message error:', error);
    };
  }

  init(width, height, heightMap, params, numDroplets) {
    console.log('ErosionWorkerService: Initializing worker...');
    return new Promise((resolve, reject) => {
      const messageHandler = (e) => {
        const { type, success, error } = e.data;
        if (type === 'init') {
          this.worker.removeEventListener('message', messageHandler);
          if (success) {
            console.log('ErosionWorkerService: Worker initialized successfully');
            resolve();
          } else {
            console.error('ErosionWorkerService: Worker initialization failed:', error);
            reject(new Error(error));
          }
        }
      };
      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({
        type: 'init',
        payload: { width, height, heightMap, params, numDroplets }
      }, [heightMap.buffer]);
    });
  }

  step(batchSize) {
    console.log('ErosionWorkerService: Stepping simulation...');
    return new Promise((resolve, reject) => {
      const messageHandler = (e) => {
        const { type, alive, heightMap, error } = e.data;
        if (type === 'step') {
          this.worker.removeEventListener('message', messageHandler);
          if (error) {
            console.error('ErosionWorkerService: Step failed:', error);
            reject(new Error(error));
          } else {
            console.log('ErosionWorkerService: Step completed');
            resolve({ alive, heightMap });
          }
        }
      };
      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({
        type: 'step',
        payload: { batchSize }
      });
    });
  }

  pause() {
    console.log('ErosionWorkerService: Pausing simulation...');
    return new Promise((resolve) => {
      const messageHandler = (e) => {
        const { type } = e.data;
        if (type === 'pause') {
          this.worker.removeEventListener('message', messageHandler);
          console.log('ErosionWorkerService: Simulation paused');
          resolve();
        }
      };
      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({ type: 'pause' });
    });
  }

  resume() {
    console.log('ErosionWorkerService: Resuming simulation...');
    return new Promise((resolve) => {
      const messageHandler = (e) => {
        const { type } = e.data;
        if (type === 'resume') {
          this.worker.removeEventListener('message', messageHandler);
          console.log('ErosionWorkerService: Simulation resumed');
          resolve();
        }
      };
      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({ type: 'resume' });
    });
  }

  reset(heightMap) {
    console.log('ErosionWorkerService: Resetting simulation...');
    return new Promise((resolve, reject) => {
      const messageHandler = (e) => {
        const { type, error } = e.data;
        if (type === 'reset') {
          this.worker.removeEventListener('message', messageHandler);
          if (error) {
            console.error('ErosionWorkerService: Reset failed:', error);
            reject(new Error(error));
          } else {
            console.log('ErosionWorkerService: Simulation reset');
            resolve();
          }
        }
      };
      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({
        type: 'reset',
        payload: { heightMap }
      }, [heightMap.buffer]);
    });
  }
} 