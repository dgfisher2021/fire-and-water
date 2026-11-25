import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GlowTrail, type GlowTrailRef } from '@dust-ui/3d'
import { shown, useScene } from './scene-state'

const THREAD = new THREE.CatmullRomCurve3(
  [
    [-10, -2.3, 0.6],
    [-5.2, -3.5, -0.8],
    [-0.6, -3.0, 0.9],
    [2.9, -0.5, -0.6],
    [4.7, 2.6, 0.8],
    [7.3, 3.6, -0.4],
    [10.2, 2.9, 0.5],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
)

/** One long silver S-curve drawing itself from lower left to upper right. */
export function Thread() {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const trail = useRef<GlowTrailRef>(null)

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.thread
    g.visible = shown(s, level)
    if (!g.visible) return
    g.scale.x = s.sx
    trail.current?.set(Math.min(level * 1.2, s.age.thread / 3.2), 0)
  })

  return (
    <group ref={group}>
      <GlowTrail
        ref={trail}
        curve={THREAD}
        progress={0}
        radius={0.016}
        tubularSegments={420}
        radialSegments={6}
        color='#8fa6b5'
        glowColor='#91bfd7'
        hotColor='#f4fbff'
        glowLength={0.22}
        intensity={2.4}
      />
    </group>
  )
}
