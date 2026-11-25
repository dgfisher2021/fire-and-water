import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COVER_GRAINS, type Cover, loadCover } from './cover'
import { Layer } from './scene-layer'
import { CAM_Z, HALF_H, shown, useScene } from './scene-state'
import { PALETTE, SHARED, rng, shaderArgs } from './scene-util'
import { wingStrokes } from './wing'

const { clamp } = THREE.MathUtils

const GRAIN_VERT = /* glsl */ `
attribute vec2 aAt;
attribute vec3 aColor;
attribute vec4 aSeed;
${SHARED}
// The picture's centre and half size on the z = 0 plane.
uniform vec4 uFrame;
uniform float uForm, uOut, uLevel;
varying vec3 vColor;
varying float vA;
void main() {
  vec3 p = vec3(
    uFrame.x + (aAt.x * 2.0 - 1.0) * uFrame.z,
    uFrame.y - (aAt.y * 2.0 - 1.0) * uFrame.w,
    0.0
  );
  // Gathering: a wide slow whirl of dust closing on the picture, the bright grains first.
  float g = clamp(uForm * 1.7 - aSeed.x * 0.7, 0.0, 1.0);
  g = g * g * (3.0 - 2.0 * g);
  float loose = 1.0 - g;
  float ang = aSeed.y * 6.2832 + loose * 3.2;
  float rad = (1.5 + 7.0 * aSeed.z) * loose * loose;
  p.xy += vec2(cos(ang) * 1.4, sin(ang)) * rad;
  p.z += (aSeed.w - 0.5) * 9.0 * loose;
  // Leaving: the grains lift off and drift, the top of the picture first.
  float o = clamp(uOut * 1.6 - aAt.y * 0.4 - aSeed.x * 0.2, 0.0, 1.0);
  o *= o;
  p.y += o * (1.5 + 5.0 * aSeed.z);
  p.x += sin(o * 6.0 + aSeed.w * 40.0) * 0.5 * o - o * 2.4 * (aSeed.y - 0.2);
  p.z += o * (aSeed.w - 0.5) * 5.0;
  p.xy += vec2(sin(uTime * 1.1 + aSeed.y * 50.0), cos(uTime * 0.9 + aSeed.w * 50.0)) * 0.012 * g;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(uTime * (1.5 + aSeed.z * 4.0) + aSeed.x * 60.0);
  // The highs catch the gold.
  float glint = 1.0 + uHigh * 0.8 * step(0.75, aSeed.w) * aColor.r;
  gl_PointSize = (2.0 + 2.2 * aSeed.z * aSeed.z + loose * 3.0 * aSeed.w + o * 2.0) * uScale / 1158.0;
  vA = uLevel * tw * glint * (0.3 + 0.7 * g) * (1.0 - smoothstep(0.55, 1.0, o));
  vColor = aColor;
}
`
const GRAIN_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.2, d);
  gl_FragColor = vec4(vColor * a * vA, 1.0);
}
`

const PICTURE = /* glsl */ `
uniform sampler2D uArt;
uniform vec2 uHalf;
uniform float uForm, uOut;
void main() {
  vec2 q = vP / (2.0 * uHalf) + 0.5;
  vec3 c = texture2D(uArt, q).rgb;
  // The paper falls away; what is left is drawn as light on the dark.
  float ink = smoothstep(0.06, 0.5, 1.0 - min(c.r, min(c.g, c.b)));
  vec3 col = c * 1.25 + vec3(0.0, 0.01, 0.018);
  // It resolves grain by grain, and leaves the same way from the top down.
  float grain = hash21(floor(vP * 120.0));
  float drift = fbm(vP * 0.7 + 3.0);
  float on = smoothstep(0.0, 0.08, uForm * 1.12 - grain * 0.6 - drift * 0.4);
  float off = smoothstep(0.0, 0.08, uOut * 1.3 - grain * 0.5 - q.y * 0.6 + 0.35);
  // Its border frays into the dark rather than ending on a line.
  float fray = 0.05 + 0.09 * drift;
  float edge = smoothstep(0.0, fray, q.x) * smoothstep(1.0, 1.0 - fray, q.x)
    * smoothstep(0.0, fray, q.y) * smoothstep(1.0, 1.0 - fray * 1.6, q.y);
  gl_FragColor = vec4(col * ink * on * (1.0 - off) * edge * uLevel, 1.0);
}
`

const HALF = 3.7

/** The cover itself, light on the dark, resolving grain by grain. */
function Picture({ cover }: { cover: Cover }) {
  const size = useMemo<[number, number]>(
    () => [2 * HALF * cover.aspect, 2 * HALF],
    [cover]
  )
  const uniforms = useMemo(
    () => ({
      uArt: { value: cover.texture },
      uHalf: { value: new THREE.Vector2(HALF * cover.aspect, HALF) },
      uForm: { value: 0 },
      uOut: { value: 0 },
    }),
    [cover]
  )
  return (
    <Layer
      level={(s) => Math.min(1, s.cues.cover * 4) * (s.tall ? 0.42 : 0.72)}
      fragment={PICTURE}
      size={size}
      at={[4.5, 0]}
      tall={{ at: [0, 0.25], scale: 0.88 }}
      order={8}
      uniforms={uniforms}
      onFrame={(u, s) => {
        const age = s.calm ? 99 : s.age.cover
        u.uForm.value = clamp((age - 1.2) / 3.6, 0, 1)
        u.uOut.value = age < 2 ? 0 : 1 - s.cues.cover
      }}
    />
  )
}

/** The cover's gold as grains of light: they gather onto the picture, and lift away with it. */
function Grains({ cover }: { cover: Cover }) {
  const { ref, shared } = useScene()
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const random = rng(211)
    const seeds = new Float32Array(COVER_GRAINS * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = random()
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(COVER_GRAINS * 3), 3)
    )
    g.setAttribute('aAt', new THREE.BufferAttribute(cover.grains, 2))
    g.setAttribute('aColor', new THREE.BufferAttribute(cover.colors, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    return g
  }, [cover])
  const args = useMemo(
    () =>
      shaderArgs(
        {
          ...shared,
          uFrame: { value: new THREE.Vector4() },
          uForm: { value: 0 },
          uOut: { value: 0 },
          uLevel: { value: 0 },
        },
        GRAIN_VERT,
        GRAIN_FRAG,
        { depthTest: false }
      ),
    [shared]
  )

  useFrame(() => {
    const s = ref.current
    const p = points.current
    const mat = material.current
    if (!p || !mat) return
    const level = s.cues.cover
    p.visible = shown(s, level)
    if (!p.visible) return
    const u = mat.uniforms
    // Beside the words on a wide stage; behind them, dimmer, on a phone.
    const half = s.tall ? HALF * 0.88 : HALF
    if (s.tall) u.uFrame.value.set(0, 0.25, half * cover.aspect, half)
    else u.uFrame.value.set(4.5 * s.sx, 0, half * cover.aspect, half)
    const rising = s.age.cover < 60
    u.uForm.value = s.calm ? 1 : clamp(s.age.cover / 4.6, 0, 1)
    // Easing out, the cue's level is the leaving; easing in, the gathering covers it.
    u.uOut.value = s.calm || (rising && s.age.cover < 2) ? 0 : 1 - level
    u.uLevel.value =
      (s.tall ? 0.4 : 0.7) * Math.min(1, level * 4) * (1 + 0.12 * s.kick)
    // A phone draws fewer grains.
    geometry.setDrawRange(0, s.tall ? COVER_GRAINS * 0.6 : COVER_GRAINS)
  })

  return (
    <points
      ref={points}
      geometry={geometry}
      renderOrder={8}
      frustumCulled={false}
    >
      <shaderMaterial ref={material} args={args} />
    </points>
  )
}

const WASH = /* glsl */ `
uniform sampler2D uArt;
uniform float uAspect;
void main() {
  // The picture laid over the whole frame, drifting a little.
  float frame = uHalfW / ${HALF_H.toFixed(4)};
  vec2 uv = vP / vec2(2.0 * uHalfW, ${(2 * HALF_H).toFixed(4)});
  if (frame > uAspect) uv.y *= uAspect / frame;
  else uv.x *= frame / uAspect;
  uv = uv * 0.86 + 0.5 + vec2(sin(uTime * 0.021), cos(uTime * 0.017)) * 0.03;
  vec3 c = texture2D(uArt, uv).rgb;
  float stain = smoothstep(0.2, 0.95, 1.0 - min(c.r, min(c.g, c.b)));
  // Its stains, tinted toward the section's colour and kept dark.
  vec3 col = mix(c + 0.04, uAccent, 0.55) * stain * (0.075 + 0.03 * uMid);
  gl_FragColor = vec4(col * uLevel, 1.0);
}
`

/** The cover's watercolour splashes as a dim backdrop wash. */
function Wash({ cover }: { cover: Cover }) {
  const uniforms = useMemo(
    () => ({ uArt: { value: cover.wash }, uAspect: { value: cover.aspect } }),
    [cover]
  )
  return (
    <Layer
      level={(s) => s.cues.wash}
      fragment={WASH}
      z={-12}
      order={0}
      uniforms={uniforms}
    />
  )
}

const PERCH = /* glsl */ `
uniform sampler2D uArt;
uniform vec4 uCrop;
uniform vec2 uHalf;
float matte(vec2 q) {
  vec2 uv = vec2(mix(uCrop.x, uCrop.z, q.x), 1.0 - mix(uCrop.w, uCrop.y, q.y));
  vec3 c = texture2D(uArt, uv).rgb;
  // Only the black ink is the figure: the paper and the coloured washes fall away.
  float lum = dot(c, vec3(0.3, 0.59, 0.11));
  return smoothstep(0.075, 0.028, lum);
}
void main() {
  vec2 q = vP / (2.0 * uHalf) + 0.5;
  float m = matte(q);
  // Feathered into the scene at the sides and the top; its foot stands on the frame's edge.
  float feather = smoothstep(0.0, 0.16, q.x) * smoothstep(1.0, 0.84, q.x) * smoothstep(1.0, 0.86, q.y);
  float figure = m * feather;
  // A faint rim where the star's light catches its edge, from the upper left.
  float lit = clamp((m - matte(q + vec2(-0.012, 0.012))) * 3.0, 0.0, 1.0) * feather;
  vec3 col = INK * 0.9 * figure + mix(PALE, WARM, 0.3) * lit * 0.22;
  gl_FragColor = vec4(col * uLevel, figure * 0.97 * uLevel);
}
`

/**
 * A figure cut from the cover (the raven on its stone) as a silhouette: ink
 * black with a faint rim, standing on the bottom edge of the frame.
 */
function Perch({
  cover,
  crop,
}: {
  cover: Cover
  crop: [number, number, number, number]
}) {
  const height = 3.4
  const width =
    (height * cover.aspect * (crop[2] - crop[0])) / (crop[3] - crop[1])
  const uniforms = useMemo(
    () => ({
      uArt: { value: cover.texture },
      uCrop: { value: new THREE.Vector4(...crop) },
      uHalf: { value: new THREE.Vector2(width / 2, height / 2) },
    }),
    [cover, crop, width]
  )
  const size = useMemo<[number, number]>(() => [width, height], [width])
  return (
    <Layer
      level={(s) => s.cues.perch}
      fragment={PERCH}
      size={size}
      z={PERCH_Z}
      add={false}
      order={55}
      uniforms={uniforms}
      onFrame={(_u, s, m) => {
        // Its foot on the frame's bottom edge, lower right (lower left on a phone).
        const k = (CAM_Z - PERCH_Z) / CAM_Z
        const scale = s.tall ? 0.74 : 1
        const x = s.tall ? -s.halfW + 0.95 : s.halfW - 1.7
        m.scale.setScalar(k * scale)
        m.position.set(
          x * k,
          (-HALF_H + (height * scale) / 2 - 0.12) * k,
          PERCH_Z
        )
      }}
    />
  )
}
const PERCH_Z = 1.8

/** What the scene makes of the song's cover, once it has been read. */
export function CoverArt() {
  const { art } = useScene()
  const [cover, setCover] = useState<Cover | null>(null)
  useEffect(() => {
    if (!art) return
    let live = true
    void loadCover(art.src).then((c) => {
      if (live) setCover(c)
    })
    return () => {
      live = false
    }
  }, [art])
  if (!cover || !art) return null
  return (
    <>
      <Wash cover={cover} />
      <Picture cover={cover} />
      <Grains cover={cover} />
      {art.perch && <Perch cover={cover} crop={art.perch} />}
    </>
  )
}

const LINE_W = 0.0052
const RAD = Math.PI / 180

/** One wing's strokes as quads; each corner keeps its angle and radius, so the fan can fold. */
function wingGeometry() {
  const polar: number[] = []
  const time: number[] = []
  const side: number[] = []
  const lower: number[] = []
  const index: number[] = []
  for (const stroke of wingStrokes()) {
    const pts = stroke.points.map(([a, r]): [number, number] => [
      r * Math.cos(a * RAD),
      r * Math.sin(a * RAD),
    ])
    const low = stroke.points[stroke.points.length - 1][0] < 0 ? 1 : 0
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k]
      const [bx, by] = pts[k + 1]
      const len = Math.hypot(bx - ax, by - ay) || 1
      const nx = (-(by - ay) / len) * LINE_W
      const ny = ((bx - ax) / len) * LINE_W
      const at = polar.length / 2
      const span = stroke.to - stroke.from
      const t0 = stroke.from + (span * k) / (pts.length - 1)
      const t1 = stroke.from + (span * (k + 1)) / (pts.length - 1)
      for (const [x, y, t, sgn] of [
        [ax + nx, ay + ny, t0, 1],
        [ax - nx, ay - ny, t0, -1],
        [bx + nx, by + ny, t1, 1],
        [bx - nx, by - ny, t1, -1],
      ]) {
        polar.push(Math.atan2(y, x) / RAD, Math.hypot(x, y))
        time.push(t)
        side.push(sgn)
        lower.push(low)
      }
      index.push(at, at + 1, at + 2, at + 1, at + 3, at + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      new Float32Array((polar.length / 2) * 3),
      3
    )
  )
  g.setAttribute('aPolar', new THREE.Float32BufferAttribute(polar, 2))
  g.setAttribute('aT', new THREE.Float32BufferAttribute(time, 1))
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1))
  g.setAttribute('aLower', new THREE.Float32BufferAttribute(lower, 1))
  g.setIndex(index)
  return g
}

const WING_VERT = /* glsl */ `
attribute vec2 aPolar;
attribute float aT, aSide, aLower;
uniform float uUnfold, uMirror, uFlap;
varying float vT;
varying float vSide;
varying float vR;
void main() {
  // Folded, every feather lies along the body; unfolding fans them to their places.
  float folded = mix(86.0, -4.0, aLower);
  float ang = radians(mix(folded, aPolar.x, uUnfold) + uFlap * aPolar.y * (1.0 - 2.0 * aLower));
  vec2 p = vec2(cos(ang) * uMirror, sin(ang)) * aPolar.y;
  vT = aT;
  vSide = aSide;
  vR = aPolar.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
}
`
const WING_FRAG = /* glsl */ `
${SHARED}
uniform float uLevel, uProgress;
varying float vT;
varying float vSide;
varying float vR;
${PALETTE}
void main() {
  float on = smoothstep(uProgress, uProgress - 0.04, vT);
  float head = exp(-max(uProgress - vT, 0.0) * 9.0);
  // A glint runs out along the feathers; the voice lifts the whole wing.
  float run = fract(vR * 1.3 - uTime * 0.22);
  float glint = exp(-pow((run - 0.5) * 9.0, 2.0));
  float core = exp(-vSide * vSide * 3.5);
  vec3 col = mix(GOLD, WARM, 0.3) * (0.34 + 0.3 * uMid + 0.55 * glint + head + 0.25 * uKick);
  gl_FragColor = vec4(col * core * on * uLevel * 0.3, 1.0);
}
`
const WING_Z = -5

/** The seeress's wings, unfolding large behind the final chorus. */
export function Wings() {
  const { ref, shared } = useScene()
  const group = useRef<THREE.Group>(null)
  const left = useRef<THREE.ShaderMaterial>(null)
  const right = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => wingGeometry(), [])
  const [leftArgs, rightArgs] = useMemo(() => {
    const make = (mirror: number) =>
      shaderArgs(
        {
          ...shared,
          uLevel: { value: 0 },
          uProgress: { value: 0 },
          uUnfold: { value: 0 },
          uFlap: { value: 0 },
          uMirror: { value: mirror },
        },
        WING_VERT,
        WING_FRAG,
        { side: THREE.DoubleSide }
      )
    return [make(-1), make(1)]
  }, [shared])

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.wings
    g.visible = shown(s, level)
    if (!g.visible) return
    const k = (CAM_Z - WING_Z) / CAM_Z
    // Spread across a wide frame; standing taller and narrower on a phone.
    const span = s.tall ? 3.3 : Math.min(6.4, s.halfW * 0.78)
    g.scale.setScalar(span * k)
    // Right of the words on a wide stage, so one wing rises clear of them.
    g.position.set(
      (s.tall ? 0 : s.halfW * 0.3) * k,
      (s.tall ? 0.9 : -1.6) * k,
      WING_Z
    )
    const age = s.calm ? 99 : s.age.wings
    const unfold = clamp(age / 3.4, 0, 1)
    const eased = 1 - Math.pow(1 - unfold, 3)
    for (const mat of [left.current, right.current]) {
      if (!mat) continue
      const u = mat.uniforms
      u.uLevel.value = level * (s.tall ? 0.8 : 1)
      u.uProgress.value = clamp(age / 2.6, 0, 1) * 1.06
      u.uUnfold.value = eased
      // A slow beat of the wings, deeper with the bass.
      u.uFlap.value = s.calm
        ? 0
        : (3 + 5 * s.bass) * Math.sin(s.motion * 1.1) * eased
    }
  })

  return (
    <group ref={group} renderOrder={7}>
      <mesh geometry={geometry} frustumCulled={false} position-x={-0.05}>
        <shaderMaterial ref={left} args={leftArgs} />
      </mesh>
      <mesh geometry={geometry} frustumCulled={false} position-x={0.05}>
        <shaderMaterial ref={right} args={rightArgs} />
      </mesh>
    </group>
  )
}
