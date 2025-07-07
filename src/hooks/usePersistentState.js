import { useState, useEffect } from 'react';
import * as THREE from 'three';

const ensureDefaults = (value, defaultValue) => {
  const result = { ...defaultValue, ...value };
  
  // Ensure required numeric parameters have valid values
  result.size = result.size || 10;
  result.meshResolution = result.meshResolution || 128;
  result.amplitude = result.amplitude || 1.0;
  result.octaves = result.octaves || 6;
  result.lacunarity = result.lacunarity || 2.0;
  result.gain = result.gain || 0.5;
  result.seed = result.seed || Math.random() * 1000;
  
  // Ensure Worley noise parameters
  result.worleyPoints = result.worleyPoints || 256;
  result.worleySeed = result.worleySeed || Math.random() * 1000;
  result.worleyWeight = result.worleyWeight || 0.5;
  result.worleyDimension = result.worleyDimension || 2;
  
  // Ensure color values
  result.desertColor = result.desertColor || new THREE.Color(0.76, 0.7, 0.5);
  result.grassColor = result.grassColor || new THREE.Color(0.2, 0.5, 0.1);
  result.rockColor = result.rockColor || new THREE.Color(0.5, 0.5, 0.5);
  result.snowColor = result.snowColor || new THREE.Color(0.9, 0.9, 0.95);
  
  // Convert string color values to THREE.Color objects
  if (typeof result.desertColor === 'string') result.desertColor = new THREE.Color(result.desertColor);
  if (typeof result.grassColor === 'string') result.grassColor = new THREE.Color(result.grassColor);
  if (typeof result.rockColor === 'string') result.rockColor = new THREE.Color(result.rockColor);
  if (typeof result.snowColor === 'string') result.snowColor = new THREE.Color(result.snowColor);
  
  // Ensure scatter layers exist
  if (!Array.isArray(result.scatterLayers)) {
    result.scatterLayers = defaultValue.scatterLayers || [];
  }
  
  return result;
};

const usePersistentState = (key, defaultValue) => {
  // Get initial value from localStorage or use defaultValue
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      try {
        const parsedValue = JSON.parse(storedValue);
        return ensureDefaults(parsedValue, defaultValue);
      } catch (error) {
        console.error('Error parsing stored value:', error);
        return ensureDefaults({}, defaultValue);
      }
    }
    return ensureDefaults({}, defaultValue);
  });

  // Update localStorage when state changes
  useEffect(() => {
    const valueToStore = { ...state };
    // Convert THREE.Color objects to hex strings for storage
    if (valueToStore.desertColor) valueToStore.desertColor = valueToStore.desertColor.getHexString();
    if (valueToStore.grassColor) valueToStore.grassColor = valueToStore.grassColor.getHexString();
    if (valueToStore.rockColor) valueToStore.rockColor = valueToStore.rockColor.getHexString();
    if (valueToStore.snowColor) valueToStore.snowColor = valueToStore.snowColor.getHexString();
    localStorage.setItem(key, JSON.stringify(valueToStore));
  }, [key, state]);

  return [state, setState];
};

export default usePersistentState; 