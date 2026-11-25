import { Suspense, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HALF_H, shown, useScene } from './scene-state'

/*
 * The sigils: the Runic Alphabet showpiece (react-ui-animation-examples,
 * GLSL after antonbobrov/threejs-runic-alphabet) inside the film's canvas.
 * A rune is a 150x150 grid of points sampling the rune's picture; they
 * gather out of a turning vortex, stand shimmering with a vapour of stray
 * points drifting through, and unwind as the next rune gathers. The song
 * clock turns the pages.
 */

const RUNES = [0, 3, 5, 8, 11, 14, 17, 20]
const URLS = RUNES.map(
  (n) => `${import.meta.env.BASE_URL}assets/kinetic/runes/${n}.png`
)
const PLANE = 550
/** Seconds a rune takes to gather first, then to stand and to turn into the next. */
const GATHER = 1.1
const STAND = 1.05
const TURN = 1.25

const SIMPLEX = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
mat3 rotation3dX(float angle) {
  float s = sin(angle); float c = cos(angle);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}
mat3 rotation3dY(float angle) {
  float s = sin(angle); float c = cos(angle);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}
`

const VERTEX = /* glsl */ `
uniform float u_time;
uniform sampler2D u_map;
uniform float u_inProgress;
uniform float u_outProgress;
uniform float u_rotationRadius;
uniform float u_PointSize;
varying float vGlobalAlpha;
varying float vRand;
varying float vPointAlpha;
float vStaticNoise;

float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float clampScoped(float value, float mn, float mx) { return clamp((value - mn) / (mx - mn), 0.0, 1.0); }

