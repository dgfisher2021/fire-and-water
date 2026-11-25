import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HALF_H, useScene } from './scene-state'
import { rng, shaderArgs } from './scene-util'

const COUNT = 14000
const SAMPLE_PX = 200
const PAD = 24

/**
 * `COUNT` points inside a word's letters, as x across the word and y down
 * its capitals (0 to 1). Letters are set one by one without kerning, as the
 * text layer sets a hero. Null until the face has loaded.
 */
function sampleWord(text: string) {
  const font = `900 ${SAMPLE_PX}px 'Cinzel Variable'`
  if (!document.fonts.check(font, text)) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.font = font
  const cap = ctx.measureText('H').actualBoundingBoxAscent
  const advances = [...text].map((ch) => ctx.measureText(ch).width)
  const width = advances.reduce((a, b) => a + b, 0)
  canvas.width = Math.ceil(width)
  canvas.height = Math.ceil(cap + PAD * 2)
  ctx.font = font
  ctx.fillStyle = '#fff'
  let x = 0
  ;[...text].forEach((ch, i) => {
    ctx.fillText(ch, x, PAD + cap)
    x += advances[i]
  })
  const {
    data,
    width: w,
    height: h,
  } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const random = rng(text.length * 131 + text.charCodeAt(0))
  const out = new Float32Array(COUNT * 2)
  let n = 0
  for (let tries = 0; n < COUNT && tries < COUNT * 60; tries++) {
    const px = random() * w
    const py = random() * h
    if (data[(Math.floor(py) * w + Math.floor(px)) * 4 + 3] < 128) continue
    out[n * 2] = px / width
    out[n * 2 + 1] = (py - PAD) / cap
    n++
  }
  return out
}

