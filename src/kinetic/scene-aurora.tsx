import { Layer } from './scene-layer'

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
 * Strings: the WebGL Chromatic showpiece (react-ui-animation-examples). A
 * line of light on a sine wave whose red, green and blue part company toward
 * the edges of the frame. Here there are four, they are the wire, and the
 * bass plucks them.
 */
const STRINGS = /* glsl */ `
uniform float uPluck;
float string(float x, float y, float base, float phase, float scale, float amp) {
  return 0.0034 / abs(y - base - sin((x + phase) * scale) * amp);
}
void main() {
  vec2 p = vP / 4.66;
  // The colours part further from the centre, as in the showpiece.
  float d = length(p) * 0.09;
  float t = uSong * 0.55;
  float amp = 0.02 + 0.07 * uPluck;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    // Two above the words and two below, never through them.
    float base = i < 2 ? 0.86 - fi * 0.13 : -0.6 - fi * 0.13;
    float scale = 1.5 + fi * 0.7;
    float phase = t * (1.0 + fi * 0.35) + fi * 2.1;
    float a = amp * (1.0 - 0.15 * fi);
    col += vec3(
      string(p.x * (1.0 + d), p.y, base, phase, scale, a),
      string(p.x, p.y, base, phase, scale, a),
      string(p.x * (1.0 - d), p.y, base, phase, scale, a)
    );
  }
  // Cool silver with the chromatic fringe, never past white.
  col = min(col, vec3(1.0)) * mix(vec3(0.72, 0.86, 1.0), uAccent, 0.25);
  gl_FragColor = vec4(col * uLevel, 1.0);
}
`

const STRING_UNIFORMS = { uPluck: { value: 0 } }

export function Strings() {
  return (
    <Layer
      level={(s) => s.cues.wire * 0.8}
      fragment={STRINGS}
      z={-1}
      order={12}
      uniforms={STRING_UNIFORMS}
      onFrame={(u, s) => {
        // A pluck on the kick that rings out, over a steady hum from the bass.
        u.uPluck.value = s.calm ? 0.2 : 0.25 * s.bass + 0.75 * s.kick
      }}
    />
  )
}
