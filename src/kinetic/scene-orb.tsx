import { useRef, useState } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { AssistantOrb3d, type AssistantOrb3dState } from '@dust-ui/3d'
import { useScene } from './scene-state'

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

/**
 * The liquid heart: the kit's glass orb at the centre of the clockwork,
 * swelling in with its cue, beating with the bass and tinted by the section.
 */
export function Orb() {
  const { ref, accentHex } = useScene()
  const group = useRef<THREE.Group>(null)
  const [state, setState] = useState<AssistantOrb3dState>('idle')
  const mood = useRef<AssistantOrb3dState>('idle')

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.orb
    // Drawn once at the start, too small to see, so its glass compiles then.
    g.visible = level > 0.004 || s.frames < 3
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
    const swell = level * level * (3 - 2 * level)
    // At the clockwork's centre when it turns; else high on the right, clear of the words.
    const c = s.cues.clockwork
    const beat = 1.0 + 0.28 * c + 0.1 * s.sub + 0.14 * s.kick
    if (s.tall) {
      // A phone: at the clockwork's centre under the words; else above them.
      g.position.set(1.45 - 0.7 * c, 3.35 - 6.4 * c, 0.4)
      g.scale.setScalar(swell * beat * 0.62)
    } else {
      g.position.set((6.0 - 1.2 * c) * s.sx, 2.0 - 1.9 * c, 0.4)
      g.scale.setScalar(swell * beat)
    }
  })

  return (
    <group ref={group} visible={false}>
      <group position-y={LIFT}>
        <AssistantOrb3d state={state} color={accentHex} glowColor={accentHex} />
      </group>
    </group>
  )
}
