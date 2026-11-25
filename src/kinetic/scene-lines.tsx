import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GlowTrail, type GlowTrailRef } from '@dust-ui/3d'
import { CAM_Z, shown, useScene } from './scene-state'
import { PALETTE, SHARED, shaderArgs } from './scene-util'

const { clamp } = THREE.MathUtils

const THREAD = new THREE.CatmullRomCurve3(
  [
    [-10, -2.3, 0.6],
    [-5.2, -3.5, -0.8],
    [-0.6, -3.0, 0.9],
    [2.9, -0.5, -0.6],
    [4.7, 2.6, 0.8],
    [7.3, 3.6, -0.4],
    [10.2, 2.9, 0.5],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
)

/** One long silver S-curve drawing itself from lower left to upper right. */
export function Thread() {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const trail = useRef<GlowTrailRef>(null)

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.thread
    g.visible = shown(s, level)
    if (!g.visible) return
    g.scale.x = s.sx
    trail.current?.set(Math.min(level * 1.2, s.age.thread / 3.2), 0)
  })

  return (
    <group ref={group}>
      <GlowTrail
        ref={trail}
        curve={THREAD}
        progress={0}
        radius={0.016}
        tubularSegments={420}
        radialSegments={6}
        color='#8fa6b5'
        glowColor='#91bfd7'
        hotColor='#f4fbff'
        glowLength={0.22}
        intensity={2.4}
      />
    </group>
  )
}

const WIRES = [
  [3.75, 0],
  [3.3, 0.6],
  [2.75, -0.5],
  [-3.0, 0.8],
  [-3.6, 0.2],
].map(([y, z]) => ({
  y,
  curve: new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-11, 0, z),
    new THREE.Vector3(0, -0.1, z),
    new THREE.Vector3(11, 0, z)
  ),
}))

function Wire({ index }: { index: number }) {
  const { ref, accentHex } = useScene()
  const group = useRef<THREE.Group>(null)
  const trail = useRef<GlowTrailRef>(null)
  const { y, curve } = WIRES[index]

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.wire
    g.visible = shown(s, level)
    if (!g.visible) return
    // The sag flips sign at about 13 Hz: a plucked string, wider with the bass.
    const hum = s.calm
      ? 1
      : Math.sin(s.song * 82 + index * 2.1) * (0.5 + 2.5 * s.bass)
    g.scale.set(s.sx, hum, 1)
    trail.current?.set(
      clamp(Math.min(level * 1.3, (s.age.wire - index * 0.1) / 0.5), 0, 1),
      1 - (0.25 + 0.75 * s.bass)
    )
  })

  return (
    <group ref={group} position-y={y}>
      <GlowTrail
        ref={trail}
        curve={curve}
        progress={0}
        radius={0.02}
        tubularSegments={96}
        radialSegments={5}
        color='#33424a'
        glowColor={accentHex}
        hotColor='#fff3d0'
        glowLength={3}
        intensity={1.5}
      />
    </group>
  )
}

/** Taut lines across the top and bottom that hum with the bass. */
export function Wires() {
  return WIRES.map((_, i) => <Wire key={i} index={i} />)
}

function rune(points: [number, number][]) {
  const path = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]
    const [bx, by] = points[i]
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(ax, ay, 0),
        new THREE.Vector3(bx, by, 0)
      )
    )
  }
  return path
}