const VERT = /* glsl */ `
attribute vec2 aTarget;
attribute vec4 aSeed;
uniform vec4 uBox;
uniform vec4 uPose;
// The stage: its left edge, perspective and vanishing point; then its size.
uniform vec4 uStage;
uniform vec2 uSize;
uniform float uIn, uOut, uLevel, uUnit, uPx, uHalfW, uTime;
varying float vA;
varying float vHot;
void main() {
  vec3 p = vec3(uBox.x + aTarget.x * uBox.z, uBox.y + aTarget.y * uBox.w, 0.0);
  vec2 c = vec2(uBox.x + uBox.z * 0.5, uBox.y + uBox.w * 0.5);

  // Gathering is the scattering run backwards: a wide slow whirl closing in.
  float gi = clamp(uIn * 1.7 - aSeed.x * 0.7, 0.0, 1.0);
  gi = gi * gi * (3.0 - 2.0 * gi);
  float ang = aSeed.y * 6.2832 + gi * 2.6;
  float rad = (220.0 + 1100.0 * aSeed.z) * gi;
  p.xy = mix(p.xy, c + vec2(cos(ang) * 1.5, sin(ang) * 0.75) * rad, gi * gi);
  p.xy += vec2(cos(ang), sin(ang)) * rad * 0.35 * (1.0 - gi) * gi * 4.0;
  p.z += (aSeed.w - 0.5) * 1100.0 * gi;

  // Blowing away: the downwind end goes first, lifting and curling.
  float oi = clamp(uOut * 1.55 - (1.0 - aTarget.x) * 0.38 - aSeed.x * 0.17, 0.0, 1.0);
  float e = oi * oi;
  p.x += e * (520.0 + 1000.0 * aSeed.z) + sin(oi * 7.0 + aSeed.w * 40.0) * 30.0 * oi;
  p.y += -e * (120.0 + 420.0 * aSeed.w) + sin(oi * 9.0 + aSeed.y * 40.0) * 44.0 * oi;
  p.z += e * (aSeed.y - 0.5) * 800.0;

  // Formed, the grains still crawl a little.
  float still = (1.0 - gi) * (1.0 - min(oi * 4.0, 1.0));
  p.xy += vec2(sin(uTime * 1.3 + aSeed.y * 50.0), cos(uTime * 1.1 + aSeed.w * 50.0)) * 1.4 * still;

  // The line's pose and the stage's perspective, as CSS applies them.
  float a = radians(uPose.y);
  float b = radians(uPose.z);
  vec3 q = p - vec3(uStage.x, uPose.w, 0.0);
  q = vec3(q.x, q.y * cos(b) - q.z * sin(b), q.y * sin(b) + q.z * cos(b));
  q = vec3(q.x * cos(a) + q.z * sin(a), q.y, -q.x * sin(a) + q.z * cos(a));
  q += vec3(uStage.x, uPose.w + uPose.x, 0.0);
  float s = uStage.y / max(uStage.y - q.z, 200.0);
  vec2 sp = uStage.zw + (q.xy - uStage.zw) * s;
  vec2 w = (sp - uSize * 0.5) * uUnit;
  gl_Position = vec4(w.x / uHalfW, -w.y / ${HALF_H.toFixed(5)}, 0.0, 1.0);

  float loose = max(gi, min(oi * 3.0, 1.0));
  float tw = 0.7 + 0.3 * sin(uTime * (2.0 + aSeed.z * 5.0) + aSeed.x * 60.0);
  gl_PointSize = max(1.2, (2.1 + 2.6 * aSeed.z * aSeed.z + loose * 2.2 * aSeed.w) * s * uPx);
  vA = uLevel * tw * (1.0 - smoothstep(0.55, 1.0, oi)) * (1.0 - 0.72 * gi)
    * mix(0.3, 1.0, still + loose * 0.8);
  vHot = aSeed.z * aSeed.z * (0.3 + loose);
}
`
const FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vA;
varying float vHot;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.25, d);
  gl_FragColor = vec4(mix(uColor, vec3(1.0), vHot * 0.6) * a * vA, 1.0);
}
`

/**
 * The sand: grains that hold a hero word's letters, fly in to form it
 * (the scattering rewound) and blow away as dust. Placed in the text
 * stage's own space, so it lands where the DOM word would stand.
 */
export function Sand() {
  const { ref } = useScene()
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const shapes = useRef(new Map<string, Float32Array>())
  const held = useRef('')
  const geometry = useMemo(() => {
    const random = rng(97)
    const seeds = new Float32Array(COUNT * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = random()
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3)
    )
    g.setAttribute(
      'aTarget',
      new THREE.BufferAttribute(new Float32Array(COUNT * 2), 2)
    )
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    return g
  }, [])
  const args = useMemo(
    () =>
      shaderArgs(
        {
          uBox: { value: new THREE.Vector4() },
          uPose: { value: new THREE.Vector4() },
          uStage: { value: new THREE.Vector4() },
          uSize: { value: new THREE.Vector2() },
          uColor: { value: new THREE.Color() },
          uIn: { value: 0 },
          uOut: { value: 0 },
          uLevel: { value: 0 },
          uUnit: { value: 1 },
          uPx: { value: 1 },
          uHalfW: { value: 1 },
          uTime: { value: 0 },
        },
        VERT,
        FRAG,
        { depthTest: false }
      ),
    []
  )

  useFrame(() => {
    const s = ref.current
    const p = points.current
    const mat = material.current
    if (!p || !mat) return
    const word = s.sand
    p.visible = !!word?.sand && s.sandLevel > 0.004
    if (!word?.sand || !p.visible) return
    if (held.current !== word.text) {
      let shape = shapes.current.get(word.text)
      if (!shape) {
        const sampled = sampleWord(word.text)
        if (!sampled) {
          p.visible = false
          return
        }
        shapes.current.set(word.text, (shape = sampled))
      }
      const target = geometry.getAttribute('aTarget') as THREE.BufferAttribute
      ;(target.array as Float32Array).set(shape)
      target.needsUpdate = true
      held.current = word.text
    }
    const u = mat.uniforms
    u.uBox.value.fromArray(word.box)
    u.uPose.value.set(
      word.pose.y,
      word.pose.rotY,
      word.pose.rotX,
      word.pose.hinge
    )
    const stage = s.stage
    u.uStage.value.set(
      stage.x0,
      stage.perspective,
      stage.vanishX,
      stage.vanishY
    )
    u.uSize.value.set(stage.w, stage.h)
    u.uColor.value.set(word.sand.color)
    u.uIn.value = s.sandIn
    u.uOut.value = s.sandOut
    u.uLevel.value = s.sandLevel * 0.5
    u.uUnit.value = s.stageUnit
    u.uPx.value = s.stagePx
    u.uHalfW.value = s.halfW
    u.uTime.value = s.motion
  })

  return (
    <points
      ref={points}
      geometry={geometry}
      renderOrder={82}
      frustumCulled={false}
    >
      <shaderMaterial ref={material} args={args} />
    </points>
  )
}
