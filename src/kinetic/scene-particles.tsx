import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SparkField, type SparkFieldRef } from '@dust-ui/3d'
import { Layer } from './scene-layer'
import { type SceneState, shown, useScene } from './scene-state'
import { PALETTE, SHARED, rng, seededPoints, shaderArgs } from './scene-util'

type Uniforms = Record<string, THREE.IUniform>

type CloudProps = {
  geometry: THREE.BufferGeometry
  vertex: string
  fragment: string
  level: (s: SceneState) => number
  order: number
  uniforms?: Uniforms
  onFrame?: (u: Uniforms, s: SceneState) => void
}

const CLOUD_HEAD = /* glsl */ `
${SHARED}
uniform float uLevel;
varying float vA;
varying vec4 vS;
${PALETTE}
`

/** Additive point sprites animated on the GPU from a per-point seed. */
function Cloud({
  geometry,
  vertex,
  fragment,
  level,
  order,
  uniforms,
  onFrame,
}: CloudProps) {
  const { ref, shared } = useScene()
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const args = useMemo(
    () =>
      shaderArgs(
        { ...shared, uLevel: { value: 0 }, ...uniforms },
        `attribute vec4 aSeed;\n${CLOUD_HEAD}${vertex}`,
        CLOUD_HEAD + fragment
      ),
    [shared, uniforms, vertex, fragment]
  )

  useFrame(() => {
    const s = ref.current
    const p = points.current
    const mat = material.current
    if (!p || !mat) return
    const l = level(s)
    p.visible = shown(s, l)
    if (!p.visible) return
    mat.uniforms.uLevel.value = l
    onFrame?.(mat.uniforms, s)
  })

  return (
    <points
      ref={points}
      geometry={geometry}
      renderOrder={order}
      frustumCulled={false}
    >
      <shaderMaterial ref={material} args={args} />
    </points>
  )
}

const STAR_VERT = /* glsl */ `
uniform float uRise, uStreak;
varying float vStreak;
void main() {
  vec3 p = position;
  float depth = clamp(-p.z / 46.0, 0.0, 1.0);
  float par = mix(1.5, 0.3, depth);
  float h = (10.0 - p.z) * 0.52;
  p.y = mod(p.y - uRise * par + h, 2.0 * h) - h;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.72 + 0.28 * sin(uTime * (0.5 + aSeed.y * 1.6) + aSeed.y * 40.0);
  float big = aSeed.x * aSeed.x * aSeed.x * aSeed.x;
  vStreak = uStreak * par;
  float px = (1.5 + 4.5 * big) * (1.0 + (1.0 - depth) * 0.7) * (1.0 + uKick * 0.12);
  gl_PointSize = px * (1.0 + vStreak * 9.0) * uScale / 1158.0;
  vA = uLevel * twinkle * (0.3 + 0.7 * aSeed.x) / (1.0 + vStreak * 1.6);
  vS = aSeed;
}
`
const STAR_FRAG = /* glsl */ `
varying float vStreak;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  c.x *= 1.0 + vStreak * 9.0;
  float d = length(c) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  a = a * a * (1.0 + 2.0 * smoothstep(0.35, 0.0, d));
  vec3 col = mix(PALE, uAccent, 0.2 + 0.5 * vS.z);
  gl_FragColor = vec4(col * a * vA * 0.55, 1.0);
}
`

/** The always-on star field; the rise cue streaks it downward. */
export function Stars() {
  const geometry = useMemo(
    () =>
      seededPoints(4200, 11, (r, p, q) => {
        const z = -2 - r() * r() * 44 - r() * 2
        const h = (10 - z) * 0.52
        // Most stars gather along one slanted river; the rest are scattered.
        const u = r() * 2 - 1
        const river = r() < 0.62
        const v = river
          ? 0.25 - u * 0.55 + (r() + r() + r() - 1.5) * 0.3
          : r() * 2 - 1
        p[0] = u * h * 2.3
        p[1] = v * h
        p[2] = z
        q[0] = river ? r() : r() * 0.8
        q[1] = r()
        q[2] = r()
        q[3] = r()
      }),
    []
  )
  const uniforms = useMemo(
    () => ({ uRise: { value: 0 }, uStreak: { value: 0 } }),
    []
  )
  return (
    <Cloud
      geometry={geometry}
      vertex={STAR_VERT}
      fragment={STAR_FRAG}
      level={() => 1}
      order={1}
      uniforms={uniforms}
      onFrame={(u, s) => {
        u.uRise.value = s.rise
        u.uStreak.value = s.calm ? 0 : s.cues.rise * (0.45 + 0.55 * s.energy)
      }}
    />
  )
}