// Invented single-stroke glyphs on an arc around the clockwork's centre.
const RUNES: { at: [number, number]; curve: THREE.CurvePath<THREE.Vector3> }[] =
  [
    {
      at: [5.0, 3.2],
      curve: rune([
        [-0.3, -0.8],
        [-0.3, 0.8],
        [0.3, 0.35],
        [-0.3, -0.05],
        [0.35, -0.8],
      ]),
    },
    {
      at: [6.6, 2.0],
      curve: rune([
        [0.3, 0.8],
        [-0.3, 0.25],
        [0.3, -0.25],
        [-0.3, -0.8],
      ]),
    },
    {
      at: [7.2, 0.1],
      curve: rune([
        [-0.4, 0.8],
        [0, 0.2],
        [0.4, 0.8],
        [0, 0.2],
        [0, -0.8],
      ]),
    },
    {
      at: [6.6, -1.8],
      curve: rune([
        [-0.35, -0.8],
        [0.3, 0.1],
        [0, 0.8],
        [-0.3, 0.1],
        [0.35, -0.8],
      ]),
    },
    {
      at: [5.0, -3.0],
      curve: rune([
        [-0.1, 0.8],
        [-0.1, -0.8],
        [-0.1, -0.1],
        [0.35, 0.45],
      ]),
    },
  ]

function Sigil({ index }: { index: number }) {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const trail = useRef<GlowTrailRef>(null)
  const { at, curve } = RUNES[index]

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.sigils
    g.visible = shown(s, level)
    if (!g.visible) return
    g.position.x = at[0] * s.sx
    trail.current?.set(
      clamp(Math.min(level * 1.3, (s.age.sigils - index * 0.4) / 0.7), 0, 1),
      0.25 - 0.25 * s.kick
    )
  })

  return (
    <group ref={group} position={[at[0], at[1], 0.4]} scale={0.6}>
      <GlowTrail
        ref={trail}
        curve={curve}
        progress={0}
        radius={0.035}
        tubularSegments={120}
        radialSegments={5}
        color='#6b5324'
        glowColor='#e6bc63'
        hotColor='#fff1c4'
        glowLength={1.6}
        intensity={1.5}
      />
    </group>
  )
}

/** Gold glyph strokes writing themselves one after another. */
export function Sigils() {
  return RUNES.map((_, i) => <Sigil key={i} index={i} />)
}

type Figure = { stars: [number, number][]; edges: [number, number][] }

// A wing as a fan: feathers from a root to their tips, joined by two arcs.
const WING_ROOT: [number, number] = [1.3, 2.7]
const WING_TIPS: [number, number][] = [
  [3.3, 4.15],
  [4.8, 3.95],
  [6.1, 3.35],
  [7.1, 2.45],
  [7.7, 1.4],
]
const WING: Figure = {
  stars: [
    WING_ROOT,
    ...WING_TIPS.map(([x, y]): [number, number] => [
      WING_ROOT[0] + (x - WING_ROOT[0]) * 0.55,
      WING_ROOT[1] + (y - WING_ROOT[1]) * 0.55,
    ]),
    ...WING_TIPS,
  ],
  edges: WING_TIPS.flatMap((_, i): [number, number][] => [
    [0, 1 + i],
    [1 + i, 6 + i],
    ...(i > 0
      ? ([
          [i, 1 + i],
          [5 + i, 6 + i],
        ] as [number, number][])
      : []),
  ]),
}
const chain = (stars: [number, number][], close = false): Figure => ({
  stars,
  edges: stars
    .map((_, i): [number, number] => [i, (i + 1) % stars.length])
    .slice(0, close ? undefined : -1),
})
const FIGURES: Figure[] = [
  WING,
  { ...WING, stars: WING.stars.map(([x, y]) => [-x, y]) },
  chain([
    [-0.9, 3.5],
    [-0.45, 4.1],
    [0, 3.55],
    [0.45, 4.1],
    [0.9, 3.5],
  ]),
  chain(
    [
      [4.7, -2.7],
      [5.6, -3.2],
      [6.6, -2.9],
      [7.2, -3.6],
      [6.3, -4.0],
    ],
    true
  ),
]

