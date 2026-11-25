import { useMemo } from 'react'
import { Layer, Shade } from './scene-layer'
import { CAM_Z } from './scene-state'

const MIST = /* glsl */ `
uniform float uRise;
void main() {
  vec2 p = vP * 0.085;
  p.y += uRise * 0.012;
  float t = uTime * 0.018;
  float warp = fbm2(p * 1.6 - vec2(t, 0.0));
  float n = fbm(p + vec2(t, -t * 0.6) + warp * 0.9);
  float m = smoothstep(0.32, 0.8, n);
  vec3 col = mix(vec3(0.008, 0.055, 0.08), uAccent, 0.1) * m * 0.09;
  col += uAccent * m * m * m * 0.012;
  gl_FragColor = vec4(col * uLevel, 1.0);
}
`

/** The always-on ink mist, tinted by the section. */
export function Mist() {
  const uniforms = useMemo(() => ({ uRise: { value: 0 } }), [])
  return (
    <Layer
      level={() => 1}
      fragment={MIST}
      z={-14}
      order={0}
      uniforms={uniforms}
      onFrame={(u, s) => {
        u.uRise.value = s.rise
      }}
    />
  )
}

const MOON_FRAG = /* glsl */ `
void main() {
  float r = length(vP);
  float R = 1.75;
  float disc = smoothstep(R, R - 0.05, r);
  float limb = sqrt(max(0.0, 1.0 - r * r / (R * R)));
  float mare = fbm(vP * 0.75 + 4.0) * 0.75 + fbm(vP * 2.6 + 9.0) * 0.25;
  // Lit from the upper left, with a thin bright rim on that side.
  float lit = 0.55 + 0.45 * dot(normalize(vec3(vP / R, limb + 0.2)), vec3(-0.5, 0.5, 0.7));
  float rim = smoothstep(R - 0.22, R - 0.02, r) * smoothstep(-0.2, 0.9, dot(vP / R, vec2(-0.7, 0.7)));
  vec3 face = mix(MOON, PALE, 0.7) * ((0.3 + 0.13 * smoothstep(0.35, 0.65, mare)) * lit + rim * 0.3);
  float beyond = max(r - R, 0.0);
  float halo = exp(-beyond * 2.4) * 0.16 + exp(-beyond * 0.7) * 0.05;
  halo *= smoothstep(4.5, 2.6, r) * (1.0 + uBass * 0.25);
  vec3 col = face * disc + mix(MOON, uAccent, 0.3) * halo * (1.0 - disc * 0.7);
  gl_FragColor = vec4(col * uLevel, disc * uLevel);
}
`

/** The moon, low right (high right on a phone); it climbs into place as the cue comes up. */
export function Moon() {
  return (
    <Layer
      level={(s) => s.cues.moon}
      fragment={MOON_FRAG}
      size={[9, 9]}
      at={[5.5, -1.7]}
      tall={{ at: [1.15, 3.05], scale: 0.62 }}
      z={-8}
      add={false}
      order={2}
      onFrame={(_u, s, m) => {
        m.position.y -= (1 - s.cues.moon) * 2.6
      }}
    />
  )
}

const STORM = /* glsl */ `
uniform float uFlash;
void main() {
  vec2 p = vP;
  float t = uTime * 0.03;
  float d = fbm(p * 0.22 + vec2(t, 0.0)) * 0.65
    + fbm(p * 0.6 - vec2(t * 1.6, 3.0)) * 0.35;
  float body = smoothstep(0.1, 2.8, p.y - 0.4 - uTall * 1.3 + (d - 0.5) * 5.0);
  float slot = floor(uSong / 1.9);
  vec2 at = vec2(
    (hash11(slot + 0.3) * 1.6 - 0.6) * uHalfW * 0.8,
    2.2 + uTall * 1.1 + hash11(slot + 0.7) * 1.6
  );
  float env = uFlash + 0.06;
  float glow = exp(-length((p - at) * vec2(0.3, 0.55)) * 1.1);
  float billow = smoothstep(0.3, 0.72, fbm(p * 0.9 + vec2(t * 2.0, d * 2.0)));
  vec3 cloud = mix(INK * 1.4, vec3(0.016, 0.03, 0.044), billow * (0.4 + 0.6 * d));
  cloud += MOON * 0.03 * (1.0 - body) * body * 4.0;
  vec3 lit = mix(MOON, PALE, 0.6) * glow * env * (0.15 + 0.7 * billow + 0.5 * d * d);
  float a = body * 0.9 * uLevel;
  gl_FragColor = vec4((cloud + lit) * a, a);
}
`

