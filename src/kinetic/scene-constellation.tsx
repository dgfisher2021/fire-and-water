import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAM_Z, HALF_H, REF_HALF_W, shown, useScene } from './scene-state'
import { rng } from './scene-util'

/*
 * The constellations of Spirit World (starry_night_cosmos.js): no drawn
 * figures. Twinkling stars swell and glow where attention passes, and thin
 * lines of light join the ones close together, so constellations form and
 * dissolve behind a drifting focus. There it follows the pointer; here two
 * foci wander on the song clock.
 */

const STARS = 340
/** How far a focus reaches, and how close two stars must be to be joined. */
const REACH = 3.1
const LINK = 1.5
const Z = -1.2

const FOCI = /* glsl */ `
uniform vec2 uFocusA;
uniform vec2 uFocusB;
uniform float uReach;
float boostAt(vec2 p) {
  float a = 1.0 - distance(p, uFocusA) / uReach;
  float b = 1.0 - distance(p, uFocusB) / uReach;
  return clamp(max(a, b), 0.0, 1.0);
}
`

const STAR_VERTEX = /* glsl */ `
${FOCI}
uniform float uTime;
uniform float uScale;
uniform float uLevel;
attribute vec3 aSeed;
varying float vAlpha;
varying float vBoost;
void main() {
  float boost = boostAt(position.xy);
  // Each star twinkles on its own clock, lit or not.
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.x * 1.8) + aSeed.y * 6.2832);
  vBoost = boost;
  vAlpha = uLevel * clamp(twinkle * (0.25 + 0.4 * aSeed.z) + boost * 0.9, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = 0.035 + 0.03 * aSeed.z + boost * 0.11;
  gl_PointSize = size * uScale / -mv.z;
}
`
const STAR_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
varying float vAlpha;
varying float vBoost;
void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  // A hard core in a soft halo that widens as the star is lit.
  float core = 1.0 - smoothstep(0.0, 0.16, d);
  float halo = (1.0 - smoothstep(0.0, 0.5, d)) * (0.25 + 0.5 * vBoost);
  vec3 color = mix(vec3(1.0), uTint, 0.35 * (1.0 - core));
  gl_FragColor = vec4(color * (core + halo), 1.0) * vAlpha;
}
`

const LINE_VERTEX = /* glsl */ `
${FOCI}
uniform float uLevel;
uniform float uWidth;
attribute vec2 aFrom;
attribute vec2 aTo;
attribute vec2 aCorner;
varying float vAlpha;
varying float vAcross;
void main() {
  vec2 along = aTo - aFrom;
  vec2 normal = normalize(vec2(-along.y, along.x));
  vec2 p = mix(aFrom, aTo, aCorner.x) + normal * aCorner.y * uWidth;
  // Drawn only where both of its stars are lit.
  float lit = min(boostAt(aFrom), boostAt(aTo));
  vAlpha = uLevel * smoothstep(0.16, 0.5, lit);
  vAcross = aCorner.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, ${Z.toFixed(1)}, 1.0);
}
`
const LINE_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
varying float vAlpha;
varying float vAcross;
void main() {
  float glow = 1.0 - abs(vAcross);
  gl_FragColor = vec4(mix(uTint, vec3(1.0), 0.6) * glow, 1.0) * vAlpha * 0.5;
}
`

