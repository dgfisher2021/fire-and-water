import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Layer } from './scene-layer'
import { BEAT } from './scene-state'

/*
 * Aurora: curtains of light hanging from a waving hem, the app's own aurora
 * backdrop (`components/aurora-backdrop.tsx`) as a layer of the film. It is
 * the lift of the chorus (the curtains climb as the song rises) and, paler
 * and taller, the choir: light that swells with the voice.
 */
const AURORA = /* glsl */ `
float layered(vec2 q) {
  float sum = 0.0;
  float amp = 0.55;
  for (int k = 0; k < 4; k++) {
    sum += amp * vnoise(q);
    q = q * 2.03 + 7.1;
    amp *= 0.5;
  }
  return sum;
}
uniform float uChoir;
void main() {
  // Screen-plane units to 0..1, the wide way round the shader was written.
  vec2 uv = vec2(vP.x / (2.0 * uHalfW) + 0.5, vP.y / 9.33 + 0.5);
  float aspect = uHalfW / 4.66;
  float t = uTime;

  // Folds: each column pushed sideways by slow noise that varies with height.
  float x = uv.x * aspect * 1.6;
  float fold = x + 0.9 * layered(vec2(uv.y * 0.7 + t * 0.02, x * 0.25 - t * 0.03));

  // The hem the curtains hang from: higher for the choir, lifted by the bass.
  float hem = mix(0.86, 0.97, uChoir) + 0.1 * sin(fold * 1.7 + t * 0.25)
    + 0.08 * (layered(vec2(fold * 0.6, t * 0.05)) - 0.5);
  hem += uBass * 0.05 + uKick * 0.02;

  // Rays: fine vertical streaks within each fold, shimmering slowly.
  float rays = layered(vec2(fold * 7.0, t * 0.12));
  rays = pow(clamp(rays, 0.0, 1.0), 2.6) * 1.5;

  // Bright at the hem, fading toward the floor, cut off above it.
  float reach = mix(0.42, 0.62, uChoir);
  float below = uv.y - (hem - reach);
  float body = smoothstep(0.0, reach, below) * (1.0 - smoothstep(0.0, 0.07, uv.y - hem));
  float glow = rays * body * (0.44 + uBass * 0.24 + uVocal * 0.34 * uChoir);

  // Teal at the hem falling to violet at the foot, as an aurora does.
  vec3 foot = vec3(0.16, 0.09, 0.52);
  vec3 crown = mix(vec3(0.06, 0.62, 0.52), uAccent, 0.25);
  vec3 colour = mix(foot, crown, clamp(below / reach, 0.0, 1.0));
  gl_FragColor = vec4(colour * clamp(glow, 0.0, 0.8) * uLevel, 1.0);
}
`

const UNIFORMS = { uChoir: { value: 0 } }

export function Aurora() {
  return (
    <Layer
      level={(s) => Math.max(s.cues.rise * 0.7, s.cues.choir)}
      fragment={AURORA}
      z={-4}
      order={3}
      uniforms={UNIFORMS}
      onFrame={(u, s) => {
        u.uChoir.value = s.cues.choir
      }}
    />
  )
}

/*
 * Pulse: the Shader Lines showpiece (react-ui-animation-examples) as the
 * clockwork heart. Rings of light leave the centre of the clockwork and
 * widen across the frame, one to a bar of the song, quantised into the
 * showpiece's mosaic so they step like a mechanism, their red, green and
 * blue a hair apart.
 */
const PULSE = /* glsl */ `
uniform vec2 uCentre;
uniform float uBar;
float rnd1(float x) { return fract(sin(x) * 1e4); }
void main() {
  vec2 uv = (vP - uCentre) / 4.66;
  // The mosaic: wide, short cells.
  vec2 cells = vec2(110.0, 220.0);
  uv = floor(uv * cells) / cells;
  // Each column runs a little out of step with its neighbours.
  float t = uBar + rnd1(uv.x) * 0.035;
  float r = length(uv);
  vec3 col = vec3(0.0);
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      col[j] += 0.0006 * fi * fi / abs(fract(t - 0.014 * float(j) + fi * 0.012) * 2.1 - r);
    }
  }
  // Born at the heart's rim, brightest there, gone before the frame's far edge.
  float fall = smoothstep(0.1, 0.24, r) * smoothstep(2.0, 0.3, r) * (0.6 + 0.4 * uKick);
  vec3 tint = mix(vec3(0.75, 0.88, 1.0), uAccent, 0.45);
  gl_FragColor = vec4(min(col.bgr, vec3(1.2)) * tint * fall * uLevel, 1.0);
}
`