/** A cloud mass across the top, lit from inside by the timeline's lightning. */
export function Storm() {
  const uniforms = useMemo(() => ({ uFlash: { value: 0 } }), [])
  return (
    <Layer
      level={(s) => s.cues.storm}
      fragment={STORM}
      size={[64, 9]}
      at={[0, 2.9]}
      windowed
      z={-5}
      add={false}
      order={3}
      uniforms={uniforms}
      onFrame={(u, s) => {
        u.uFlash.value = s.flash
      }}
    />
  )
}

const CLOCKWORK = /* glsl */ `
float ring(float r, float R, float w) {
  float x = (r - R) / w;
  return exp(-x * x);
}
void main() {
  vec2 p = vP;
  float r = length(p);
  float a = atan(p.y, p.x);
  float beat = uSong / 0.4918;
  float sum = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float R = 1.05 + fi * 0.82;
    float teeth = 12.0 + fi * 12.0;
    float every = exp2(floor(fi * 0.5));
    float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    float b = beat / every;
    float tick = floor(b) + smoothstep(0.0, 0.22, fract(b));
    float ang = a + dir * tick * 6.28318 / teeth + fi;
    float f = fract(ang / 6.28318 * teeth);
    float arc = min(min(f, 1.0 - f), abs(f - 0.5)) / teeth * 6.28318 * r;
    float mark = exp(-pow(arc / 0.013, 2.0))
      * smoothstep(R - 0.02, R, r) * smoothstep(R + 0.17, R + 0.14, r);
    float dash = ring(r, R + 0.16, 0.012) * step(f, 0.5);
    sum += (ring(r, R, 0.014) + mark * 0.9 + dash * 0.55) * (0.55 + 0.11 * fi);
  }
  float hb = (floor(beat) + smoothstep(0.0, 0.2, fract(beat))) * 6.28318 / 16.0;
  vec2 q = vec2(p.x * cos(hb) - p.y * sin(hb), p.x * sin(hb) + p.y * cos(hb));
  sum += exp(-pow(q.x / 0.014, 2.0)) * step(0.0, q.y) * smoothstep(1.87, 1.8, q.y);
  sum += ring(r, 0.13, 0.02);
  sum *= smoothstep(4.75, 4.3, r);
  vec3 col = mix(PALE, uAccent, 0.5) * sum * 0.11 * (1.0 + uKick * 0.3);
  gl_FragColor = vec4(col * uLevel, 1.0);
}
`

const CLOCK_Z = -4

/** Concentric toothed rings around the heart's place (right of the words; under them on a phone), ticking on the beat. */
export function Clockwork() {
  return (
    <Layer
      level={(s) => Math.max(s.cues.clockwork, s.cues.orb * 0.75)}
      fragment={CLOCKWORK}
      size={[9.6, 9.6]}
      z={CLOCK_Z}
      order={4}
      onFrame={(_u, s, m) => {
        // Centred on the heart, wherever the stage puts it.
        const k = (CAM_Z - CLOCK_Z) / CAM_Z
        m.position.set(s.heart[0] * k, s.heart[1] * k, CLOCK_Z)
        m.scale.setScalar(k * (s.tall ? 0.56 : 1))
      }}
    />
  )
}