/** Line and star buffers; aT is when (0 to 1) each vertex joins its figure. */
function figureBuffers() {
  const lines: number[] = []
  const lineT: number[] = []
  const stars: number[] = []
  const starT: number[] = []
  for (const figure of FIGURES) {
    const n = figure.edges.length
    const born = figure.stars.map(() => 1)
    figure.edges.forEach(([a, b], k) => {
      lines.push(...figure.stars[a], 0, ...figure.stars[b], 0)
      lineT.push(k / n, (k + 1) / n)
      born[a] = Math.min(born[a], k / n)
      born[b] = Math.min(born[b], (k + 1) / n)
    })
    figure.stars.forEach((star, i) => {
      stars.push(...star, 0)
      starT.push(born[i])
    })
  }
  const geometry = (positions: number[], t: number[]) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1))
    return g
  }
  return { lines: geometry(lines, lineT), stars: geometry(stars, starT) }
}

const FIGURE_VERT = /* glsl */ `
attribute float aT;
${SHARED}
varying float vT;
void main() {
  vT = aT;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (9.0 + 5.0 * sin(aT * 40.0)) * uScale / 1158.0;
}
`
const FIGURE_HEAD = /* glsl */ `
${SHARED}
uniform float uLevel, uProgress;
varying float vT;
${PALETTE}
`
const FIGURE_LINE = /* glsl */ `
void main() {
  float on = smoothstep(uProgress, uProgress - 0.03, vT);
  float head = exp(-max(uProgress - vT, 0.0) * 12.0);
  vec3 col = mix(MOON, mix(GOLD, uAccent, 0.4), 0.55) * (0.42 + head * 0.7);
  gl_FragColor = vec4(col * on * uLevel, 1.0);
}
`
const FIGURE_STAR = /* glsl */ `
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float on = smoothstep(uProgress, uProgress - 0.03, vT);
  float a = exp(-d * d * 7.0) + 0.5 * exp(-d * d * 60.0);
  a += 0.35 * (exp(-abs(c.x) * 40.0) + exp(-abs(c.y) * 40.0)) * smoothstep(1.0, 0.2, d);
  float tw = 0.8 + 0.2 * sin(uTime * 2.0 + vT * 50.0);
  gl_FragColor = vec4(mix(WARM, PALE, 0.4) * a * on * tw * uLevel, 1.0);
}
`
const FIGURE_Z = -6

/** Invented constellations (a pair of wings, a crown, a kite) joining up. */
export function Constellations() {
  const { ref, shared } = useScene()
  const group = useRef<THREE.Group>(null)
  const lineMaterial = useRef<THREE.ShaderMaterial>(null)
  const buffers = useMemo(() => figureBuffers(), [])
  const [lineArgs, starArgs] = useMemo(() => {
    const uniforms = {
      ...shared,
      uLevel: { value: 0 },
      uProgress: { value: 0 },
    }
    return [
      shaderArgs(uniforms, FIGURE_VERT, FIGURE_HEAD + FIGURE_LINE),
      shaderArgs(uniforms, FIGURE_VERT, FIGURE_HEAD + FIGURE_STAR),
    ]
  }, [shared])

  useFrame(() => {
    const s = ref.current
    const g = group.current
    const mat = lineMaterial.current
    if (!g || !mat) return
    const level = s.cues.constellations
    g.visible = shown(s, level)
    if (!g.visible) return
    const k = (CAM_Z - FIGURE_Z) / CAM_Z
    g.scale.set(k * s.sx, k, 1)
    // Both materials share the one uniforms object.
    mat.uniforms.uLevel.value = level
    mat.uniforms.uProgress.value =
      clamp(s.age.constellations / 3.2, 0, 1) * 1.05
  })

  return (
    <group ref={group} position-z={FIGURE_Z} renderOrder={7}>
      <lineSegments geometry={buffers.lines} frustumCulled={false}>
        <shaderMaterial ref={lineMaterial} args={lineArgs} />
      </lineSegments>
      <points geometry={buffers.stars} frustumCulled={false}>
        <shaderMaterial args={starArgs} />
      </points>
    </group>
  )
}
