import { useMemo } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { Layer } from './scene-layer'

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
        color='#bcd0e0'
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
