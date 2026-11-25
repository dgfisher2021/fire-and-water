import { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { shown, useScene } from './scene-state'
import { rng } from './scene-util'
import type { Cue } from './types'

/** The parts of drei's fat line this file drives. */
type FatLine = THREE.Object3D & {
  material: THREE.Material & { linewidth: number; dashOffset: number }
}

/*
 * The comets of the Sparks showpiece (react-ui-animation-examples): fat
 * lines on long looping curves, almost all gap, so one bright dash races
 * along each. Here the song clock moves the dashes and the bass widens them.
 */

type Comet = {
  curve: THREE.Vector3[]
  length: number
  width: number
  speed: number
  tint: number
}

/** The showpiece's wandering loops: thirty steps round a circle of uneven radius. */
function comets(count: number, radius: number, seed: number): Comet[] {
  const random = rng(seed)
  const r = () => Math.max(0.2, random())
  const paths = Array.from({ length: count }, () => {
    const pos = new THREE.Vector3(0, r(), 0)
    return Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2
      return pos
        .add(
          new THREE.Vector3(
            Math.sin(angle) * r(),
            Math.cos(angle) * r(),
            (random() - 0.5) * 0.6
          )
        )
        .clone()
    })
  })
  // The loops wander well past a frame: centre the flight and fit it to `radius`.
  const box = new THREE.Box3().setFromPoints(paths.flat())
  const centre = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const fit = (2 * radius) / Math.max(size.x, size.y)
  return paths.map((points, index) => {
    for (const p of points) p.sub(centre).multiplyScalar(fit)
    const curve = new THREE.CatmullRomCurve3(points)
    return {
      curve: curve.getPoints(600),
      length: curve.getLength(),
      width: 0.9 + (1.7 * index) / count,
      speed: 0.35 + 0.9 * random(),
      tint: random(),
    }
  })
}

function Streak({
  comet,
  cue,
  colors,
  pace,
}: {
  comet: Comet
  cue: Cue
  colors: readonly string[]
  pace: number
}) {
  const { ref } = useScene()
  const line = useRef<FatLine | null>(null)
  // One dash to a stretch of curve: a head with a short tail of light.
  const stretch = comet.length / 1.4
  const color = colors[Math.floor(comet.tint * colors.length) % colors.length]

  useFrame(() => {
    const s = ref.current
    const mesh = line.current
    if (!mesh) return
    const level = s.cues[cue]
    mesh.visible = shown(s, level)
    if (!mesh.visible) return
    const material = mesh.material
    material.opacity = Math.min(1, level * 1.25)
    material.linewidth =
      comet.width * s.stagePx * (0.8 + 0.5 * s.bass + 0.35 * s.kick)
    material.dashOffset = -(s.calm ? 3 : s.song) * comet.speed * pace * 7
  })

  return (
    <Line
      ref={(instance) => {
        line.current = instance as unknown as FatLine | null
      }}
      points={comet.curve}
      color={color}
      lineWidth={comet.width}
      dashed
      dashSize={stretch * 0.2}
      gapSize={stretch * 0.8}
      transparent
      depthTest={false}
      depthWrite={false}
      toneMapped={false}
      renderOrder={57}
    />
  )
}

/**
 * A flight of comets for a cue. `spread` is the loops' radius, `at` and
 * `turn` place and tilt the flight, `pace` scales how fast the dashes run.
 */
export function Comets({
  cue,
  count,
  colors,
  seed,
  spread = 2.3,
  at = [0, 0, -1.5],
  turn = 0,
  pace = 1,
}: {
  cue: Cue
  count: number
  colors: readonly string[]
  seed: number
  spread?: number
  at?: [number, number, number]
  turn?: number
  pace?: number
}) {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const flight = useMemo(
    () => comets(count, spread, seed),
    [count, spread, seed]
  )

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    g.visible = shown(s, s.cues[cue])
    if (!g.visible) return
    // The whole flight leans slowly, as the showpiece leans to the pointer.
    const t = s.motion
    g.rotation.set(
      Math.sin(t * 0.13 + seed) * 0.12,
      Math.sin(t * 0.09 + seed * 2) * 0.2,
      turn
    )
    g.scale.set(s.sx, 1, 1)
  })

  return (
    <group ref={group} position={at} visible={false}>
      <group>
        {flight.map((comet, i) => (
          <Streak key={i} comet={comet} cue={cue} colors={colors} pace={pace} />
        ))}
      </group>
    </group>
  )
}