float getInProgress() {
  float yProgress = uv.y;
  float start = yProgress * 0.05;
  start += start * vRand;
  float end = clamp(yProgress, 0.0015, 1.0);
  return clampScoped(u_inProgress, start, end);
}
vec3 getRotationPosition(float progress) {
  float timeProgress = clampScoped(progress, 0.0, 0.001);
  float rotationTime = 1.0 + (u_time * timeProgress) * 0.00005;
  float distanceFactor = distance(position, vec3(0.0));
  mat3 rotationMat = rotation3dX(rotationTime * -distanceFactor) * rotation3dY(rotationTime * distanceFactor);
  vec3 additionalPosition = position * rotationMat * u_rotationRadius;
  return (additionalPosition - position) * (1.0 - progress);
}
vec3 getVaporPosition() {
  float threshold = 0.6;
  if (vRand <= threshold) return vec3(0.0);
  float direction = vRand > (1.0 - threshold / 2.0) ? 1.0 : -1.0;
  float piMultiplier = mod(1.0 + u_time * 0.0025 * pow(vRand, 2.0), 0.5);
  float progress = sin(3.1415926 * piMultiplier);
  return vec3(vStaticNoise * 500.0, 0.0, 600.0 * progress * direction);
}
void main() {
  vRand = rand(uv);
  vStaticNoise = snoise(vec3(uv * 20.0, 0.0));
  float dynamicNoise = snoise(vec3(uv * 100.0, u_time * 0.005));
  float inProgress = getInProgress();
  float mapAlpha = texture2D(u_map, uv).a;
  vPointAlpha = mapAlpha > 0.2 ? 1.0 : 0.0;
  vec3 transformed = vec3(position);
  transformed.z += vStaticNoise * 20.0 + mapAlpha * vRand * 20.0;
  transformed.xy += vStaticNoise * 5.0;
  transformed += getRotationPosition(inProgress);
  transformed += getRotationPosition(1.0 - u_outProgress);
  vGlobalAlpha = inProgress - u_outProgress;
  if (mapAlpha < 0.4) transformed += getVaporPosition();
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  gl_PointSize = u_PointSize * dynamicNoise * mapAlpha * (1.0 - vRand * 0.6);
}
`

const FRAGMENT = /* glsl */ `
uniform vec3 u_color;
uniform float u_level;
varying float vGlobalAlpha;
varying float vRand;
varying float vPointAlpha;
void main() {
  float circle = 1.0 - smoothstep(0.3, 0.5, distance(gl_PointCoord.xy, vec2(0.5)));
  // Gold, a few grains near white.
  vec3 color = mix(u_color, vec3(1.0, 0.96, 0.86), step(0.9, vRand) * 0.7) * circle;
  gl_FragColor = vec4(color, circle * vGlobalAlpha * vPointAlpha * u_level);
}
`

const scoped = (v: number, min: number, max: number) =>
  Math.min(1, Math.max(0, (v - min) / (max - min)))
const smooth = (v: number) => {
  const x = Math.min(1, Math.max(0, v))
  return x * x * (3 - 2 * x)
}

/** Where the page stands `age` seconds into the cue: gathers the first rune, then stands and turns. */
function pageAt(age: number) {
  if (age < GATHER) return -0.9 + 0.9 * smooth(age / GATHER)
  const beat = (age - GATHER) / (STAND + TURN)
  const whole = Math.floor(beat)
  const within = (beat - whole) * (STAND + TURN)
  return whole + smooth((within - STAND) / TURN)
}

function Rune({
  texture,
  index,
  page,
}: {
  texture: THREE.Texture
  index: number
  page: { current: number }
}) {
  const { ref } = useScene()
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const args = useMemo(
    () =>
      [
        {
          vertexShader: SIMPLEX + VERTEX,
          fragmentShader: FRAGMENT,
          uniforms: {
            u_time: { value: 0 },
            u_map: { value: texture },
            u_inProgress: { value: 0 },
            u_outProgress: { value: 0 },
            u_rotationRadius: { value: 5 },
            u_PointSize: { value: 20 },
            u_color: { value: new THREE.Color('#bcd9ee') },
            u_level: { value: 0 },
          },
          transparent: true,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        },
      ] satisfies [THREE.ShaderMaterialParameters],
    [texture]
  )
  const pixels = useThree((three) => three.size.height * three.viewport.dpr)

  useFrame(() => {
    const s = ref.current
    const mesh = points.current
    const u = material.current?.uniforms
    if (!mesh || !u) return
    const level = s.cues.sigils
    const count = RUNES.length
    // This rune's place on the turning page, wrapped so the runes loop.
    const local =
      ((((page.current - index + 0.9) % count) + count) % count) - 0.9
    const inP = scoped(local, -0.9, 0)
    // When the cue falls away the standing rune unwinds with it.
    const outP = Math.max(scoped(local, 0, 0.3), 1 - smooth(level / 0.55))
    mesh.visible = s.frames < 3 || (shown(s, level) && inP > 0 && outP < 1)
    if (!mesh.visible) return
    u.u_time.value = s.motion * 60
    u.u_inProgress.value = inP
    u.u_outProgress.value = outP
    u.u_level.value = Math.min(1, level * 1.4) * 0.6
    u.u_PointSize.value = 20 * (pixels / 950) * (s.tall ? 0.42 : 0.62)
    mesh.rotation.y = (1 - inP) * Math.PI * 0.5 + outP * Math.PI * -2
  })

  return (
    <points ref={points} frustumCulled={false} renderOrder={58}>
      <planeGeometry args={[PLANE, PLANE, 150, 150]} />
      <shaderMaterial ref={material} args={args} />
    </points>
  )
}

function Field() {
  const { ref } = useScene()
  const textures = useLoader(THREE.TextureLoader, URLS)
  const group = useRef<THREE.Group>(null)
  const page = useRef(-0.9)

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.sigils
    g.visible = shown(s, level)
    if (!g.visible) return
    page.current = s.calm ? 0 : pageAt(Math.max(0, s.age.sigils))
    // Large and to the right of the words; above them on a phone held upright.
    const height = s.tall ? HALF_H * 0.62 : HALF_H * 0.9
    if (s.tall) g.position.set(0, HALF_H * 0.56, -0.5)
    else g.position.set(s.halfW * 0.7, 1.35, -0.5)
    g.scale.setScalar(height / PLANE)
    const t = s.motion
    g.rotation.set(Math.sin(t * 0.21) * 0.07, Math.sin(t * 0.17) * 0.16, 0)
  }, -0.5)

  return (
    <group ref={group} visible={false}>
      {textures.map((texture, i) => (
        <Rune key={i} texture={texture} index={i} page={page} />
      ))}
    </group>
  )
}

/** The runes the moon writes: one standing at a time, turning into the next. */
export function Sigils() {
  return (
    <Suspense fallback={null}>
      <Field />
    </Suspense>
  )
}
