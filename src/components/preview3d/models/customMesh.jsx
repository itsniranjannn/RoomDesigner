import { useEffect, useMemo, useState } from 'react';
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
  const positions =
    mesh.positions instanceof Float32Array ? mesh.positions : Float32Array.from(mesh.positions);
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const colors = new Float32Array(mesh.colors.length);
  const c = new THREE.Color();
  for (let i = 0; i < colors.length; i += 3) {
    c.setRGB(
      mesh.colors[i] / 255,
      mesh.colors[i + 1] / 255,
      mesh.colors[i + 2] / 255,
      THREE.SRGBColorSpace
    );
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (mesh.indices) {
    const indices =
      mesh.indices instanceof Uint16Array || mesh.indices instanceof Uint32Array
        ? mesh.indices
        : Uint32Array.from(mesh.indices);
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
  return {
    active,
    target,
    baseLuminance: Math.max(0.02, base.r * LUMA.x + base.g * LUMA.y + base.b * LUMA.z),
  };
}

export const TEXTURE_SLOTS = ['front', 'right', 'back', 'left', 'top'];

/**
 * Fragment code that projects the photos back onto the surface: every photo is mapped straight onto the
 * model along its own viewing direction and the photos are blended by how squarely the surface faces them
 * (tri-planar mapping). Returns a negative colour where no photo sees the surface.
 */
export const PHOTO_PROJECTION_GLSL = `
varying vec3 vObjPos;
varying vec3 vObjN;
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform sampler2D uTex3;
uniform sampler2D uTex4;
uniform vec4 uHasA;
uniform float uHasB;
vec3 photoProject() {
  vec3 n = normalize(vObjN);
  vec3 p = vec3(vObjPos.x + 0.5, vObjPos.y, vObjPos.z + 0.5);
  vec3 sum = vec3(0.0);
  float total = 0.0;
  float w;
  w = n.z;
  if (uHasA.x > 0.5 && w > 0.05) { w = pow(w, 4.0); sum += w * texture2D(uTex0, vec2(p.x, 1.0 - p.y)).rgb; total += w; }
  w = n.x;
  if (uHasA.y > 0.5 && w > 0.05) { w = pow(w, 4.0); sum += w * texture2D(uTex1, vec2(1.0 - p.z, 1.0 - p.y)).rgb; total += w; }
  w = -n.z;
  if (uHasA.z > 0.5 && w > 0.05) { w = pow(w, 4.0); sum += w * texture2D(uTex2, vec2(1.0 - p.x, 1.0 - p.y)).rgb; total += w; }
  w = -n.x;
  if (uHasA.w > 0.5 && w > 0.05) { w = pow(w, 4.0); sum += w * texture2D(uTex3, vec2(p.z, 1.0 - p.y)).rgb; total += w; }
  w = n.y;
  if (uHasB > 0.5 && w > 0.05) { w = pow(w, 4.0); sum += w * texture2D(uTex4, vec2(p.x, p.z)).rgb; total += w; }
  return total > 0.001 ? sum / total : vec3(-1.0);
}
`;

const BLANK_TEXTURE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
BLANK_TEXTURE.needsUpdate = true;

/** Loads the stored photo textures (data URLs by slot); each is null until it has decoded. */
function usePhotoTextures(textures) {
  const [loaded, setLoaded] = useState({});
  useEffect(() => {
    let alive = true;
    const made = [];
    setLoaded({});
    for (const slot of TEXTURE_SLOTS) {
      const url = textures?.[slot];
      if (!url) continue;
      new THREE.TextureLoader().load(url, (tex) => {
        if (!alive) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        made.push(tex);
        setLoaded((cur) => ({ ...cur, [slot]: tex }));
      });
    }
    return () => {
      alive = false;
      made.forEach((t) => t.dispose());
    };
  }, [textures]);
  return loaded;
}

/** Mesh built from photos, drawn like the built-in pieces: shadows both ways, matte finish, recolourable. */
function PhotoMesh({ mesh, textures, widthM, depthM, heightM, color, baseColor }) {
  // Meshes saved before smoothing was added are rebuilt as smooth surfaces when possible
  const prepared = useMemo(() => upgradeLegacyMesh(mesh) || mesh, [mesh]);
  const geometry = useMemo(() => buildPhotoGeometry(prepared), [prepared]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // One shader patch for the lifetime of the material; the uniforms are updated as the colour changes
  const uniforms = useMemo(
    () => ({
      uRecolor: { value: new THREE.Color() },
      uAmount: { value: 0 },
      uBaseLuminance: { value: 1 },
      uTex0: { value: BLANK_TEXTURE },
      uTex1: { value: BLANK_TEXTURE },
      uTex2: { value: BLANK_TEXTURE },
      uTex3: { value: BLANK_TEXTURE },
      uTex4: { value: BLANK_TEXTURE },
      uHasA: { value: new THREE.Vector4() },
      uHasB: { value: 0 },
    }),
    []
  );
  const photoTextures = usePhotoTextures(textures);
  useEffect(() => {
    TEXTURE_SLOTS.forEach((slot, i) => {
      uniforms[`uTex${i}`].value = photoTextures[slot] || BLANK_TEXTURE;
    });
    const has = (slot) => (photoTextures[slot] ? 1 : 0);
    uniforms.uHasA.value.set(has('front'), has('right'), has('back'), has('left'));
    uniforms.uHasB.value = has('top');
  }, [uniforms, photoTextures]);
  const onBeforeCompile = useMemo(
    () => (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        'varying vec3 vObjPos;\nvarying vec3 vObjN;\nvoid main() {\n  vObjPos = position;\n  vObjN = normal;'
      );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          `uniform vec3 uRecolor;\nuniform float uAmount;\nuniform float uBaseLuminance;\n${PHOTO_PROJECTION_GLSL}\nvoid main() {`
        )
        .replace(
          '#include <color_fragment>',
          `
        #ifdef USE_COLOR
          vec3 photoCol = vColor;
          vec3 projected = photoProject();
          if (projected.r >= 0.0) photoCol = projected;
          float photoLuma = dot(photoCol, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb *= mix(photoCol, uRecolor * (photoLuma / uBaseLuminance), uAmount);
        #endif`
        );
    },
    [uniforms]
  );
  const recolor = useMemo(() => photoRecolor(color, baseColor), [color, baseColor]);
  useEffect(() => {
    uniforms.uRecolor.value.copy(recolor.target);
    uniforms.uAmount.value = recolor.active ? 1 : 0;
    uniforms.uBaseLuminance.value = recolor.baseLuminance;
  }, [uniforms, recolor]);

  return (
    <mesh geometry={geometry} scale={[widthM, heightM, depthM]} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.8}
        metalness={0}
        flatShading={!prepared.indices}
        onBeforeCompile={onBeforeCompile}
        customProgramCacheKey={() => 'photo-recolor-proj'}
      />
    </mesh>
  );
}

/** Photo-made custom item; a plain box until a mesh has been generated. */
export function CustomMeshModel({ def, widthM, depthM, heightM, mainColor }) {
  if (!def.mesh) {
    return (
      <FallbackBoxModel widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} />
    );
  }
  const baseColor = getFurnitureType(def.id)?.color;
  return (
    <PhotoMesh
      mesh={def.mesh}
      textures={def.textures}
      widthM={widthM}
      depthM={depthM}
      heightM={heightM}
      color={mainColor}
      baseColor={baseColor}
    />
  );
}