const SHAFTS = /* glsl */ `
void main() {
  vec2 p = vP;
  vec2 dir = normalize(vec2(-0.42, -1.0));
  float u = p.x * dir.y - p.y * dir.x;
  float v = dot(p - vec2(uHalfW, 4.7), dir);
  float b = smoothstep(0.45, 0.8, vnoise(vec2(u * 0.55 + 3.0 + uTime * 0.012, 0.0)))
    + 0.5 * smoothstep(0.5, 0.9, vnoise(vec2(u * 1.7 - uTime * 0.02, 7.0)));
  float reach = exp(-max(v, 0.0) * 0.085);
  float dust = 0.75 + 0.25 * fbm2(p * 1.8 + vec2(0.0, uTime * 0.05));
  float side = 0.25 + 0.75 * smoothstep(-uHalfW, uHalfW * 0.6, p.x);
  vec3 col = mix(PALE, uAccent, 0.2) * b * reach * dust * side * 0.09;
  gl_FragColor = vec4(col * uLevel, 1.0);
}
`
const PILLARS = /* glsl */ `
void main() {
  vec2 p = vP;
  float a = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float side = fi < 1.5 ? -1.0 : 1.0;
    float inner = mod(fi, 2.0);
    float x = side * (uHalfW - 0.45 - inner * 2.15);
    float w = 0.62 - inner * 0.2 + smoothstep(-3.7, -4.5, p.y) * 0.16;
    float d = (p.x - x) / w;
    float m = smoothstep(1.0, 0.94, abs(d)) * (1.0 - inner * uTall);
    float flute = 0.5 + 0.5 * cos(d * 15.7);
    float lit = smoothstep(-1.0, 1.0, d);
    vec3 c = INK * (0.5 + 0.5 * flute)
      + PALE * 0.03 * lit * lit * flute * (0.4 + 0.6 * smoothstep(-5.0, 4.0, p.y));
    col = mix(col, c, m);
    a = max(a, m);
  }
  a *= uLevel;
  gl_FragColor = vec4(col * a, a);
}
`

/** Marble light: slanted pale shafts falling between dark fluted pillars. */
export function Shafts() {
  return (
    <>
      <Layer level={(s) => s.cues.shafts} fragment={SHAFTS} z={-2} order={5} />
      <Layer
        level={(s) => s.cues.shafts}
        fragment={PILLARS}
        z={1.2}
        add={false}
        order={6}
      />
    </>
  )
}

const BEAM = /* glsl */ `
void main() {
  vec2 apex = vec2(uHalfW * 0.46, 5.4);
  vec2 q = vP - apex;
  float along = -q.y;
  float across = q.x + along * 0.07;
  float reach = uLevel * 13.0;
  float x = across / (0.16 + along * 0.075);
  float dust = 0.6 + 0.4 * fbm2(vec2(across * 5.0, along * 1.4 - uTime * 0.35));
  float cone = exp(-x * x) * dust * 0.26;
  float core = exp(-pow(across / (0.035 + along * 0.008), 2.0)) * 0.55;
  float fall = smoothstep(reach, reach - 3.0, along) * (1.0 - along / 13.0 * 0.6);
  vec2 pool = (vP - vec2(apex.x - 0.68, -4.25)) / vec2(1.7, 0.2);
  float ground = exp(-dot(pool, pool)) * 0.3 * smoothstep(0.75, 1.0, uLevel);
  vec3 col = mix(PALE, vec3(1.0), 0.4) * ((cone + core) * fall + ground);
  gl_FragColor = vec4(col * smoothstep(0.0, 0.1, uLevel), 1.0);
}
`

/** One beam from above, descending to a pool of light as the cue comes up. */
export function Beam() {
  return (
    <Layer
      level={(s) => s.cues.beam}
      fragment={BEAM}
      size={[8, 14]}
      at={[3.5, 0]}
      tall={{ at: [0.6, 0] }}
      windowed
      z={-1}
      order={5}
    />
  )
}