const DUST_VERT = /* glsl */ `
varying float vBlur;
varying float vSpark;
void main() {
  vec3 p = position;
  float t = uTime * 0.12;
  // A slow turning current, the near motes drifting faster.
  float swirl = t * (0.25 + aSeed.z * 0.5) + aSeed.y * 6.2832;
  p.x += sin(swirl) * (0.7 + aSeed.w) + sin(t * 3.0 + aSeed.x * 30.0) * 0.15;
  p.y = mod(p.y + uTime * 0.06 * (0.4 + aSeed.z) + cos(swirl) * 0.4 + 6.5, 13.0) - 6.5;
  p.z += cos(swirl * 0.7) * 0.9;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vBlur = abs(p.z - 1.0) / 8.0;
  float seen = 0.5 + 0.5 * sin(uTime * (0.3 + aSeed.z * 0.5) + aSeed.y * 60.0);
  // Now and then a mote turns its face to the light and flares.
  vSpark = pow(0.5 + 0.5 * sin(uTime * (0.9 + aSeed.x * 1.7) + aSeed.w * 90.0), 24.0)
    * step(0.55, aSeed.x) * (1.0 - smoothstep(0.1, 0.3, vBlur));
  gl_PointSize = (2.6 + aSeed.x * 4.4 + vBlur * 26.0 + vSpark * 16.0) * uScale / 1158.0
    * (1.0 + uKick * 0.1);
  vA = uLevel * (0.14 + 0.86 * seen * seen) / (1.0 + vBlur * vBlur * 18.0);
  vS = aSeed;
}
`
const DUST_FRAG = /* glsl */ `
varying float vBlur;
varying float vSpark;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float sharp = exp(-d * d * 4.0) * smoothstep(1.0, 0.7, d);
  float bokeh = smoothstep(1.0, 0.45, d) * (0.5 + 0.3 * d * d);
  float a = mix(sharp * 1.6, bokeh, smoothstep(0.08, 0.3, vBlur));
  // The flare: a small four-point star.
  float star = (exp(-abs(c.x) * 46.0) + exp(-abs(c.y) * 46.0)) * smoothstep(1.0, 0.1, d);
  vec3 col = mix(GOLD, WARM, 0.2 + vS.w * 0.5);
  gl_FragColor = vec4(col * a * vA + mix(WARM, vec3(1.0), 0.5) * star * vSpark * uLevel * 1.4, 1.0);
}
`

/** Slow gold motes in depth; near ones flare, far ones open into soft discs. */
export function GoldDust() {
  const geometry = useMemo(
    () =>
      seededPoints(1500, 23, (r, p, q) => {
        p[0] = (r() * 2 - 1) * 13
        p[1] = (r() * 2 - 1) * 6.5
        p[2] = -9 + r() * 15
        q[0] = r()
        q[1] = r()
        q[2] = r()
        q[3] = r()
      }),
    []
  )
  return (
    <Cloud
      geometry={geometry}
      vertex={DUST_VERT}
      fragment={DUST_FRAG}
      level={(s) => s.cues.golddust}
      order={9}
    />
  )
}

const PULSE_VERT = /* glsl */ `
void main() {
  // Charges running along the wires, each at its own speed and direction.
  float dir = aSeed.x < 0.5 ? 1.0 : -1.0;
  float run = fract(aSeed.y + dir * uSong * (0.16 + 0.22 * aSeed.z));
  vec3 p = vec3((run * 2.0 - 1.0) * uHalfW * 1.05, position.y, position.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (46.0 + 50.0 * aSeed.w) * uScale / 1158.0 * (0.8 + 0.5 * uBass);
  vA = uLevel * (0.45 + 0.55 * uBass + 0.5 * uKick) * smoothstep(0.0, 0.05, run) * smoothstep(1.0, 0.95, run);
  vS = vec4(dir, aSeed.yzw);
}
`
const PULSE_FRAG = /* glsl */ `
void main() {
  vec2 c = gl_PointCoord - 0.5;
  // A hot head with a tail behind it.
  float along = c.x * vS.x;
  float tail = smoothstep(-0.5, 0.25, along) * smoothstep(0.34, 0.22, along);
  float a = exp(-c.y * c.y * 2200.0) * tail * tail
    + exp(-dot(c - vec2(0.24 * vS.x, 0.0), c - vec2(0.24 * vS.x, 0.0)) * 420.0) * 1.6;
  gl_FragColor = vec4(mix(uAccent, vec3(1.0, 0.96, 0.84), 0.6) * a * vA, 1.0);
}
`

