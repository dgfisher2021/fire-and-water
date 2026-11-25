import * as THREE from 'three'

/** A seeded random source, so the scene is the same on every mount. */
export function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A geometry of `count` points, each with a vec4 of seeds from `fill`. */
export function seededPoints(
  count: number,
  seed: number,
  fill: (random: () => number, position: number[], seeds: number[]) => void
) {
  const random = rng(seed)
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  const p = [0, 0, 0]
  const q = [0, 0, 0, 0]
  for (let i = 0; i < count; i++) {
    fill(random, p, q)
    positions.set(p, i * 3)
    seeds.set(q, i * 4)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  return geometry
}

/**
 * Constructor args for a `<shaderMaterial>`: additive, no depth write. Passed
 * as `args` because R3F's `uniforms` prop copies each uniform, which would cut
 * a material off from the uniform objects the scene shares.
 */
export function shaderArgs(
  uniforms: Record<string, THREE.IUniform>,
  vertexShader: string,
  fragmentShader: string,
  extra?: THREE.ShaderMaterialParameters
): [THREE.ShaderMaterialParameters] {
  return [
    {
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      ...extra,
    },
  ]
}

export const NOISE = /* glsl */ `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 17.0;
    a *= 0.5;
  }
  return s;
}
float fbm2(vec2 p) {
  return vnoise(p) * 0.65 + vnoise(p * 2.1 + 11.0) * 0.35;
}
`

export const SHARED = /* glsl */ `
uniform float uTime, uSong, uHalfW, uScale, uBass, uVocal, uKick, uEnergy, uTall;
uniform vec3 uAccent;
`

/** The palette as linear values, for the shaders. */
export const PALETTE = /* glsl */ `
const vec3 GOLD = vec3(0.79, 0.50, 0.125);
const vec3 MOON = vec3(0.283, 0.521, 0.680);
const vec3 COPPER = vec3(0.745, 0.250, 0.102);
const vec3 PALE = vec3(0.62, 0.74, 0.84);
const vec3 WARM = vec3(1.0, 0.86, 0.60);
const vec3 INK = vec3(0.0012, 0.0052, 0.0080);
`