const BRIGHT = /* glsl */ `
void main() {
  // High on the right, clear of the lyric lines.
  vec2 c = vec2(uHalfW * 0.56, 2.7 + uTall * 0.9);
  vec2 q = (vP - c) * vec2(1.0, 1.15);
  float r = length(q);
  vec2 n = q / max(r, 1e-4);
  float glow = exp(-r * 0.42) * 0.3 + exp(-r * 1.6) * 0.34;
  // Many fine rays that breathe, rather than a lens-flare star.
  float fine = vnoise(n * 7.0 + uTime * 0.1) * 0.6 + vnoise(n * 19.0 - uTime * 0.07) * 0.4;
  float rays = smoothstep(0.4, 0.8, fine) * exp(-r * 0.42) * 0.22;
  float e = uLevel * uLevel * (3.0 - 2.0 * uLevel);
  vec3 col = mix(GOLD, WARM, 0.75) * (glow + rays) + vec3(1.0) * exp(-r * 3.0) * 0.25;
  gl_FragColor = vec4(col * e * 0.8, 1.0);
}
`

/** A white-gold swell from the upper right; it never fills the frame with white. */
export function Bright() {
  return <Layer level={(s) => s.cues.bright} fragment={BRIGHT} order={5} />
}

const GHOSTS = /* glsl */ `
void main() {
  vec2 p = vP;
  float g = 0.0;
  for (int row = 0; row < 2; row++) {
    float fr = float(row);
    float sc = 0.72 + fr * 0.38;
    float y0 = -2.6 - fr * 1.5 - uTall * 0.9;
    float s = 2.5 * sc;
    float xx = p.x + uTime * (0.16 + fr * 0.1) * (fr < 0.5 ? 1.0 : -1.0) + fr * 1.3;
    float h = hash11(floor(xx / s) * 1.37 + fr * 17.0 + 5.0);
    float fx = (fract(xx / s) - 0.5) * s;
    float H = (2.3 + h * 0.7) * sc;
    float ly = (p.y - y0) / H;
    float sway = sin(uTime * 0.5 + h * 20.0 + ly * 2.5) * 0.1;
    float dx = (fx - sway * sc) / sc;
    float hy = (ly - 0.86) * H / sc;
    float head = exp(-(dx * dx + hy * hy) / 0.016);
    // A hooded veil: shoulders under the head, a hem that wavers and fades.
    float w = 0.3 * smoothstep(0.84, 0.66, ly) + 0.06
      + (1.0 - ly) * 0.07 + 0.04 * sin(ly * 9.0 + uTime * 0.8 + h * 30.0);
    float fill = smoothstep(w, w * 0.4, abs(dx));
    float hem = exp(-pow((abs(dx) - w * 0.85) / 0.06, 2.0));
    float span = smoothstep(0.84, 0.74, ly) * smoothstep(0.0, 0.5, ly);
    float wisp = 0.45 + 0.55 * fbm2(vec2(dx * 3.0 + h * 9.0, ly * 4.0 - uTime * 0.25));
    g += (head * 0.9 + (fill * 0.4 + hem * 0.55) * span * wisp)
      * step(0.2, h) * (0.55 + fr * 0.45);
  }
  gl_FragColor = vec4(mix(PALE, uAccent, 0.2) * g * 0.1 * uLevel, 1.0);
}
`

/** Two rows of pale veiled figures drifting past each other. */
export function Ghosts() {
  return (
    <Layer
      level={(s) => s.cues.ghosts}
      fragment={GHOSTS}
      size={[64, 7]}
      at={[0, -3.2]}
      windowed
      z={0.6}
      order={8}
    />
  )
}

