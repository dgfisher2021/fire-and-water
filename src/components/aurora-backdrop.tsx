import { useEffect, useRef } from 'react'
import { useMediaQuery } from '@dust-ui/ui'
import { useShellRoot } from '@/components/shell-context'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
/** Draw at a fraction of the screen's pixels; the curtains are soft anyway. */
const SCALE = 0.5

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

// Curtains of light hanging from a wavering top edge: value-noise folds bend
// the columns sideways, thin rays run down each fold and fade toward the
// floor. Bass lifts the brightness and the hem; the voice shifts the colour.
const FRAGMENT = `
precision mediump float;
uniform vec2 uSize;
uniform float uTime;
uniform float uBass;
uniform float uVoice;
uniform vec3 uBright;
uniform vec3 uDeep;

float hash(vec2 q) {
  return fract(sin(dot(q, vec2(41.3, 289.1))) * 43758.5453);
}
float noise(vec2 q) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  vec2 s = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), s.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), s.x),
    s.y
  );
}
float layered(vec2 q) {
  float sum = 0.0;
  float amp = 0.55;
  for (int k = 0; k < 4; k++) {
    sum += amp * noise(q);
    q = q * 2.03 + 7.1;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  float aspect = uSize.x / uSize.y;
  float t = uTime;

  // Folds: push each column sideways by slow noise that varies with height.
  float x = uv.x * aspect * 1.6;
  float fold = x + 0.9 * layered(vec2(uv.y * 0.7 + t * 0.02, x * 0.25 - t * 0.03));

  // The hem the curtains hang from, waving across the top third.
  float hem = 0.62 + 0.1 * sin(fold * 1.7 + t * 0.25) + 0.08 * (layered(vec2(fold * 0.6, t * 0.05)) - 0.5);
  hem -= uBass * 0.08;

  // Rays: fine vertical streaks within each fold, shimmering slowly.
  float rays = layered(vec2(fold * 7.0, t * 0.12));
  rays = pow(clamp(rays, 0.0, 1.0), 2.4) * 2.2;

  // Bright at the hem, fading down toward the floor, cut off above it.
  float below = uv.y - (hem - 0.55);
  float body = smoothstep(0.0, 0.55, below) * (1.0 - smoothstep(0.0, 0.06, uv.y - hem));
  float glow = rays * body * (0.55 + uBass * 0.9);

  vec3 colour = mix(uDeep, uBright, clamp(below * 1.4 + uVoice * 0.35, 0.0, 1.0));
  float a = clamp(glow, 0.0, 1.0);
  gl_FragColor = vec4(colour * a, a);
}
`

/** A CSS colour (oklch, a token, anything) as 0..1 RGB, via a 1px canvas. */
function toRgb(css: string): [number, number, number] {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const ctx = c.getContext('2d')
  if (!ctx) return [0.5, 0.5, 0.6]
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

/**
 * Aurora curtains in the song's colours, drawn by a small WebGL shader of
 * our own. It reads --pulse-bass and --pulse-vocal from the shell root each
 * frame, pauses while the page is hidden, and holds one still frame under
 * reduced motion. With no WebGL it leaves the plain background showing.
 */
export function AuroraBackdrop({ theme }: { theme: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useShellRoot()
  const still = useMediaQuery(REDUCED_MOTION)

  useEffect(() => {
    const el = canvas.current
    const gl = el?.getContext('webgl', {
      premultipliedAlpha: true,
      alpha: true,
    })
    if (!el || !gl || gl.isContextLost()) return

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )
    const p = gl.getAttribLocation(program, 'p')
    gl.enableVertexAttribArray(p)
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uSize = u('uSize')
    const uTime = u('uTime')
    const uBass = u('uBass')
    const uVoice = u('uVoice')
    const uBright = u('uBright')
    const uDeep = u('uDeep')

    // The song's voice, resolved from the tokens the track sets.
    const styles = getComputedStyle(document.documentElement)
    gl.uniform3fv(uBright, toRgb(styles.getPropertyValue('--track-bright')))
    gl.uniform3fv(uDeep, toRgb(styles.getPropertyValue('--track-deep')))

    const resize = () => {
      const w = Math.max(1, Math.round(el.clientWidth * SCALE))
      const h = Math.max(1, Math.round(el.clientHeight * SCALE))
      if (el.width !== w || el.height !== h) {
        el.width = w
        el.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uSize, w, h)
    }
    const level = (name: string) =>
      parseFloat(root?.style.getPropertyValue(name) || '0') || 0

    let frame = 0
    const start = performance.now()
    const draw = () => {
      resize()
      gl.uniform1f(uTime, still ? 12 : (performance.now() - start) / 1000)
      gl.uniform1f(uBass, level('--pulse-bass'))
      gl.uniform1f(uVoice, level('--pulse-vocal'))
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (!still && !document.hidden) frame = requestAnimationFrame(draw)
    }
    const onVisibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden) frame = requestAnimationFrame(draw)
    }
    draw()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // theme: the song changed, so its colours did.
  }, [root, still, theme])

  return (
    <div
      aria-hidden
      data-slot='aurora-backdrop'
      className='pointer-events-none absolute inset-0 z-0 overflow-hidden bg-background'
    >
      <canvas ref={canvas} className='size-full' />
    </div>
  )
}
