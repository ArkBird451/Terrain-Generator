import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';

export default function Water({ object }) {
  const { scene } = useThree();

  useEffect(() => {
    if (object) {
      scene.add(object);
      return () => scene.remove(object);
    }
  }, [object, scene]);

  useFrame((_, delta) => {
    if (object && typeof object.update === 'function') {
      object.update(delta);
    }
  });

  return null;
}

Water.propTypes = {
  object: PropTypes.object
}; 