const SEA = /* glsl */ `
uniform float uFrost;
// Distance to the nearest cell wall of a jittered grid: the ice's cracks.
float cracks(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  vec2 mg, mr;
  float md = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash21(n + g), hash21(n + g + 17.3));
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++)
  for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 o = vec2(hash21(n + g), hash21(n + g + 17.3));
    vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 1e-5)
      md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}
void main() {
  vec2 p = vP;
  float horizon = -2.2 - uTall * 0.75 - (1.0 - uLevel) * 1.7;
  float d = horizon - p.y;
  vec3 tint = mix(mix(uAccent, MOON, 0.5), vec3(0.45, 0.74, 0.95), uFrost);
  if (d < 0.0) {
    // A thin band of light resting on the horizon.
    float g = exp(d * 5.0) * 0.07 + exp(d * 26.0) * 0.12;
    gl_FragColor = vec4(tint * g * uLevel, 0.0);
    return;
  }
  // The surface as a plane running to the horizon.
  float depth = 1.0 / (d + 0.09);
  vec2 uv = vec2(p.x * depth * 0.6, depth * 2.0);
  float near = clamp(d / 2.5, 0.0, 1.0);
  float fres = pow(1.0 - near, 2.6);
  float tt = uTime * (1.0 - uFrost);

  // Water: long swells and fine chop tilt the mirror.
  float swell = fbm(uv * vec2(0.5, 1.6) + vec2(tt * 0.1, tt * 0.42));
  float chop = vnoise(uv * vec2(2.4, 9.0) - vec2(tt * 0.3, tt * 1.1));
  float tilt = (swell - 0.5) * 1.6 + (chop - 0.5) * 0.9;
  vec3 sky = mix(INK * 1.2, tint * 0.085, fres);
  // The light's reflection: a broken glitter path widening toward the viewer.
  float lx = uHalfW * 0.42;
  float across = (p.x - lx + tilt * (0.2 + d * 0.9)) / (0.22 + d * 0.75);
  float path = exp(-across * across);
  float glitter = smoothstep(0.52, 0.86, chop + tilt * 0.25) * (0.35 + 0.65 * swell);
  vec3 water = sky
    + mix(PALE, WARM, 0.25) * path * (0.05 + 0.75 * glitter) * (0.35 + 0.65 * fres) * (1.0 + uBass * 0.5)
    + tint * smoothstep(0.6, 0.85, swell) * 0.035 * (0.3 + fres);

  // Ice: a still pale sheet, veined with cracks, snow-dusted, glinting.
  vec3 ice = water;
  if (uFrost > 0.01) {
    vec2 iu = uv * vec2(0.55, 0.9) + 3.0;
    float cr = cracks(iu);
    float fine = cracks(iu * 3.1 + 9.0);
    float vein = smoothstep(0.035, 0.0, cr) + 0.35 * smoothstep(0.03, 0.0, fine);
    float milk = fbm(uv * vec2(0.4, 0.7) + 11.0);
    vec2 gc = floor(uv * vec2(7.0, 14.0));
    float gh = hash21(gc);
    float glint = step(0.93, gh) * pow(0.5 + 0.5 * sin(uTime * (1.0 + gh * 3.0) + gh * 50.0), 6.0)
      * exp(-dot(fract(uv * vec2(7.0, 14.0)) - 0.5, fract(uv * vec2(7.0, 14.0)) - 0.5) * 30.0);
    ice = mix(vec3(0.012, 0.035, 0.06), tint * 0.16, fres * (0.45 + 0.55 * milk))
      + tint * vein * (0.07 + 0.3 * fres)
      + vec3(1.0) * glint * 0.9
      + mix(PALE, vec3(1.0), 0.5) * path * 0.16 * (0.4 + 0.6 * milk);
  }

  vec3 col = mix(water, ice, uFrost);
  col += tint * exp(-d * 9.0) * 0.1;
  float a = smoothstep(0.0, 0.03, d) * uLevel;
  gl_FragColor = vec4(col * a, a);
}
`

