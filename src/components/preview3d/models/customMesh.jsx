import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getFurnitureType } from '../../../data/furnitureCatalog.js';
import { upgradeLegacyMesh } from '../../../engine/hull.js';
import { FallbackBoxModel } from './fallback.jsx';

/**
 * Geometry for a photo-made mesh: positions in [-0.5, 0.5] x [0, 1] x [-0.5, 0.5], vertex colours stored as
 * sRGB bytes (converted to linear for lighting), smooth normals for indexed meshes.
 */
export function buildPhotoGeometry(mesh) {
  const g = new THREE.BufferGeometry();
  const positions = mesh.positions instanceof Float32Array ? mesh.positions : Float32Array.from(mesh.positions);
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const colors = new Float32Array(mesh.colors.length);
  const c = new THREE.Color();
  for (let i = 0; i < colors.length; i += 3) {
    c.setRGB(mesh.colors[i] / 255, mesh.colors[i + 1] / 255, mesh.colors[i + 2] / 255, THREE.SRGBColorSpace);
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (mesh.indices) {
    const indices = mesh.indices instanceof Uint16Array || mesh.indices instanceof Uint32Array ? mesh.indices : Uint32Array.from(mesh.indices);
    g.setIndex(new THREE.BufferAttribute(indices, 1));
  }
  g.computeVertexNormals();
  return g;
}

const LUMA = new THREE.Vector3(0.2126, 0.7152, 0.0722);

/**
 * Recolouring keeps the shading and detail of the photo colours but swaps their hue: every vertex colour is
 * replaced by the new body colour scaled by how bright that vertex is compared with the model's average.
 * @returns {{ active: boolean, target: THREE.Color, baseLuminance: number }}
 */
export function photoRecolor(color, baseColor) {
  const target = new THREE.Color(color);
  const base = new THREE.Color(baseColor || color);
  const active = Boolean(baseColor) && !target.equals(base);
  return { active, target, baseLuminance: Math.max(0.02, base.r * LUMA.x + base.g * LUMA.y + base.b * LUMA.z) };
}

/** Mesh built from photos, drawn like the built-in pieces: shadows both ways, matte finish, recolourable. */
function PhotoMesh({ mesh, widthM, depthM, heightM, color, baseColor }) {
  // Meshes saved before smoothing was added are rebuilt as smooth surfaces when possible
  const prepared = useMemo(() => upgradeLegacyMesh(mesh) || mesh, [mesh]);
  const geometry = useMemo(() => buildPhotoGeometry(prepared), [prepared]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // One shader patch for the lifetime of the material; the uniforms are updated as the colour changes
  const uniforms = useMemo(() => ({
    uRecolor: { value: new THREE.Color() },
    uAmount: { value: 0 },
    uBaseLuminance: { value: 1 },
  }), []);
  const onBeforeCompile = useMemo(() => (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uRecolor;\nuniform float uAmount;\nuniform float uBaseLuminance;\nvoid main() {')
      .replace('#include <color_fragment>', `
        #ifdef USE_COLOR
          float photoLuma = dot(vColor, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb *= mix(vColor, uRecolor * (photoLuma / uBaseLuminance), uAmount);
        #endif`);
  }, [uniforms]);
  const recolor = useMemo(() => photoRecolor(color, baseColor), [color, baseColor]);
  useEffect(() => {
    uniforms.uRecolor.value.copy(recolor.target);
    uniforms.uAmount.value = recolor.active ? 1 : 0;
    uniforms.uBaseLuminance.value = recolor.baseLuminance;
  }, [uniforms, recolor]);

  return (
    <mesh geometry={geometry} scale={[widthM, heightM, depthM]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.8} metalness={0} flatShading={!prepared.indices} onBeforeCompile={onBeforeCompile} customProgramCacheKey={() => 'photo-recolor'} />
    </mesh>
  );
}

/** Photo-made custom item; a plain box until a mesh has been generated. */
export function CustomMeshModel({ def, widthM, depthM, heightM, mainColor }) {
  if (!def.mesh) {
    return <FallbackBoxModel widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} />;
  }
  const baseColor = getFurnitureType(def.id)?.color;
  return <PhotoMesh mesh={def.mesh} widthM={widthM} depthM={depthM} heightM={heightM} color={mainColor} baseColor={baseColor} />;
}
