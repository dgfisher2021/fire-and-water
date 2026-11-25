import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAM_Z, shown, useScene } from './scene-state'

/*
 * The constellations: real ones, drawn simply. A handful of figures from
 * the night sky stand in the open frame, each a few stars joined by a few
 * lines, and they draw themselves one line after another. Corvus, the
 * raven, is among them for the cover's sake.
 */

type Figure = {
  at: [number, number]
  size: number
  stars: [number, number][]
  lines: [number, number][]
}

/** Stars as x and y in a unit box, lines as pairs of star indices in drawing order. */
const FIGURES: Figure[] = [
  {
    // Cygnus, the swan: the Northern Cross.
    at: [-6.3, -2.9],
    size: 1.15,
    stars: [
      [0, 1],
      [0, 0.42],
      [0, -1],
      [0.78, 0.2],
      [-0.74, 0.62],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [4, 1],
      [1, 3],
    ],
  },
  {
    // Lyra: Vega above a small parallelogram.
    at: [-2.6, -3.3],
    size: 0.75,
    stars: [
      [0, 1],
      [-0.2, 0.42],
      [0.25, 0.36],
      [0.4, -0.6],
      [-0.05, -0.55],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 1],
    ],
  },
  {
    // Cassiopeia: the W.
    at: [0.4, 3.35],
    size: 1.25,
    stars: [
      [-1, 0.3],
      [-0.5, -0.3],
      [0, 0.2],
      [0.5, -0.35],
      [1, 0.35],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    // Corvus, the raven: a leaning sail.
    at: [0.9, -3.2],
    size: 0.9,
    stars: [
      [-0.55, 0.5],
      [0.5, 0.65],
      [0.65, -0.55],
      [-0.4, -0.6],
      [-1.0, 0.25],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
    ],
  },
  {
    // The Plough: a bowl and its handle.
    at: [-4.9, 3.25],
    size: 1.6,
    stars: [
      [0.95, 0.2],
      [0.95, -0.22],
      [0.42, -0.3],
      [0.36, 0.1],
      [-0.02, 0.2],
      [-0.46, 0.34],
      [-0.92, 0.18],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
]

const Z = -1.2
/** Lines drawn a second. */
const PACE = 2.4

const STAR_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uLevel;
uniform float uDraw;
attribute vec2 aSeed;
varying float vAlpha;
void main() {
  // A star lights as the first line to reach it starts.
  float lit = clamp((uDraw - aSeed.x) * 3.0 + 1.0, 0.0, 1.0);
  float twinkle = 0.8 + 0.2 * sin(uTime * (1.2 + aSeed.y * 2.0) + aSeed.y * 6.2832);
  vAlpha = uLevel * lit * twinkle;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.2 + 0.08 * aSeed.y) * uScale / -mv.z;
}
`
const STAR_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = 1.0 - smoothstep(0.0, 0.09, d);
  float halo = (1.0 - smoothstep(0.0, 0.5, d)) * 0.3;
  // Four fine points, as a bright star has through a lens.
  float rays = (exp(-abs(c.x) * 60.0) + exp(-abs(c.y) * 60.0)) * (1.0 - smoothstep(0.1, 0.5, d)) * 0.5;
  vec3 color = mix(uTint, vec3(1.0), 0.75);
  gl_FragColor = vec4(color * (core + halo + rays), 1.0) * vAlpha;
}
`
const LINE_VERTEX = /* glsl */ `
uniform float uWidth;
attribute vec2 aFrom;
attribute vec2 aTo;
attribute vec2 aCorner;
attribute float aOrder;
varying float vAlong;
varying float vAcross;
varying float vOrder;
void main() {
  vec2 along = aTo - aFrom;
  vec2 normal = normalize(vec2(-along.y, along.x));
  // Stop short of each star, so the line does not run into its light.
  float u = mix(0.1, 0.9, aCorner.x);
  vec2 p = mix(aFrom, aTo, u) + normal * aCorner.y * uWidth;
  vAlong = aCorner.x;
  vAcross = aCorner.y;
  vOrder = aOrder;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, ${Z.toFixed(1)}, 1.0);
}
`
const LINE_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
uniform float uLevel;
uniform float uDraw;
varying float vAlong;
varying float vAcross;
varying float vOrder;
void main() {
  // Drawn from its first star to its second as its turn comes.
  float drawn = clamp(uDraw - vOrder, 0.0, 1.0);
  float on = 1.0 - smoothstep(drawn - 0.04, drawn, vAlong);
  float glow = 1.0 - abs(vAcross);
  gl_FragColor = vec4(mix(uTint, vec3(1.0), 0.6) * glow, 1.0) * on * uLevel * 0.8;
}
`

function build() {
  const position: number[] = []
  const seed: number[] = []
  const from: number[] = []
  const to: number[] = []
  const corner: number[] = []
  const order: number[] = []
  const index: number[] = []
  let turn = 0
  let longest = 0
  for (const figure of FIGURES) {
    const place = ([x, y]: [number, number]): [number, number] => [
      figure.at[0] + x * figure.size,
      figure.at[1] + y * figure.size,
    ]
    // When the first line to touch each star starts.
    const first = figure.stars.map(() => Infinity)
    figure.lines.forEach(([a, b], k) => {
      first[a] = Math.min(first[a], turn + k)
      first[b] = Math.min(first[b], turn + k + 0.7)
      const base = from.length / 2
      const [ax, ay] = place(figure.stars[a])
      const [bx, by] = place(figure.stars[b])
      for (const [u, v] of [
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 1],
      ]) {
        from.push(ax, ay)
        to.push(bx, by)
        corner.push(u, v)
        order.push(turn + k)
      }
      index.push(base, base + 1, base + 2, base + 2, base + 1, base + 3)
    })
    figure.stars.forEach((star, i) => {
      const [x, y] = place(star)
      position.push(x, y, Z)
      seed.push(first[i], (i * 0.37 + turn * 0.11) % 1)
    })
    // The figures draw together, each a beat behind the last.
    turn += 0.45
    longest = Math.max(longest, turn + figure.lines.length)
  }
  const stars = new THREE.BufferGeometry()
  stars.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  stars.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 2))
  const lines = new THREE.BufferGeometry()
  lines.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array((from.length / 2) * 3), 3)
  )
  lines.setAttribute('aFrom', new THREE.Float32BufferAttribute(from, 2))
  lines.setAttribute('aTo', new THREE.Float32BufferAttribute(to, 2))
  lines.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2))
  lines.setAttribute('aOrder', new THREE.Float32BufferAttribute(order, 1))
  lines.setIndex(index)
  return { stars, lines, turns: longest }
}

/** A few real constellations, each drawing itself a line at a time. */
export function Constellations() {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const { stars, lines, turns } = useMemo(() => build(), [])
  const starMaterial = useRef<THREE.ShaderMaterial>(null)
  const lineMaterial = useRef<THREE.ShaderMaterial>(null)
  const [starArgs, lineArgs] = useMemo(() => {
    const common = {
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }
    const tint = { value: new THREE.Color('#aab8ff') }
    return [
      [
        {
          ...common,
          vertexShader: STAR_VERTEX,
          fragmentShader: STAR_FRAGMENT,
          uniforms: {
            uTint: tint,
            uLevel: { value: 0 },
            uDraw: { value: 0 },
            uTime: { value: 0 },
            uScale: { value: 1000 },
          },
        },
      ],
      [
        {
          ...common,
          vertexShader: LINE_VERTEX,
          fragmentShader: LINE_FRAGMENT,
          uniforms: {
            uTint: tint,
            uLevel: { value: 0 },
            uDraw: { value: 0 },
            uWidth: { value: 0.02 },
          },
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
    const draw = s.calm ? turns : Math.max(0, s.age.constellations) * PACE
    u.uLevel.value = lineU.uLevel.value = level
    u.uDraw.value = lineU.uDraw.value = draw
    u.uTint.value.copy(s.accent)
    u.uTime.value = s.motion
    u.uScale.value = s.shared.uScale.value
    // Two or three pixels wide at any size.
    lineU.uWidth.value = (2 * (CAM_Z - Z)) / s.shared.uScale.value
  })

  return (
    <group ref={group} visible={false}>
      <mesh geometry={lines} frustumCulled={false} renderOrder={40}>
        <shaderMaterial ref={lineMaterial} args={lineArgs} />
      </mesh>
      <points geometry={stars} frustumCulled={false} renderOrder={41}>
        <shaderMaterial ref={starMaterial} args={starArgs} />
      </points>
    </group>
  )
}