export function Pulse() {
  const uniforms = useMemo(
    () => ({ uCentre: { value: new THREE.Vector2() }, uBar: { value: 0 } }),
    []
  )
  return (
    <Layer
      level={(s) => Math.max(s.cues.orb, s.cues.clockwork * 0.5) * 0.8}
      fragment={PULSE}
      z={-0.5}
      order={11}
      uniforms={uniforms}
      onFrame={(u, s) => {
        u.uCentre.value.set(s.heart[0], s.heart[1])
        // A ring to every bar of four beats.
        u.uBar.value = (s.calm ? 0.4 : s.song) / (BEAT * 4)
      }}
    />
  )
}

/*
 * Flow: the Shader Hero showpiece (react-ui-animation-examples). Filaments
 * of light orbit and fold through slow cloud. Here it is the wire and the
 * burning of the bridge: it sits to the right of the words, takes the
 * section's colour, and quickens with the song.
 */
const FLOW = /* glsl */ `
uniform float uFlow;
float hRnd(vec2 p) {
  p = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}
float hNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hRnd(i), hRnd(i + vec2(1, 0)), u.x), mix(hRnd(i + vec2(0, 1)), hRnd(i + 1.0), u.x), u.y);
}
float hFbm(vec2 p) {
  float t = 0.0, a = 1.0;
  mat2 m = mat2(1.0, -0.5, 0.2, 1.2);
  for (int i = 0; i < 4; i++) {
    t += a * hNoise(p);
    p *= 2.0 * m;
    a *= 0.5;
  }
  return t;
}
float hClouds(vec2 p) {
  float d = 1.0, t = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    float a = d * hFbm(i * 10.0 + p.x * 0.2 + 0.2 * (1.0 + i) * p.y + d + i * i + p);
    t = mix(t, d, a);
    d = a;
    p *= 2.0 / (i + 1.0);
  }
  return t;
}
void main() {
  float T = uFlow;
  // Centred right of the words; the showpiece's units are the short side.
  vec2 uv = (vP - vec2(uHalfW * 0.42 * (1.0 - uTall), 2.35 + 0.6 * uTall)) / 6.6;
  vec2 st = uv * vec2(2.0, 1.0);
  vec3 col = vec3(0.0);
  float bg = hClouds(vec2(st.x + T * 0.5, -st.y));
  uv *= 1.0 - 0.3 * (sin(T * 0.2) * 0.5 + 0.5);
  // The section's colour and a paler partner, in place of the showpiece's rainbow.
  vec3 pale = mix(uAccent, vec3(0.86, 0.94, 1.0), 0.6);
  for (float i = 1.0; i < 10.0; i++) {
    uv += 0.1 * cos(i * vec2(0.1 + 0.01 * i, 0.8) + i * i + T * 0.5 + 0.1 * uv.x);
    vec2 p = uv;
    float d = length(p);
    col += 0.0024 / d * mix(uAccent, pale, 0.5 + 0.5 * cos(sin(i) * 2.0));
    float b = hNoise(i + p + bg * 1.731);
    col += 0.0034 * b / length(max(p, vec2(b * p.x * 0.02, p.y))) * pale;
    col = mix(col, bg * uAccent * 0.045, min(d, 1.0));
  }
  // Falls away toward the frame's edges so it has no border.
  vec2 e = vP / vec2(uHalfW, 4.66);
  float edge = smoothstep(1.05, 0.55, abs(e.x)) * smoothstep(1.05, 0.5, abs(e.y));
  gl_FragColor = vec4(min(col, vec3(1.0)) * edge * uLevel, 1.0);
}
`

export function Flow() {
  const uniforms = useMemo(() => ({ uFlow: { value: 0 } }), [])
  const clock = useRef(0)
  return (
    <Layer
      level={(s) => s.cues.wire * 0.85}
      fragment={FLOW}
      z={-2}
      order={4}
      uniforms={uniforms}
      onFrame={(u, s) => {
        // Its own clock, quicker when the song is.
        if (!s.calm)
          clock.current += s.dt * (0.45 + 0.9 * s.energy + 0.5 * s.bass)
        u.uFlow.value = 40 + clock.current
      }}
    />
  )
}
