import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GlowTrail, type GlowTrailRef } from '@dust-ui/3d'
import { WirePulses } from './scene-particles'
import { CAM_Z, shown, useScene } from './scene-state'
import { PALETTE, SHARED, rng, shaderArgs } from './scene-util'
import { FEATHERS, featherPoint } from './wing'

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

const WIRE_LINES: [number, number][] = [
  [3.75, 0],
  [3.3, 0.6],
  [2.75, -0.5],
  [-3.0, 0.8],
  [-3.6, 0.2],
]
const WIRES = WIRE_LINES.map(([y, z]) => ({
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
        intensity={0.9}
      />
    </group>
  )
}

/** Taut lines across the top and bottom that hum with the bass, charges running along them. */
export function Wires() {
  return (
    <>
      {WIRES.map((_, i) => (
        <Wire key={i} index={i} />
      ))}
      <WirePulses lines={WIRE_LINES} />
    </>
  )
}

// The cover's runes as single strokes, a unit tall: raido, fehu, algiz, othala, kaun.
const RUNES: [number, number][][] = [
  [
    [-0.3, -0.8],
    [-0.3, 0.8],
    [0.3, 0.35],
    [-0.3, -0.05],
    [0.35, -0.8],
  ],
  [
    [-0.2, -0.8],
    [-0.2, 0.8],
    [-0.2, 0.3],
    [0.35, 0.8],
    [-0.2, 0.3],
    [-0.2, -0.2],
    [0.35, 0.3],
  ],
  [
    [-0.4, 0.8],
    [0, 0.2],
    [0.4, 0.8],
    [0, 0.2],
    [0, 0.8],
    [0, -0.8],
  ],
  [
    [-0.35, -0.8],
    [0.3, 0.1],
    [0, 0.8],
    [-0.3, 0.1],
    [0.35, -0.8],
  ],
  [
    [0.3, 0.8],
    [-0.3, 0],
    [0.3, -0.8],
  ],
]
const SIGIL_COUNT = 3200
/** Seconds a rune stands, and seconds the grains take to flow into the next. */
const SIGIL_HOLD = 1.15
const SIGIL_FLOW = 0.75

/** `count` points along a rune's stroke, a little off it, as x and y pairs. */
function runePoints(points: [number, number][], count: number, seed: number) {
  const random = rng(seed)
  const lengths = points
    .slice(1)
    .map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]))
  const total = lengths.reduce((sum, l) => sum + l, 0)
  const out = new Float32Array(count * 2)
  for (let n = 0; n < count; n++) {
    let d = random() * total
    let k = 0
    while (k < lengths.length - 1 && d > lengths[k]) d -= lengths[k++]
    const f = d / lengths[k]
    // Most grains sit on the stroke; a few stray from it.
    const off = (random() + random() - 1) * (random() < 0.85 ? 0.035 : 0.11)
    const ang = random() * Math.PI * 2
    out[n * 2] =
      points[k][0] + (points[k + 1][0] - points[k][0]) * f + Math.cos(ang) * off
    out[n * 2 + 1] =
      points[k][1] + (points[k + 1][1] - points[k][1]) * f + Math.sin(ang) * off
  }
  return out
}

const SIGIL_VERT = /* glsl */ `
attribute vec2 aR0, aR1, aR2, aR3, aR4;
attribute vec4 aSeed;
${SHARED}
uniform float uIndex, uLevel, uSize;
varying float vA;
varying float vHot;
vec2 rune(float i) {
  i = mod(i, 5.0);
  return i < 0.5 ? aR0 : i < 1.5 ? aR1 : i < 2.5 ? aR2 : i < 3.5 ? aR3 : aR4;
}
void main() {
  float at = floor(uIndex);
  // Each grain leaves in its own time, so the rune loosens before it flows.
  float e = clamp(fract(uIndex) * 1.5 - aSeed.x * 0.5, 0.0, 1.0);
  e = e * e * (3.0 - 2.0 * e);
  vec2 a = rune(at);
  vec2 b = rune(at + 1.0);
  float mid = sin(e * 3.14159);
  // Between two runes the grains swirl apart, as the kit's particle carousel does.
  float ang = aSeed.y * 6.2832 + e * 4.0;
  vec3 p = vec3(mix(a, b, e) + vec2(cos(ang), sin(ang)) * mid * (0.25 + 0.75 * aSeed.z), (aSeed.w - 0.5) * mid * 2.4);
  // Coming and going, the whole cloud is loose dust.
  float loose = 1.0 - smoothstep(0.0, 0.9, uLevel - aSeed.x * 0.1);
  p.xy += vec2(cos(ang * 1.7), sin(ang * 1.3)) * loose * (0.6 + 2.2 * aSeed.z);
  p.xy += vec2(sin(uTime * 1.4 + aSeed.y * 40.0), cos(uTime * 1.2 + aSeed.w * 40.0)) * 0.012;
  vec4 mv = modelViewMatrix * vec4(p * uSize, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.7 + 0.3 * sin(uTime * (2.0 + aSeed.z * 5.0) + aSeed.x * 60.0);
  gl_PointSize = (2.4 + 3.0 * aSeed.z * aSeed.z + mid * 2.5 * aSeed.w) * uScale / 1158.0
    * (1.0 + 0.25 * uKick);
  vA = uLevel * tw * (1.0 - 0.45 * mid) * (1.0 - 0.6 * loose) * (1.0 + 0.6 * uHigh * step(0.7, aSeed.w));
  vHot = aSeed.z * aSeed.z + mid * 0.4;
}
`
const SIGIL_FRAG = /* glsl */ `
varying float vA;
varying float vHot;
${PALETTE}
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.2, d);
  gl_FragColor = vec4(mix(GOLD, WARM, 0.25 + 0.6 * vHot) * a * vA * 0.62, 1.0);
}
`