function build() {
  const random = rng(4127)
  const positions = new Float32Array(STARS * 3)
  const seeds = new Float32Array(STARS * 3)
  const at: [number, number][] = []
  for (let i = 0; i < STARS; i++) {
    const x = (random() * 2 - 1) * REF_HALF_W * 1.02
    const y = (random() * 2 - 1) * HALF_H * 0.98
    at.push([x, y])
    positions.set([x, y, Z], i * 3)
    seeds.set([random(), random(), random()], i * 3)
  }
  const stars = new THREE.BufferGeometry()
  stars.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  stars.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))

  // Every pair of close neighbours, each star in at most three lines.
  const used = new Uint8Array(STARS)
  const from: number[] = []
  const to: number[] = []
  const corner: number[] = []
  const index: number[] = []
  for (let i = 0; i < STARS; i++)
    for (let j = i + 1; j < STARS; j++) {
      if (used[i] >= 3 || used[j] >= 3) continue
      const d = Math.hypot(at[j][0] - at[i][0], at[j][1] - at[i][1])
      if (d > LINK || d < 0.25) continue
      used[i]++
      used[j]++
      const base = from.length / 2
      for (const [u, v] of [
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 1],
      ]) {
        from.push(at[i][0], at[i][1])
        to.push(at[j][0], at[j][1])
        corner.push(u, v)
      }
      index.push(base, base + 1, base + 2, base + 2, base + 1, base + 3)
    }
  const lines = new THREE.BufferGeometry()
  lines.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array((from.length / 2) * 3), 3)
  )
  lines.setAttribute('aFrom', new THREE.Float32BufferAttribute(from, 2))
  lines.setAttribute('aTo', new THREE.Float32BufferAttribute(to, 2))
  lines.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2))
  lines.setIndex(index)
  return { stars, lines }
}

/** Stars that light and join into passing constellations wherever the two foci drift. */
export function Constellations() {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const { stars, lines } = useMemo(() => build(), [])
  const starMaterial = useRef<THREE.ShaderMaterial>(null)
  const lineMaterial = useRef<THREE.ShaderMaterial>(null)
  const [starArgs, lineArgs] = useMemo(() => {
    const foci = {
      uFocusA: { value: new THREE.Vector2() },
      uFocusB: { value: new THREE.Vector2() },
      uReach: { value: REACH },
      uLevel: { value: 0 },
      uTint: { value: new THREE.Color('#e6bc63') },
    }
    const common = {
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }
    return [
      [
        {
          ...common,
          vertexShader: STAR_VERTEX,
          fragmentShader: STAR_FRAGMENT,
          uniforms: { ...foci, uTime: { value: 0 }, uScale: { value: 1000 } },
        },
      ],
      [
        {
          ...common,
          vertexShader: LINE_VERTEX,
          fragmentShader: LINE_FRAGMENT,
          uniforms: { ...foci, uWidth: { value: 0.02 } },
        },
      ],
    ] satisfies [THREE.ShaderMaterialParameters][]
  }, [])

  useFrame(() => {
    const s = ref.current
    const g = group.current
    const u = starMaterial.current?.uniforms
    const lineU = lineMaterial.current?.uniforms
    if (!g || !u || !lineU) return
    const level = s.cues.constellations
    g.visible = shown(s, level)
    if (!g.visible) return
    g.scale.x = s.sx
    // Two slow wanderers; under reduced motion they rest apart.
    const t = s.calm ? 4 : s.song
    const w = REF_HALF_W
    u.uFocusA.value.set(
      w * 0.66 * Math.sin(t * 0.21 + 0.4),
      1.0 + 2.5 * Math.sin(t * 0.29)
    )
    u.uFocusB.value.set(
      w * 0.6 * Math.sin(t * 0.14 + 2.3),
      -0.2 + 3.0 * Math.cos(t * 0.23 + 1.1)
    )
    u.uLevel.value = level
    u.uTint.value.copy(s.accent)
    u.uTime.value = s.motion
    u.uScale.value = s.shared.uScale.value
    // About a pixel and a half wide at any size, as Spirit World draws it.
    lineU.uWidth.value = (2.4 * (CAM_Z - Z)) / s.shared.uScale.value
  })

  return (
    <group ref={group} visible={false} renderOrder={40}>
      <mesh geometry={lines} frustumCulled={false} renderOrder={40}>
        <shaderMaterial ref={lineMaterial} args={lineArgs} />
      </mesh>
      <points geometry={stars} frustumCulled={false} renderOrder={41}>
        <shaderMaterial ref={starMaterial} args={starArgs} />
      </points>
    </group>
  )
}
