import React, { useRef } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * BillboardTree: A flat plane with a transparent tree texture that always faces the camera.
 * @param {object} props
 * @param {Array} props.position - [x, y, z] position
 * @param {Array} props.scale - [x, y, z] scale (optional)
 * @param {string} props.textureUrl - URL to the tree PNG texture
 */
const BillboardTree = ({ position = [0, 0, 0], scale = [1, 1, 1], textureUrl = '/tree.png' }) => {
  const meshRef = useRef();
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const { camera } = useThree();

  useFrame(() => {
    if (meshRef.current) {
      // Make the plane face the camera
      meshRef.current.lookAt(camera.position);
    }
  });

  // Offset the billboard upward by half its height so the bottom sits on the ground
  const adjustedPosition = [position[0], position[1] + 0.5 * scale[1], position[2]];

  return (
    <mesh ref={meshRef} position={adjustedPosition} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        alphaTest={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * InstancedBillboardTrees: Efficiently renders many billboard trees using instancing.
 * @param {object} props
 * @param {Array} props.points - Array of {x, y} grid points
 * @param {function} props.getZ - Function (x, y) => z (world-space height)
 * @param {number} props.width - Grid width
 * @param {number} props.height - Grid height
 * @param {object} props.layer - Scatter layer params (for scale, jitter, seed)
 * @param {object} props.params - Terrain params (for width/height)
 * @param {string} props.textureUrl - URL to the tree PNG texture
 */
export const InstancedBillboardTrees = ({ points, getZ, width, height, layer = {}, params, textureUrl = '/tree.png' }) => {
  const meshRef = useRef();
  const tempObj = useRef(new THREE.Object3D());
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const { camera } = useThree();

  useFrame(() => {
    if (!meshRef.current) return;
    const safeSeed = typeof layer.seed === 'number' ? layer.seed : 42;
    const safeScale = typeof layer.scale === 'number' ? layer.scale : 1;
    const safeJitter = typeof layer.jitter === 'number' ? layer.jitter : 0;
    const worldSize = params.size || 10;
    points.forEach((pt, i) => {
      // Use safeSeed instead of layer.seed
      const rand = ((i * 9301 + safeSeed * 49297) % 233280) / 233280;
      const rand2 = ((i * 12345 + safeSeed * 67891) % 233280) / 233280;
      const rand3 = ((i * 54321 + safeSeed * 13579) % 233280) / 233280;
      const jitterX = (rand - 0.5) * (1 / (width - 1)) * worldSize * safeJitter;
      const jitterY = (rand2 - 0.5) * (1 / (height - 1)) * worldSize * safeJitter;
      const x = (pt.x / (width - 1) - 0.5) * worldSize + jitterX;
      const y = (pt.y / (height - 1) - 0.5) * worldSize + jitterY;
      const z = getZ(pt.x, pt.y);
      // Randomize scale, Y rotation, and horizontal flip
      const scale = safeScale * (0.8 + rand * 0.6);
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
};

export default BillboardTree; 
 