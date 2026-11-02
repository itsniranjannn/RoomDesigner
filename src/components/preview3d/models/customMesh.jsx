import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FallbackBoxModel } from './fallback.jsx';

/** Mesh built from photos: positions/colors are stored normalized (x,z in [-0.5,0.5], y in [0,1]). */
function PhotoMesh({ mesh, widthM, depthM, heightM }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mesh.positions), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(mesh.colors), 3, true));
    g.computeVertexNormals();
    return g;
  }, [mesh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} scale={[widthM, heightM, depthM]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.85} />
    </mesh>
  );
}

/** Photo-scanned custom item; a plain box until a mesh has been generated. */
export function CustomMeshModel({ def, widthM, depthM, heightM, mainColor }) {
  if (!def.mesh) {
    return <FallbackBoxModel widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} />;
  }
  return <PhotoMesh mesh={def.mesh} widthM={widthM} depthM={depthM} heightM={heightM} />;
}
