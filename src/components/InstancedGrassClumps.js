import React, { useRef } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * InstancedBillboardGrass: Efficiently renders many billboard grass clumps using instancing.
 * @param {object} props
 * @param {Array} props.points - Array of {x, y} grid points
 * @param {function} props.getZ - Function (x, y) => z (world-space height)
 * @param {number} props.width - Grid width
 * @param {number} props.height - Grid height
 * @param {object} props.layer - Scatter layer params (for scale, jitter, seed)
 * @param {object} props.params - Terrain params (for width/height)
 * @param {string} props.textureUrl - URL to the grass PNG texture
 */
export default function InstancedGrassClumps({ points, getZ, width, height, layer, params, textureUrl = '/grass.png' }) {
  const meshRef = useRef();
  const tempObj = useRef(new THREE.Object3D());
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const { camera } = useThree();

  useFrame(() => {
    if (!meshRef.current) return;
    points.forEach((pt, i) => {
      // Jitter and scale logic (same as before)
      const rand = ((i * 9301 + layer.seed * 49297) % 233280) / 233280;
      const rand2 = ((i * 12345 + layer.seed * 67891) % 233280) / 233280;
      const rand3 = ((i * 54321 + layer.seed * 13579) % 233280) / 233280;
      const jitterX = (rand - 0.5) * (1 / (width - 1)) * params.width * layer.jitter;
      const jitterY = (rand2 - 0.5) * (1 / (height - 1)) * params.height * layer.jitter;
      const x = (pt.x / (width - 1) - 0.5) * params.width + jitterX;
      const y = (pt.y / (height - 1) - 0.5) * params.height + jitterY;
      const z = getZ(pt.x, pt.y);
      // Randomize scale, Y rotation, and horizontal flip
      const scale = layer.scale * (0.8 + rand * 0.6);
      const flip = rand2 < 0.5 ? 1 : -1; // 50% chance to flip horizontally
      // Billboard: look at camera, offset up by half height
      tempObj.current.position.set(x, z + 0.5 * scale, y);
      tempObj.current.scale.set(scale * flip, scale, scale); // flip X for mirroring
      // --- Y-axis billboarding ---
      // Calculate angle to camera in XZ plane
      const dx = camera.position.x - tempObj.current.position.x;
      const dz = camera.position.z - tempObj.current.position.z;
      const angle = Math.atan2(dx, dz); // Y-axis rotation
      tempObj.current.rotation.set(0, angle, 0);
      // --- End Y-axis billboarding ---
      tempObj.current.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.current.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]} castShadow>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        alphaTest={0.5}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
} 