/**
 * The sigils: gold grains that hold one of the cover's runes, then swirl
 * apart and flow into the next (the particle morph of the kit's
 * `ParticleCarouselScene`, drawn here in the film's own canvas and timed by
 * the song, so any moment gives the same rune).
 */
export function Sigils() {
  const { ref, shared } = useScene()
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const random = rng(313)
    const seeds = new Float32Array(SIGIL_COUNT * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = random()
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(SIGIL_COUNT * 3), 3)
    )
    RUNES.forEach((stroke, i) =>
      g.setAttribute(
        `aR${i}`,
        new THREE.BufferAttribute(runePoints(stroke, SIGIL_COUNT, 41 + i), 2)
      )
    )
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    return g
  }, [])
  const args = useMemo(
    () =>
      shaderArgs(
        {
          ...shared,
          uIndex: { value: 0 },
          uLevel: { value: 0 },
          uSize: { value: 1 },
        },
        SIGIL_VERT,
        SIGIL_FRAG,
        { depthTest: false }
      ),
    [shared]
  )

  useFrame(() => {
    const s = ref.current
    const p = points.current
    const mat = material.current
    if (!p || !mat) return
    const level = s.cues.sigils
    p.visible = shown(s, level)
    if (!p.visible) return
    // Above the heart's place on a wide stage; beside it, under the words, on a phone.
    const [hx, hy, hr] = s.heart
    if (s.tall) p.position.set(hx - 1.3, hy + 0.1, 0.4)
    else p.position.set(hx + 0.5, hy + hr + 1.75, 0.4)
    const u = mat.uniforms
    u.uSize.value = s.tall ? 0.72 : 1.25
    u.uLevel.value = level
    // A rune stands, then flows into the next, by the song's clock.
    const span = SIGIL_HOLD + SIGIL_FLOW
    const at = (s.calm ? 0 : s.song) / span
    const turn = at - Math.floor(at)
    u.uIndex.value =
      Math.floor(at) + clamp((turn * span - SIGIL_HOLD) / SIGIL_FLOW, 0, 1)
  })

  return (
    <points
      ref={points}
      geometry={geometry}
      renderOrder={12}
      frustumCulled={false}
    >
      <shaderMaterial ref={material} args={args} />
    </points>
  )
}

type Figure = { stars: [number, number][]; edges: [number, number][] }