/** The sea as a dark mirror running to the horizon; frost stills it into cracked ice. */
export function Sea() {
  const uniforms = useMemo(() => ({ uFrost: { value: 0 } }), [])
  return (
    <Layer
      level={(s) => Math.max(s.cues.tide, s.cues.frost)}
      fragment={SEA}
      size={[64, 7]}
      at={[0, -3.7]}
      windowed
      z={1.5}
      add={false}
      order={10}
      uniforms={uniforms}
      onFrame={(u, s) => {
        const { tide, frost } = s.cues
        u.uFrost.value = frost / Math.max(tide + frost, 1e-4)
      }}
    />
  )
}

const CANDLE = /* glsl */ `
void main() {
  vec2 p = vP;
  float t = uTime;
  float fl = vnoise(vec2(t * 7.0, 1.0)) * 0.6 + vnoise(vec2(t * 17.0, 5.0)) * 0.4;
  float y = p.y / (0.6 + 0.1 * fl);
  float yc = clamp(y, 0.0, 1.0);
  float x = p.x - (vnoise(vec2(t * 2.5, p.y * 2.0)) - 0.5) * 0.16 * yc;
  float w = 0.105 * sin(3.14159 * pow(yc, 0.62));
  float inside = step(0.0, y) * step(y, 1.0);
  float flame = smoothstep(w, w * 0.25, abs(x)) * inside;
  float core = smoothstep(w * 0.5, 0.0, abs(x)) * smoothstep(0.75, 0.2, y) * inside;
  vec3 col = mix(COPPER, GOLD, 0.6) * flame * 0.9 + WARM * core * 0.9;
  col += vec3(0.1, 0.25, 0.6) * flame * smoothstep(0.25, 0.0, y) * 0.5;
  float r = length((p - vec2(0.0, 0.3)) * vec2(1.0, 0.9));
  float halo = (exp(-r * 1.5) * 0.22 + exp(-r * 5.0) * 0.3) * (0.8 + 0.2 * fl)
    * smoothstep(4.0, 2.4, r);
  col += mix(COPPER, GOLD, 0.45) * halo;
  float stick = smoothstep(0.08, 0.065, abs(p.x)) * smoothstep(-0.04, -0.09, p.y)
    * exp(p.y * 1.3);
  col += WARM * stick * 0.1;
  gl_FragColor = vec4(col * uLevel, 1.0);
}
`

/** One small flame, lower right; the hush veil dims the rest. */
export function Candle() {
  return (
    <Layer
      level={(s) => s.cues.candle}
      fragment={CANDLE}
      size={[8, 8]}
      at={[5.2, -1.9]}
      tall={{ at: [1.35, -3.3], scale: 0.8 }}
      z={2}
      order={60}
    />
  )
}

const STAR = /* glsl */ `
void main() {
  vec2 j = vec2(vnoise(vec2(uTime * 9.0, 0.0)), vnoise(vec2(3.0, uTime * 9.0)));
  vec2 p = vP - (j - 0.5) * 0.045;
  float r = length(p);
  float tw = 0.44 + 0.56 * vnoise(vec2(uTime * 6.0, 9.0));
  float core = exp(-r * r * 700.0);
  float glow = exp(-r * 8.0) * 0.5 + exp(-r * 1.8) * 0.07;
  float spikes = exp(-abs(p.x) * 60.0) * exp(-abs(p.y) * 2.2)
    + exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 2.2);
  vec3 col = mix(WARM, vec3(1.0), 0.5) * (core * 1.4 + (glow + spikes * 0.45) * tw);
  gl_FragColor = vec4(col * smoothstep(3.5, 2.0, r) * uLevel, 1.0);
}
`

/** The last star, trembling where the heart was. */
export function LoneStar() {
  return (
    <Layer
      level={(s) => s.cues.star}
      fragment={STAR}
      size={[7, 7]}
      order={60}
      onFrame={(_u, s, m) => {
        m.position.set(s.heart[0], s.heart[1], 0)
      }}
    />
  )
}

/** Candle and star quiet everything under them; the fade covers all of it. */
export function Veils() {
  return (
    <>
      <Shade level={(s) => s.hush} order={50} />
      <Shade level={(s) => 1 - s.fade} order={100} />
    </>
  )
}