/** Pulses travelling the wires (`WIRE_LINES` in scene-lines gives their places). */
export function WirePulses({ lines }: { lines: [number, number][] }) {
  const geometry = useMemo(
    () =>
      seededPoints(lines.length * 5, 71, (r, p, q) => {
        const [y, z] = lines[Math.floor(r() * lines.length) % lines.length]
        p[0] = 0
        p[1] = y
        p[2] = z
        q[0] = r()
        q[1] = r()
        q[2] = r()
        q[3] = r()
      }),
    [lines]
  )
  return (
    <Cloud
      geometry={geometry}
      vertex={PULSE_VERT}
      fragment={PULSE_FRAG}
      level={(s) => s.cues.wire}
      order={11}
    />
  )
}

const EMBER_VERT = /* glsl */ `
void main() {
  float life = fract(aSeed.x + uTime * (0.07 + aSeed.y * 0.1));
  float sway = sin(life * 7.0 + aSeed.w * 30.0 + uTime * 0.8);
  vec3 p = vec3(
    (aSeed.z * 2.0 - 1.0) * uHalfW * 1.15 + sway * 0.55 * life,
    -5.4 + life * (6.5 + aSeed.y * 5.5),
    (aSeed.w - 0.5) * 9.0
  );
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (5.0 + 15.0 * aSeed.y * aSeed.y) * (1.0 - life * 0.55)
    * uScale / 1158.0 * (1.0 + uKick * 0.2);
  float flicker = 0.7 + 0.3 * sin(uTime * (6.0 + aSeed.w * 9.0) + aSeed.x * 50.0);
  vA = uLevel * smoothstep(0.0, 0.06, life) * pow(1.0 - life, 1.4) * flicker;
  vS = vec4(life, aSeed.yzw);
}
`
const EMBER_FRAG = /* glsl */ `
void main() {
  // Slightly taller than wide: a spark with a little upward smear.
  vec2 c = (gl_PointCoord - 0.5) * vec2(3.2, 2.0);
  float d = length(c);
  float a = exp(-d * d * 5.0) * smoothstep(1.0, 0.6, d);
  vec3 col = mix(mix(WARM, GOLD, 0.5), COPPER, smoothstep(0.0, 0.7, vS.x));
  gl_FragColor = vec4(col * a * vA * 1.8, 1.0);
}
`
const FIRE_GLOW = /* glsl */ `
void main() {
  float h = vP.y + 4.7;
  // Tall narrow tongues: the noise is stretched upward and scrolls up.
  float lick = fbm(vec2(vP.x * 1.7, vP.y * 0.45 - uTime * 0.8));
  float tongue = smoothstep(0.0, 1.0, lick * 2.3 - 0.25 - h * 0.75);
  float haze = exp(-max(h, 0.0) * 0.7) * smoothstep(4.0, 1.5, h);
  vec3 ember = vec3(0.55, 0.09, 0.02);
  vec3 col = mix(ember, mix(COPPER, GOLD, 0.45), tongue * tongue)
    * (tongue * 0.34 + haze * 0.1) * (0.8 + 0.4 * uBass);
  gl_FragColor = vec4(col * uLevel, 1.0);
}
`

/** Embers streaming up from a glow under the frame. */
export function Embers() {
  const geometry = useMemo(
    () =>
      seededPoints(1400, 37, (r, p, q) => {
        p[0] = p[1] = p[2] = 0
        q[0] = r()
        q[1] = r()
        q[2] = r()
        q[3] = r()
      }),
    []
  )
  return (
    <>
      <Layer
        level={(s) => s.cues.fire}
        fragment={FIRE_GLOW}
        size={[64, 7]}
        at={[0, -3.6]}
        windowed
        z={1}
        order={9}
      />
      <Cloud
        geometry={geometry}
        vertex={EMBER_VERT}
        fragment={EMBER_FRAG}
        level={(s) => s.cues.fire}
        order={9}
      />
    </>
  )
}