// The seeress's wing (`wing.ts`) as stars: the root, each long feather's
// middle and tip, joined along the feathers and from tip to tip.
const WING_ROOT: [number, number] = [1.2, 2.3]
const WING_FEATHERS = FEATHERS.filter((_, i) => i < 7)
const wingStar = (i: number, s: number): [number, number] => {
  const [x, y] = featherPoint(WING_FEATHERS[i], s)
  return [WING_ROOT[0] + x * 6.4, WING_ROOT[1] + y * 2.2]
}
const WING_N = WING_FEATHERS.length
const WING: Figure = {
  stars: [
    WING_ROOT,
    ...WING_FEATHERS.map((_, i) => wingStar(i, 0.55)),
    ...WING_FEATHERS.map((_, i) => wingStar(i, 1)),
  ],
  edges: WING_FEATHERS.flatMap((_, i): [number, number][] => [
    [0, 1 + i],
    [1 + i, 1 + WING_N + i],
    ...(i > 0
      ? ([
          [i, 1 + i],
          [WING_N + i, 1 + WING_N + i],
        ] as [number, number][])
      : []),
  ]),
}
// The stave from the top of the cover: eight spokes, each forked at its end.
const STAVE_AT: [number, number] = [0, 3.75]
const STAVE: Figure = (() => {
  const stars: [number, number][] = [STAVE_AT]
  const edges: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const at = (r: number, da = 0): [number, number] => [
      STAVE_AT[0] + Math.cos(a + da) * r,
      STAVE_AT[1] + Math.sin(a + da) * r * 0.9,
    ]
    const n = stars.length
    stars.push(at(0.62), at(0.8, 0.2), at(0.8, -0.2))
    edges.push([0, n], [n, n + 1], [n, n + 2])
  }
  return { stars, edges }
})()
const FIGURES: Figure[] = [
  WING,
  { ...WING, stars: WING.stars.map(([x, y]) => [-x, y]) },
  STAVE,
]

const LINE_W = 0.022

/** Line (as quads, so they keep their width at any dpr) and star buffers; aT is when (0 to 1) each vertex joins its figure. */
function figureBuffers() {
  const lines: number[] = []
  const lineT: number[] = []
  const lineSide: number[] = []
  const index: number[] = []
  const stars: number[] = []
  const starT: number[] = []
  for (const figure of FIGURES) {
    const n = figure.edges.length
    const born = figure.stars.map(() => 1)
    figure.edges.forEach(([a, b], k) => {
      const [ax, ay] = figure.stars[a]
      const [bx, by] = figure.stars[b]
      const len = Math.hypot(bx - ax, by - ay) || 1
      const nx = (-(by - ay) / len) * LINE_W
      const ny = ((bx - ax) / len) * LINE_W
      const at = lines.length / 3
      lines.push(ax + nx, ay + ny, 0, ax - nx, ay - ny, 0)
      lines.push(bx + nx, by + ny, 0, bx - nx, by - ny, 0)
      lineT.push(k / n, k / n, (k + 1) / n, (k + 1) / n)
      lineSide.push(1, -1, 1, -1)
      index.push(at, at + 1, at + 2, at + 1, at + 3, at + 2)
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
  const quads = geometry(lines, lineT)
  quads.setAttribute('aSide', new THREE.Float32BufferAttribute(lineSide, 1))
  quads.setIndex(index)
  return { lines: quads, stars: geometry(stars, starT) }
}

const FIGURE_VERT = /* glsl */ `
attribute float aT;
attribute float aSide;
${SHARED}
varying float vT;
varying float vSide;
void main() {
  vT = aT;
  vSide = aSide;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (9.0 + 5.0 * sin(aT * 40.0)) * uScale / 1158.0;
}
`
const FIGURE_HEAD = /* glsl */ `
${SHARED}
uniform float uLevel, uProgress;
varying float vT;
varying float vSide;
${PALETTE}
`
const FIGURE_LINE = /* glsl */ `
void main() {
  float on = smoothstep(uProgress, uProgress - 0.03, vT);
  float head = exp(-max(uProgress - vT, 0.0) * 12.0);
  vec3 col = mix(MOON, mix(GOLD, uAccent, 0.4), 0.55) * (0.5 + head * 0.9);
  float core = exp(-vSide * vSide * 5.0);
  gl_FragColor = vec4(col * core * on * uLevel, 1.0);
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

/** The cover as constellations: the seeress's two wings and the stave above her, joining up. */
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
      shaderArgs(uniforms, FIGURE_VERT, FIGURE_HEAD + FIGURE_LINE, {
        side: THREE.DoubleSide,
      }),
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
    // On a phone the figures keep their shape, smaller and higher.
    if (s.tall) {
      g.scale.set(k * 0.3, k * 0.5, 1)
      g.position.y = 1.9 * k
    } else {
      g.scale.set(k * s.sx, k, 1)
      g.position.y = 0
    }
    // Both materials share the one uniforms object.
    mat.uniforms.uLevel.value = level
    mat.uniforms.uProgress.value =
      clamp(s.age.constellations / 3.2, 0, 1) * 1.05
  })

  return (
    <group ref={group} position-z={FIGURE_Z} renderOrder={7}>
      <mesh geometry={buffers.lines} frustumCulled={false}>
        <shaderMaterial ref={lineMaterial} args={lineArgs} />
      </mesh>
      <points geometry={buffers.stars} frustumCulled={false}>
        <shaderMaterial args={starArgs} />
      </points>
    </group>
  )
}
