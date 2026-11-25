import { useMemo, useRef, useState } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { AssistantOrb3d, type AssistantOrb3dState } from '@dust-ui/3d'
import { Layer } from './scene-layer'
import { CAM_Z, useScene } from './scene-state'

/**
 * The room the glass and the metal reflect: a few soft lights drawn once
 * into a small cube map, so nothing is fetched.
 */
export function Studio() {
  return (
    <Environment resolution={128} frames={1}>
      <color attach='background' args={['#020a0f']} />
      <Lightformer
        form='rect'
        intensity={5}
        color='#fff4dc'
        position={[0, 6, 2]}
        rotation-x={Math.PI / 2}
        scale={[9, 3, 1]}
      />
      <Lightformer
        form='rect'
        intensity={2.6}
        color='#91bfd7'
        position={[-7, 1, 3]}
        rotation-y={Math.PI / 2}
        scale={[7, 2.2, 1]}
      />
      <Lightformer
        form='rect'
        intensity={3.2}
        color='#e6bc63'
        position={[7, -1, 3]}
        rotation-y={-Math.PI / 2}
        scale={[6, 1.6, 1]}
      />
      <Lightformer
        form='rect'
        intensity={1.5}
        color='#fff1d6'
        position={[0, 5, 12]}
        rotation-x={0.35}
        scale={[30, 7, 1]}
      />
      <Lightformer
        form='rect'
        intensity={0.55}
        color='#c9dbe6'
        position={[0, -4, 12]}
        scale={[30, 8, 1]}
      />
      <Lightformer
        form='ring'
        intensity={3}
        color='#ffffff'
        position={[2, 2, 8]}
        scale={2.4}
      />
      <Lightformer
        form='rect'
        intensity={0.9}
        color='#d9b98a'
        position={[0, -6, 1]}
        rotation-x={-Math.PI / 2}
        scale={[10, 3, 1]}
      />
    </Environment>
  )
}

/** The kit orb floats 0.65 above its own origin; this centres it. */
const LIFT = -0.65
/** The kit orb's radius at scale 1, and how far in front of the z = 0 plane it stands. */
const RADIUS = 0.86
const FRONT = 0.4
const NEAR = (CAM_Z - FRONT) / CAM_Z

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}
const backOut = (v: number) => {
  const x = clamp01(v) - 1
  return 1 + 2.4 * x * x * x + 1.4 * x * x
}

/**
 * The clockwork heart: the kit's glass orb, always at the centre of the
 * rings (`stage.heart`). It lights there on its word, beats a lub-dub on
 * the kick (`s.heartbeat`), is larger the more the line is about it, and
 * leaves by dimming and sinking back into the rings.
 */
export function Orb() {
  const { ref, accentHex } = useScene()
  const group = useRef<THREE.Group>(null)
  const [state, setState] = useState<AssistantOrb3dState>('idle')
  const mood = useRef<AssistantOrb3dState>('idle')
  // The strongest the cue has been since it came up: the heart's size this time.
  const peak = useRef(0)
  const onset = useRef(0)

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.orb
    // Drawn once at the start, too small to see, so its glass compiles then.
    g.visible = level > 0.004 || s.frames < 3
    if (level <= 0.004) peak.current = 0
    if (!g.visible) return
    if (level <= 0.004) {
      g.scale.setScalar(1e-4)
      return
    }
    // A busy churn in the loud sections, a slow breath in the quiet ones.
    const next: AssistantOrb3dState =
      s.energy > 0.78 ? 'thinking' : s.energy > 0.45 ? 'speaking' : 'listening'
    if (next !== mood.current) {
      mood.current = next
      setState(next)
    }
    if (s.onset.orb !== onset.current) {
      onset.current = s.onset.orb
      peak.current = 0
    }
    peak.current = Math.max(peak.current, level)
    const age = s.calm ? 99 : s.age.orb
    // Lighting up: a quick swell past its size. Leaving: smaller, lower, then gone.
    const arrive = backOut(age / 0.7)
    const held = age > 1.2 ? level / peak.current : 1
    const leave = 0.55 + 0.45 * smooth(held)
    const size = 0.52 + 0.48 * peak.current
    const beat = (0.5 + 0.5 * peak.current) * (0.06 + 0.13 * s.energy)
    const [x, y, r] = s.heart
    g.position.set(x * NEAR, (y - (1 - held) * 0.45 * r) * NEAR, FRONT)
    g.scale.setScalar(
      ((r * 0.8 * NEAR) / RADIUS) *
        size *
        arrive *
        leave *
        // Gone well before its cue is: the next picture rises into a clear frame.
        clamp01((held - 0.42) / 0.25) *
        (1 + beat * s.heartbeat + 0.025 * s.sub)
    )
  })

  return (
    <group ref={group} visible={false}>
      <group position-y={LIFT}>
        <AssistantOrb3d state={state} color={accentHex} glowColor={accentHex} />
      </group>
    </group>
  )
}

const GLOW = /* glsl */ `
uniform float uRadius;
void main() {
  float r = length(vP) / uRadius;
  float g = exp(-r * r * 0.9) * 0.5 + exp(-r * 0.9) * 0.22;
  g *= smoothstep(4.0, 2.2, r);
  gl_FragColor = vec4(mix(uAccent, WARM, 0.35) * g * uLevel, 1.0);
}
`
const GLOW_SIZE: [number, number] = [9, 9]

/** The heart's light inside the rings: a flash as it ignites, then a glow that beats with it. */
export function OrbGlow() {
  const uniforms = useMemo(() => ({ uRadius: { value: 1 } }), [])
  return (
    <Layer
      level={(s) => {
        const level = s.cues.orb
        if (level <= 0.004) return 0
        const flash = s.calm ? 0 : Math.exp(-Math.max(s.age.orb, 0) * 2.4) * 1.1
        return (
          level * level * (0.22 + 0.5 * s.heartbeat * (0.4 + 0.6 * s.energy)) +
          flash
        )
      }}
      fragment={GLOW}
      size={GLOW_SIZE}
      order={61}
      uniforms={uniforms}
      onFrame={(u, s, m) => {
        m.position.set(s.heart[0], s.heart[1], 0)
        u.uRadius.value = s.heart[2]
      }}
    />
  )
}