const RAIN_COUNT = 1100
const RAIN_VERT = /* glsl */ `
attribute vec4 aSeed;
${SHARED}
varying vec2 vUv;
varying float vA;
void main() {
  float fall = uTime * (9.0 + aSeed.w * 5.0);
  float y = mod(aSeed.y - fall + 7.0, 14.0) - 7.0;
  float len = 0.35 + aSeed.w * 0.5;
  vec3 p = vec3(aSeed.x * uHalfW * 1.5 + y * 0.14, y, aSeed.z);
  p.x += position.x * 0.016 + position.y * len * 0.14;
  p.y += position.y * len;
  vUv = uv;
  vA = 0.4 + 0.6 * aSeed.w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`
const RAIN_FRAG = /* glsl */ `
uniform float uLevel;
uniform vec3 uAccent;
varying vec2 vUv;
varying float vA;
${PALETTE}
void main() {
  float a = sin(vUv.y * 3.14159) * (1.0 - abs(vUv.x - 0.5) * 2.0);
  gl_FragColor = vec4(mix(PALE, uAccent, 0.25) * a * vA * uLevel * 0.24, 1.0);
}
`

/** Fine slanted rain: one instanced quad per streak. */
export function Rain() {
  const { ref, shared } = useScene()
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const random = rng(51)
    const seeds = new Float32Array(RAIN_COUNT * 4)
    for (let i = 0; i < RAIN_COUNT; i++) {
      seeds[i * 4] = random() * 2 - 1
      seeds[i * 4 + 1] = random() * 14
      seeds[i * 4 + 2] = -9 + random() * 13
      seeds[i * 4 + 3] = random()
    }
    const plane = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    g.setAttribute('uv', plane.getAttribute('uv'))
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    g.instanceCount = RAIN_COUNT
    return g
  }, [])
  const args = useMemo(
    () => shaderArgs({ ...shared, uLevel: { value: 0 } }, RAIN_VERT, RAIN_FRAG),
    [shared]
  )

  useFrame(() => {
    const s = ref.current
    const m = mesh.current
    const mat = material.current
    if (!m || !mat) return
    m.visible = shown(s, s.cues.rain)
    mat.uniforms.uLevel.value = s.cues.rain
  })

  return (
    <mesh ref={mesh} geometry={geometry} renderOrder={9} frustumCulled={false}>
      <shaderMaterial ref={material} args={args} />
    </mesh>
  )
}

const FLARE = /* glsl */ `
void main() {
  float r = length(vP);
  float g = exp(-r * 3.6) * 0.2 + exp(-r * r * 46.0) * 0.5;
  g *= smoothstep(1.5, 0.9, r);
  gl_FragColor = vec4(mix(uAccent, WARM, 0.3) * g * uLevel, 1.0);
}
`
const FLARE_SIZE: [number, number] = [3, 3]
const RAY = new THREE.Vector3()
const SPRAY = new THREE.Vector3()

/** Sparks and a short flare where a hero word lands. */
export function HeroBursts() {
  const { ref, accentHex } = useScene()
  const sparks = useRef<SparkFieldRef>(null)
  const last = useRef(-1)

  useFrame(({ camera }) => {
    const s = ref.current
    s.flare *= Math.exp(-s.dt * 3.5)
    const count = s.heroCount
    if (last.current >= 0 && count > last.current && !s.calm) {
      RAY.set(s.heroAt[0], s.heroAt[1], 0.5).unproject(camera)
      RAY.sub(camera.position).normalize()
      s.heroPos.copy(camera.position).addScaledVector(RAY, 6 / -RAY.z)
      // A spray along the word rather than one clump at its middle.
      for (let k = -2; k <= 2; k++) {
        SPRAY.copy(s.heroPos)
        SPRAY.x += k * 0.55 * s.sx
        sparks.current?.emit(SPRAY, {
          count: 16,
          speed: 2.1 + Math.abs(k) * 0.35,
          up: 1.15,
          spread: 1.7,
        })
      }
      if (s.flare < 0.35) s.flare = 1
    }
    last.current = count
  })

  return (
    <group renderOrder={70}>
      <SparkField
        ref={sparks}
        count={520}
        glow
        color='#fff6dc'
        endColor={accentHex}
        size={0.03}
        gravity={2.2}
        life={[0.45, 1.5]}
      />
      <Layer
        level={(s) => s.flare}
        fragment={FLARE}
        size={FLARE_SIZE}
        order={70}
        onFrame={(_u, s, m) => {
          m.position.copy(s.heroPos)
          m.scale.setScalar(1)
        }}
      />
    </group>
  )
}
